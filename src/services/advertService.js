import { COLLECTIONS } from "../config/constants.js";
import { db, FieldValue } from "../config/firebase.js";
import { cleanObject, serializeDoc, serializeSnapshot } from "../utils/formatters.js";
import { notFound } from "../utils/errors.js";
import { toPositiveInt } from "../utils/validators.js";

const advertsRef = db.collection(COLLECTIONS.ADVERTS);

export const advertService = {
  async list(params = {}) {
    let query = advertsRef.limit(toPositiveInt(params.limit, 20, 100));
    if (params.status) query = query.where("status", "==", params.status);
    const snapshot = await query.get();
    return serializeSnapshot(snapshot);
  },

  async findById(id) {
    return serializeDoc(await advertsRef.doc(id).get());
  },

  async create(data, actor) {
    const doc = await advertsRef.add(
      cleanObject({
        ...data,
        ownerId: actor.uid,
        status: data.status || "pending",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })
    );
    return this.findById(doc.id);
  },

  async update(id, data) {
    const advert = await this.findById(id);
    if (!advert) throw notFound("Advert not found.");
    await advertsRef.doc(id).set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return this.findById(id);
  },

  async remove(id) {
    await advertsRef.doc(id).delete();
    return { id };
  }
};
