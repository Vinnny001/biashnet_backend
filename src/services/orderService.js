import { COLLECTIONS, ROLES } from "../config/constants.js";
import { db, FieldValue } from "../config/firebase.js";
import { cleanObject, serializeDoc, serializeSnapshot } from "../utils/formatters.js";
import { forbidden, notFound } from "../utils/errors.js";

const ordersRef = db.collection(COLLECTIONS.ORDERS);

function canRead(order, actor) {
  const buyerId = order.userId || order.buyerId;
  return (
    actor.role === ROLES.ADMIN ||
    buyerId === actor.uid ||
    order.sellerId === actor.uid ||
    (order.items || []).some((item) => item.sellerId === actor.uid)
  );
}

export const orderService = {
  async list(params = {}, actor) {
    const snapshot = await ordersRef.limit(500).get();
    const orders = serializeSnapshot(snapshot);

    function getBuyerId(order) {
      return order.userId || order.buyerId || null;
    }

    function getStatus(order) {
      return order.orderStatus || order.status || "pending";
    }

    let result = orders;

    if (actor.role === ROLES.ADMIN) {
      // no filtering — admin sees every order
    } else if (actor.role === ROLES.SELLER) {
      result = orders.filter((order) =>
        (order.items || []).some((item) => item.sellerId === actor.uid)
      );
    } else {
      result = orders.filter((order) => getBuyerId(order) === actor.uid);
    }

    if (params.status) {
      result = result.filter((order) => getStatus(order) === params.status);
    }

    return result;
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

  const buyerId = order.userId || order.buyerId;
  const isOwner = buyerId === actor.uid;
  const isSellerOnOrder = (order.items || []).some((item) => item.sellerId === actor.uid);
  const isAdmin = actor.role === ROLES.ADMIN;

  if (!isAdmin && !isOwner && !isSellerOnOrder) throw forbidden();

  /*
  |--------------------------------------------------------------------------
  | Sellers (not the buyer, not admin) can only touch fulfillment fields —
  | never address/phone/notes, which belong to the buyer.
  |--------------------------------------------------------------------------
  */

  const updates = isAdmin || isOwner
    ? {
        status: data.status,
        address: data.address,
        phone: data.phone,
        notes: data.notes,
        timeline: data.timeline,
        updatedAt: FieldValue.serverTimestamp()
      }
    : {
        status: data.status,
        timeline: data.timeline,
        updatedAt: FieldValue.serverTimestamp()
      };

  await ordersRef.doc(id).set(cleanObject(updates), { merge: true });
  return this.findById(id, actor);
},

  async cancel(id, actor) {
  const order = await this.findById(id, actor);

  const buyerId = order.userId || order.buyerId;
  const isOwner = buyerId === actor.uid;
  const isAdmin = actor.role === ROLES.ADMIN;

  if (!isAdmin && !isOwner) throw forbidden();

  await ordersRef.doc(id).set(
    {
      status: "cancelled",
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  return this.findById(id, actor);
},
};

