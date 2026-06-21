import { COLLECTIONS, ROLES } from "../config/constants.js";
import { db, FieldValue } from "../config/firebase.js";
import { serializeDoc, serializeSnapshot } from "../utils/formatters.js";
import { forbidden, notFound } from "../utils/errors.js";

const chatsRef = db.collection(COLLECTIONS.CHATS);

function canAccess(thread, actor) {
  return actor.role === ROLES.ADMIN || (thread.participantIds || []).includes(actor.uid);
}

export const chatService = {
  async threads(actor) {
    let query = chatsRef.limit(100);
    if (actor.role !== ROLES.ADMIN) {
      query = query.where("participantIds", "array-contains", actor.uid);
    }
    const snapshot = await query.get();
    return serializeSnapshot(snapshot);
  },

  async create(data, actor) {
    const participantIds = [...new Set([actor.uid, ...(data.participantIds || [])])];
    const doc = await chatsRef.add({
      title: data.title || "Conversation",
      participantIds,
      lastMessage: "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    return serializeDoc(await doc.get());
  },

  async getThread(threadId, actor) {
    const thread = serializeDoc(await chatsRef.doc(threadId).get());
    if (!thread) throw notFound("Conversation not found.");
    if (!canAccess(thread, actor)) throw forbidden();
    return thread;
  },

  async messages(threadId, actor) {
    await this.getThread(threadId, actor);
    const snapshot = await chatsRef
      .doc(threadId)
      .collection(COLLECTIONS.MESSAGES)
      .orderBy("createdAt", "asc")
      .limit(100)
      .get();
    return serializeSnapshot(snapshot);
  },

  async send(threadId, data, actor) {
    await this.getThread(threadId, actor);
    const message = {
      text: data.text || data.body,
      senderId: actor.uid,
      createdAt: FieldValue.serverTimestamp()
    };
    const messageRef = await chatsRef.doc(threadId).collection(COLLECTIONS.MESSAGES).add(message);
    await chatsRef.doc(threadId).set(
      {
        lastMessage: message.text,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    return serializeDoc(await messageRef.get());
  }
};
