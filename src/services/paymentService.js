import { COLLECTIONS } from "../config/constants.js";
import { db, FieldValue } from "../config/firebase.js";
import { serializeDoc } from "../utils/formatters.js";

const paymentsRef = db.collection(COLLECTIONS.PAYMENTS);

export const paymentService = {
  async checkout(data, actor) {
    const doc = await paymentsRef.add({
      userId: actor.uid,
      amount: Number(data.amount || data.total || 0),
      currency: data.currency || "KES",
      provider: data.provider || "manual",
      status: "pending",
      metadata: data.metadata || {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return serializeDoc(await doc.get());
  },

  async status(id) {
    return serializeDoc(await paymentsRef.doc(id).get());
  }
};
