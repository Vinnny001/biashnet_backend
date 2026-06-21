import { COLLECTIONS, ROLES } from "../config/constants.js";
import { auth, db, FieldValue } from "../config/firebase.js";
import { cleanObject, serializeDoc, serializeSnapshot } from "../utils/formatters.js";
import { notFound } from "../utils/errors.js";

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
      email: data.email,
      phone: data.phone || "",
      location: data.location || "",
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

  async remove(uid) {
    await auth.deleteUser(uid);
    await usersRef.doc(uid).delete();
    return { id: uid };
  }
};
