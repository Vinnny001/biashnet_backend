import { COLLECTIONS } from "../config/constants.js";
import { db, FieldValue } from "../config/firebase.js";

/*
 * Everything backend itself notifies about is work-account business
 * (reports, role changes), so that is the default audience. It is stored
 * on the document so the work account's notification screen — and not
 * the same person's buyer or seller screen — shows it. Values match the
 * payment service's utils/notificationAudience.js.
 */
export const notificationService = {
  async create(userId, data) {
    const doc = await db.collection(COLLECTIONS.NOTIFICATIONS).add({
      userId,
      title: data.title,
      message: data.message,
      type: data.type || "GENERAL",
      audience: data.audience || "EMPLOYEE",
      read: false,
      createdAt: FieldValue.serverTimestamp()
    });
    return { id: doc.id };
  }
};
