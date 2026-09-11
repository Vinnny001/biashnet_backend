import { ROLES } from "../config/constants.js";
import { auth, db } from "../config/firebase.js"; // make sure config/firebase.js exports `db` (getFirestore())
import { signToken } from "../utils/jwt.js";
import { badRequest, forbidden, unauthorized } from "../utils/errors.js";
import { normalizeSignupRole } from "../utils/validators.js";
import { generateOtp, hashOtp, OTP_TTL_MS, OTP_MAX_ATTEMPTS } from "../utils/otp.js";
import { sendOtpEmail, sendPasswordResetEmail } from "../utils/mailer.js";
import { userService } from "./userService.js";
import { FINANCE_COLLECTIONS, EMPLOYMENT_STATUS } from "../config/financeCollections.js";

/*
 * Account types that don't require OTP at login. These are also the only
 * ones switchAccount() will switch into on an existing session — the two
 * MUST stay the same list, or switching would become a way to get a
 * privileged token without the OTP step that login enforces.
 */
const SWITCHABLE_ACCOUNT_TYPES = ["buyer", "seller"];

function getUserRoles(profile) {
  if (!profile?.roles) return [];
  return Object.entries(profile.roles)
    .filter(([, active]) => active === true)
    .map(([role]) => role);
}

function publicUser(profile, fallback = {}, activeRole) {
  const accountTypes = getUserRoles(profile);
  const role = activeRole || accountTypes[0] || fallback.role || ROLES.BUYER;
  return {
    id: profile?.userId || fallback.uid,
    uid: profile?.userId || fallback.uid,
    name: profile?.name || fallback.displayName || "",
    displayName: profile?.displayName || profile?.name || fallback.displayName || "",
    email: profile?.email || fallback.email,
    phone: profile?.phone || "",
    location: profile?.location || "",
    userType: profile?.userType || null, // "individual" | "business"
    role,
    accountTypes,
    isAdmin: false,
    isSeller: accountTypes.includes(ROLES.SELLER),
    isInvestor: accountTypes.includes(ROLES.INVESTOR)
  };
}

async function signInWithPassword(email, password) {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    throw badRequest(
      "FIREBASE_WEB_API_KEY is required for backend email/password login without Firebase client SDK."
    );
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw unauthorized(payload.error?.message || "Invalid email or password.");
  }

  return payload;
}

// Resolves a single email into its users/admins/investors records.
// admins/investors are keyed by the same userId as the users doc when the
// account originated as a regular user; falls back to an email lookup on
// admins/investors directly for standalone accounts (e.g. a seeded superadmin
// with no buyer/seller profile).
async function resolveIdentity(email) {
  const lower = email.toLowerCase();
  const userSnap = await db.collection("users").where("email", "==", lower).limit(1).get();

  if (!userSnap.empty) {
    const profile = userSnap.docs[0].data();
    const userId = profile.userId || userSnap.docs[0].id;
    const [adminDoc, investorDoc, employeeDoc] = await Promise.all([
      db.collection("admins").doc(userId).get(),
      db.collection("investors").doc(userId).get(),
      db.collection(FINANCE_COLLECTIONS.EMPLOYEES).doc(userId).get()
    ]);
    return {
      userId,
      profile,
      admin: adminDoc.exists ? adminDoc.data() : null,
      investor: investorDoc.exists ? investorDoc.data() : null,
      employee: employeeDoc.exists ? { id: employeeDoc.id, ...employeeDoc.data() } : null
    };
  }

  const [adminSnap, investorSnap] = await Promise.all([
    db.collection("admins").where("email", "==", lower).limit(1).get(),
    db.collection("investors").where("email", "==", lower).limit(1).get()
  ]);

  const admin = adminSnap.empty ? null : adminSnap.docs[0].data();
  const investor = investorSnap.empty ? null : investorSnap.docs[0].data();
  const standaloneUserId = admin?.userId || investor?.userId || null;

  const employeeDoc = standaloneUserId
    ? await db.collection(FINANCE_COLLECTIONS.EMPLOYEES).doc(standaloneUserId).get()
    : null;

  return {
    userId: standaloneUserId,
    profile: null,
    admin,
    investor,
    employee: employeeDoc?.exists ? { id: employeeDoc.id, ...employeeDoc.data() } : null
  };
}

function accountTypesFromIdentity(identity) {
  const types = [...getUserRoles(identity.profile)];
  if (identity.admin?.status === "active") types.push("admin");
  if (identity.investor?.status === "active") types.push("investor");
  if (identity.employee?.employmentStatus === EMPLOYMENT_STATUS.ACTIVE) types.push("employee");
  return types;
}

async function getAccountTypesForEmail(email) {
  const identity = await resolveIdentity(email);
  return accountTypesFromIdentity(identity);
}

/*
 * Every branch returns accountTypes — the account switcher in the UI
 * needs the full list of accounts this person owns regardless of which
 * one they're currently signed into, and publicUser()'s own list only
 * covers buyer/seller (it reads users/{uid}.roles).
 */
async function buildSessionUser(email, accountType, authUser) {
  const identity = await resolveIdentity(email);
  const accountTypes = accountTypesFromIdentity(identity);

  if (accountType === "admin") {
    return {
      uid: authUser.uid,
      email: authUser.email,
      name: identity.admin?.name || authUser.displayName || "",
      role: "admin",
      permissions: identity.admin?.permissions || {},
      accountTypes,
      isAdmin: true
    };
  }

  if (accountType === "investor") {
    return {
      uid: authUser.uid,
      email: authUser.email,
      name: identity.investor?.name || authUser.displayName || "",
      role: "investor",
      totalInvested: identity.investor?.totalInvested || 0,
      contributionsCount: identity.investor?.contributionsCount || 0,
      accountTypes,
      isAdmin: false
    };
  }

  if (accountType === "employee") {
    return {
      uid: authUser.uid,
      email: authUser.email,
      name: identity.profile?.name || authUser.displayName || "",
      role: "employee",
      employeeRoles: identity.employee?.roles || {},
      accountTypes,
      isAdmin: false
    };
  }

  return {
    ...publicUser(identity.profile, authUser, accountType),
    accountTypes
  };
}

export const authService = {
  async signup(data) {
    const role = normalizeSignupRole(data.role);
    const name = data.userType === "business"
      ? data.businessName
      : `${data.firstName ?? ""} ${data.surname ?? ""}`.trim();
    const authUser = await auth.createUser({
      email: data.email,
      password: data.password,
      displayName: name,
      disabled: false
    });

    // everyone is at least a buyer; their selected role is layered on top
    const roles = { [ROLES.BUYER]: true, ...(role !== ROLES.BUYER ? { [role]: true } : {}) };
    await auth.setCustomUserClaims(authUser.uid, { roles });

    const profile = await userService.createProfile(authUser.uid, {
      ...data,
      roles,
      email: authUser.email
    });
    const token = signToken({ uid: authUser.uid, role });

    return { token, user: publicUser(profile, authUser, role) };
  },

  // kept for now in case anything still calls single-step login —
  // consider removing once the new flow is wired up everywhere
  async login({ email, password }) {
    const firebaseSession = await signInWithPassword(email, password);
    const authUser = await auth.getUser(firebaseSession.localId);
    if (authUser.disabled) throw unauthorized("This account has been disabled.");

    const profile = await userService.findById(authUser.uid);
    const token = signToken({ uid: authUser.uid });
    return { token, user: publicUser(profile, authUser) };
  },

  async checkEmail(email) {
    const accountTypes = await getAccountTypesForEmail(email);
    return { exists: accountTypes.length > 0, accountTypes };
  },

  async loginInitiate({ email, password, accountType }) {
  const firebaseSession = await signInWithPassword(email, password);
  const authUser = await auth.getUser(firebaseSession.localId);
  if (authUser.disabled) throw unauthorized("This account has been disabled.");

  const accountTypes = await getAccountTypesForEmail(email);
  if (!accountTypes.includes(accountType)) {
    throw badRequest("Selected account type is not available on this account.");
  }

  // Buyers/sellers skip OTP entirely — log them straight in
  if (SWITCHABLE_ACCOUNT_TYPES.includes(accountType)) {
    const user = await buildSessionUser(email, accountType, authUser);
    const token = signToken({ uid: authUser.uid, role: accountType });
    return { skipOtp: true, token, user };
  }

  const code = generateOtp();
  await db.collection("loginOtps").doc(email.toLowerCase()).set({
    uid: authUser.uid,
    accountType,
    codeHash: hashOtp(code),
    attempts: 0,
    expiresAt: Date.now() + OTP_TTL_MS,
    createdAt: Date.now()
  });

  await sendOtpEmail(authUser.email, code);

  return { skipOtp: false, message: "We sent a verification code to your email." };
},

  async loginVerifyOtp({ email, code }) {
    const ref = db.collection("loginOtps").doc(email.toLowerCase());
    const snap = await ref.get();
    if (!snap.exists) {
      throw badRequest("No pending verification for this email. Please log in again.");
    }

    const record = snap.data();

    if (Date.now() > record.expiresAt) {
      await ref.delete();
      throw badRequest("This code has expired. Please log in again.");
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await ref.delete();
      throw badRequest("Too many incorrect attempts. Please log in again.");
    }
    if (hashOtp(code) !== record.codeHash) {
      await ref.update({ attempts: record.attempts + 1 });
      throw unauthorized("Incorrect code.");
    }

    await ref.delete();

    const authUser = await auth.getUser(record.uid);
    const user = await buildSessionUser(email, record.accountType, authUser);
    const token = signToken({ uid: record.uid, role: record.accountType });

    return { token, user };
  },

  /*
   * Switch the active account on an already-authenticated session.
   *
   * Only buyer/seller can be switched into directly, because those are
   * exactly the account types loginInitiate lets through without OTP —
   * so switching to them grants nothing a fresh login wouldn't. Admin,
   * investor and employee (work) accounts all require OTP at login, so
   * allowing a switch into them here would hand out a privileged token
   * while skipping that second factor entirely.
   */
  async switchAccount({ uid, accountType }) {
    const authUser = await auth.getUser(uid);
    if (authUser.disabled) throw forbidden("This account has been disabled.");

    if (!SWITCHABLE_ACCOUNT_TYPES.includes(accountType)) {
      throw badRequest(
        "For security, switching into that account requires signing in again."
      );
    }

    const accountTypes = await getAccountTypesForEmail(authUser.email);
    if (!accountTypes.includes(accountType)) {
      throw badRequest("That account type is not available on this account.");
    }

    const user = await buildSessionUser(authUser.email, accountType, authUser);
    const token = signToken({ uid, role: accountType });

    return { token, user };
  },

  /*
   * Session rehydration on page load. Must return the SAME shape a fresh
   * login did, or a refresh silently downgrades the session: publicUser()
   * alone only knows buyer/seller, so an admin/investor/employee would
   * lose those from accountTypes (breaking the account switcher) and,
   * without activeRole, get bounced back to whichever role happens to be
   * first on their profile.
   */
  async me(uid, activeRole) {
    const authUser = await auth.getUser(uid);

    if (activeRole && authUser.email) {
      return buildSessionUser(authUser.email, activeRole, authUser);
    }

    const profile = await userService.findById(uid);
    return publicUser(profile, authUser, activeRole);
  },

  async forgotPassword(email) {
    /*
     * Never return the reset link in the API response, and never let the
     * response shape reveal whether the account exists — both were live
     * account-takeover / enumeration vectors. The link is emailed instead,
     * and any failure (including "no user with that email") is swallowed
     * behind the same generic response.
     */
    try {
      const link = await auth.generatePasswordResetLink(email);
      await sendPasswordResetEmail(email, link);
    } catch (error) {
      console.error("forgotPassword: failed to generate/send reset link:", error?.message || error);
    }

    return {
      message: "If an account exists for that email, a password reset link has been sent."
    };
  },

  async resetPassword() {
    throw badRequest(
      "Password reset tokens from email links must be completed with Firebase Auth action links or a custom reset flow."
    );
  }
};