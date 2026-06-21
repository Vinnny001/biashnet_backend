import { COLLECTIONS, ROLES } from "../config/constants.js";
import { db, FieldValue } from "../config/firebase.js";
import { cleanObject, serializeDoc, serializeSnapshot } from "../utils/formatters.js";
import { forbidden, notFound } from "../utils/errors.js";

const ordersRef = db.collection(COLLECTIONS.ORDERS);

function canRead(order, actor) {
  return (
    actor.role === ROLES.ADMIN ||
    order.userId === actor.uid ||
    order.sellerId === actor.uid ||
    (order.items || []).some((item) => item.sellerId === actor.uid)
  );
}

export const orderService = {
  async list(params = {}, actor) {
    let query = ordersRef.limit(100);
    if (actor.role !== ROLES.ADMIN) query = query.where("userId", "==", actor.uid);
    if (params.status) query = query.where("status", "==", params.status);
    const snapshot = await query.get();
    return serializeSnapshot(snapshot);
  },

  async findById(id, actor) {
    const order = serializeDoc(await ordersRef.doc(id).get());
    if (!order) throw notFound("Order not found.");
    if (!canRead(order, actor)) throw forbidden();
    return order;
  },

  async create(data, actor) {
    const total =
      Number(data.total) ||
      (data.items || []).reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
        0
      );

    const doc = await ordersRef.add(
      cleanObject({
        userId: actor.uid,
        customerName: actor.name || actor.email,
        items: data.items || [],
        total,
        address: data.address,
        phone: data.phone,
        notes: data.notes,
        status: "pending",
        timeline: [
          {
            label: "Order placed",
            description: "Your order has been received."
          }
        ],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })
    );

    return this.findById(doc.id, actor);
  },

  async update(id, data, actor) {
    const order = await this.findById(id, actor);
    if (actor.role !== ROLES.ADMIN && order.userId !== actor.uid) throw forbidden();

    await ordersRef.doc(id).set(
      cleanObject({
        status: data.status,
        address: data.address,
        phone: data.phone,
        notes: data.notes,
        timeline: data.timeline,
        updatedAt: FieldValue.serverTimestamp()
      }),
      { merge: true }
    );
    return this.findById(id, actor);
  },

  async cancel(id, actor) {
    await this.findById(id, actor);
    await ordersRef.doc(id).set(
      {
        status: "cancelled",
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    return this.findById(id, actor);
  }
};
