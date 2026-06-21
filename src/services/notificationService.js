import { COLLECTIONS } from "../config/constants.js";
import { db, FieldValue } from "../config/firebase.js";

export const notificationService = {
  async create(userId, data) {
    const doc = await db.collection(COLLECTIONS.NOTIFICATIONS).add({
      userId,
      title: data.title,
      message: data.message,
      read: false,
      createdAt: FieldValue.serverTimestamp()
    });
    return { id: doc.id };
  }
};
