import { COLLECTIONS } from "../config/constants.js";
import { db, FieldValue } from "../config/firebase.js";
import { cleanObject, serializeDoc, serializeSnapshot } from "../utils/formatters.js";
import { notFound, badRequest } from "../utils/errors.js";

const cartRef = db.collection(COLLECTIONS.CART);
const productsRef = db.collection(COLLECTIONS.PRODUCTS);

const CART_STATUS = {
  ACTIVE: "active",
  PENDING: "pending",
  REMOVED: "removed"
};

export const cartService = {
  async list(userId, status = CART_STATUS.ACTIVE) {
    const snapshot = await cartRef
      .where("userId", "==", userId)
      .where("status", "==", status)
      .get();
    return serializeSnapshot(snapshot);
  },

  async addItem(userId, { productId, quantity = 1 }) {
    if (!productId) throw notFound("productId is required.");

    const productSnap = await productsRef.doc(productId).get();
    if (!productSnap.exists) throw notFound("Product not found.");
    const product = productSnap.data();

    const existingSnap = await cartRef
      .where("userId", "==", userId)
      .where("productId", "==", productId)
      .where("status", "==", CART_STATUS.ACTIVE)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const doc = existingSnap.docs[0];
      await doc.ref.update({
        quantity: FieldValue.increment(quantity),
        updatedAt: FieldValue.serverTimestamp()
      });
      return serializeDoc(await doc.ref.get());
    }

    const payload = cleanObject({
      userId,
      productId,
      postId: productId,
      sellerId: product.sellerId || product.userId || null,
      title: product.title || product.name || "",
      image: product.images?.[0]?.thumb || product.images?.[0]?.full || product.image || null,
      price: product.price,
      category: product.category || null,
      quantity,
      type: "product",
      status: CART_STATUS.ACTIVE,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    const doc = await cartRef.add(payload);
    return serializeDoc(await doc.get());
  },

  async updateQuantity(userId, itemId, quantity) {
    const docRef = cartRef.doc(itemId);
    const snap = await docRef.get();
    if (!snap.exists || snap.data().userId !== userId) throw notFound("Cart item not found.");

    if (quantity <= 0) {
      await docRef.update({
        status: CART_STATUS.REMOVED,
        removedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      return { id: itemId, status: CART_STATUS.REMOVED };
    }

    await docRef.update({
      quantity,
      updatedAt: FieldValue.serverTimestamp()
    });
    return serializeDoc(await docRef.get());
  },

  async removeItem(userId, itemId) {
    const docRef = cartRef.doc(itemId);
    const snap = await docRef.get();
    if (!snap.exists || snap.data().userId !== userId) throw notFound("Cart item not found.");

    await docRef.update({
      status: CART_STATUS.REMOVED,
      removedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    return { id: itemId, status: CART_STATUS.REMOVED };
  },

  // called by the frontend right after it successfully creates an order
  // via the mpesa-api payments server (order exists, payment not yet confirmed)
  async markPending(userId, itemId, { orderId = null, paymentId = null } = {}) {
    const docRef = cartRef.doc(itemId);
    const snap = await docRef.get();
    if (!snap.exists || snap.data().userId !== userId) throw notFound("Cart item not found.");
    if (snap.data().status !== CART_STATUS.ACTIVE) {
      throw badRequest("Only active cart items can be checked out.");
    }

    await docRef.update(
      cleanObject({
        status: CART_STATUS.PENDING,
        orderId,
        paymentId,
        checkoutInitiatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })
    );
    return serializeDoc(await docRef.get());
  },

  async mergeLocalCart(userId, localItems = []) {
    for (const item of localItems) {
      const productId = item.productId || item.id;
      if (!productId) continue;
      await this.addItem(userId, { productId, quantity: Number(item.quantity) || 1 });
    }
    return this.list(userId);
  }
};