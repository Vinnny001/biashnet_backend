import { COLLECTIONS, ROLES } from "../config/constants.js";
import { auth, db, FieldValue } from "../config/firebase.js";
import { cleanObject, serializeDoc, serializeSnapshot } from "../utils/formatters.js";
import { badRequest, notFound } from "../utils/errors.js";

const usersRef = db.collection(COLLECTIONS.USERS);

export const userService = {
  async findById(uid) {
    const doc = await usersRef.doc(uid).get();
    return serializeDoc(doc);
  },

  async list({ role, limit = 50 } = {}) {
    let query = usersRef.limit(Number(limit));
    if (role) query = query.where("role", "==", role);
    const snapshot = await query.get();
    return serializeSnapshot(snapshot);
  },

  async createProfile(uid, data) {
    const profile = cleanObject({
      uid,
      id: uid,
      name: data.name || data.displayName || "",
      displayName: data.name || data.displayName || "",
      firstName: data.firstName || "",
      businessName: data.businessName || "",
      surname: data.surname || "",
      email: data.email,
      phone: data.phone || "",
      location: data.location || "",
      userType: data.userType || null,   // "individual" | "business"
      roles: data.roles || { [ROLES.BUYER]: true },
      role: data.role || ROLES.BUYER,
      disabled: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    await usersRef.doc(uid).set(profile, { merge: true });
    return this.findById(uid);
  },

  async create(data) {
    const authUser = await auth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.name,
      disabled: Boolean(data.disabled)
    });

    const role = data.role || ROLES.BUYER;
    await auth.setCustomUserClaims(authUser.uid, { role });
    return this.createProfile(authUser.uid, { ...data, role });
  },

  /*
   * Self-service profile update. Callers of this method are
   * updating their OWN profile via a route gated only by
   * requireAuth (no admin check) — role/disabled must never
   * be accepted here, or any user could grant themselves
   * admin. Role/disabled changes go through update() below,
   * which is only reachable via admin-gated routes.
   */
  async updateSelf(uid, data) {
    const current = await this.findById(uid);
    if (!current) throw notFound("User not found.");

    const profileUpdates = cleanObject({
      name: data.name,
      displayName: data.name,
      phone: data.phone,
      location: data.location,
      photoURL: data.photoURL,
      updatedAt: FieldValue.serverTimestamp()
    });

    const authUpdates = cleanObject({
      displayName: data.name,
      photoURL: data.photoURL
    });

    if (Object.keys(authUpdates).length) {
      await auth.updateUser(uid, authUpdates);
    }

    await usersRef.doc(uid).set(profileUpdates, { merge: true });
    return this.findById(uid);
  },

  async update(uid, data) {
    const current = await this.findById(uid);
    if (!current) throw notFound("User not found.");

    const profileUpdates = cleanObject({
      name: data.name,
      displayName: data.name,
      phone: data.phone,
      location: data.location,
      photoURL: data.photoURL,
      role: data.role,
      disabled: data.disabled,
      updatedAt: FieldValue.serverTimestamp()
    });

    const authUpdates = cleanObject({
      displayName: data.name,
      photoURL: data.photoURL,
      disabled: data.disabled
    });

    if (Object.keys(authUpdates).length) {
      await auth.updateUser(uid, authUpdates);
    }

    if (data.role) {
      await auth.setCustomUserClaims(uid, { role: data.role });
    }

    await usersRef.doc(uid).set(profileUpdates, { merge: true });
    return this.findById(uid);
  },

  /*
   * FCM device token for Android push notifications
   * (Capacitor @capacitor/push-notifications). Stored as an
   * array — a user can have more than one device. mpesa-api
   * reads this same field directly (shared Firestore project)
   * to send real pushes alongside its in-app notifications.
   */
  async registerDeviceToken(uid, token) {
    if (!token) throw badRequest("Device token is required.");

    await usersRef.doc(uid).set(
      {
        fcmTokens: FieldValue.arrayUnion(token),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    return { success: true };
  },

  async removeDeviceToken(uid, token) {
    if (!token) throw badRequest("Device token is required.");

    await usersRef.doc(uid).set(
      {
        fcmTokens: FieldValue.arrayRemove(token),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    return { success: true };
  },

  async remove(uid) {
    await auth.deleteUser(uid);
    await usersRef.doc(uid).delete();
    return { id: uid };
  },

  async findByEmail(email) {
  const snap = await db
    .collection("users")
    .where("email", "==", email.toLowerCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data();
}

  
};


