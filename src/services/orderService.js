import { COLLECTIONS, ROLES } from "../config/constants.js";
import { db, FieldValue } from "../config/firebase.js";
import { cleanObject, serializeDoc, serializeSnapshot } from "../utils/formatters.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";

const ordersRef = db.collection(COLLECTIONS.ORDERS);

/*
|--------------------------------------------------------------------------
| ORDER STATUS
|--------------------------------------------------------------------------
|
| The real order lifecycle (payment, escrow, delivery-code completion) is
| owned by the separate biashnet-mpesa-api service, which writes this SAME
| Firestore collection. This backend's status field must never be used to
| fake payment/fulfillment state (a buyer or seller previously could PATCH
| status to any string at all, including "paid"/"delivered"). Only a
| fulfillment-only subset is writable here, and only by the seller on the
| order; buyers cancel via the dedicated cancel() method below instead.
|
*/
const SELLER_WRITABLE_STATUSES = [
  "processing",
  "ready_for_pickup",
  "out_for_delivery",
  "completed"
];

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
  | never address/phone/notes, which belong to the buyer — and only to a
  | fixed, fulfillment-only set of status values (see SELLER_WRITABLE_STATUSES
  | above). Buyers cannot set status through this endpoint at all; they use
  | the dedicated cancel() method. Admin is trusted and unrestricted.
  |--------------------------------------------------------------------------
  */

  let updates;

  if (isAdmin) {
    updates = {
      status: data.status,
      address: data.address,
      phone: data.phone,
      notes: data.notes,
      timeline: data.timeline,
      updatedAt: FieldValue.serverTimestamp()
    };
  } else if (isOwner) {
    if (data.status !== undefined) {
      throw badRequest("Use the cancel endpoint to cancel an order; status cannot be set directly.");
    }
    updates = {
      address: data.address,
      phone: data.phone,
      notes: data.notes,
      updatedAt: FieldValue.serverTimestamp()
    };
  } else {
    if (data.status !== undefined && !SELLER_WRITABLE_STATUSES.includes(data.status)) {
      throw badRequest(
        `status must be one of: ${SELLER_WRITABLE_STATUSES.join(", ")}.`
      );
    }
    updates = {
      status: data.status,
      updatedAt: FieldValue.serverTimestamp()
    };
  }

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

