import { ROLES } from "../config/constants.js";
import { auth } from "../config/firebase.js";
import { signToken } from "../utils/jwt.js";
import { badRequest, unauthorized } from "../utils/errors.js";
import { normalizeSignupRole } from "../utils/validators.js";
import { userService } from "./userService.js";

function publicUser(profile, fallback = {}) {
  const role = profile?.role || fallback.role || ROLES.BUYER;
  return {
    id: profile?.id || profile?.uid || fallback.uid,
    uid: profile?.uid || fallback.uid,
    name: profile?.name || fallback.displayName || "",
    displayName: profile?.displayName || profile?.name || fallback.displayName || "",
    email: profile?.email || fallback.email,
    phone: profile?.phone || "",
    location: profile?.location || "",
    role,
    isAdmin: role === ROLES.ADMIN,
    isSeller: role === ROLES.SELLER
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

export const authService = {
  async signup(data) {
    const role = normalizeSignupRole(data.role);
    const authUser = await auth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.name,
      disabled: false
    });

    await auth.setCustomUserClaims(authUser.uid, { role });
    const profile = await userService.createProfile(authUser.uid, {
      ...data,
      role,
      email: authUser.email
    });
    const token = signToken({ uid: authUser.uid });

    return { token, user: publicUser(profile, authUser) };
  },

  async login({ email, password }) {
    const firebaseSession = await signInWithPassword(email, password);
    const authUser = await auth.getUser(firebaseSession.localId);
    if (authUser.disabled) throw unauthorized("This account has been disabled.");

    let profile = await userService.findById(authUser.uid);
    if (!profile) {
      profile = await userService.createProfile(authUser.uid, {
        email: authUser.email,
        name: authUser.displayName,
        role: authUser.customClaims?.role || ROLES.BUYER
      });
    }

    const token = signToken({ uid: authUser.uid });
    return { token, user: publicUser(profile, authUser) };
  },

  async me(uid) {
    const authUser = await auth.getUser(uid);
    const profile = await userService.findById(uid);
    return publicUser(profile, authUser);
  },

  async forgotPassword(email) {
    const link = await auth.generatePasswordResetLink(email);
    return { message: "Password reset link generated.", link };
  },

  async resetPassword() {
    throw badRequest(
      "Password reset tokens from email links must be completed with Firebase Auth action links or a custom reset flow."
    );
  }
};
