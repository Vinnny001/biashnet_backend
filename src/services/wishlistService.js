import { COLLECTIONS } from "../config/constants.js";
import { db, FieldValue } from "../config/firebase.js";
import { serializeDoc } from "../utils/formatters.js";
import { notFound } from "../utils/errors.js";

const likesRef = db.collection(COLLECTIONS.PRODUCT_LIKES);
const productsRef = db.collection(COLLECTIONS.PRODUCTS);

/*
 * One document per (buyer, listing), keyed by both, so liking twice is
 * the same like and unliking is a delete rather than a search.
 */
function likeId(userId, productId) {
  return `${userId}__${productId}`;
}

export const wishlistService = {
  async productIds(userId) {
    const snapshot = await likesRef.where("userId", "==", userId).get();

    return snapshot.docs
      .map((doc) => doc.data().productId)
      .filter(Boolean);
  },

  /*
   * The liked listings themselves, newest like first. A listing that has
   * since been deleted is simply left out rather than breaking the page.
   */
  async list(userId) {
    const snapshot = await likesRef.where("userId", "==", userId).get();

    const likes = snapshot.docs
      .map((doc) => doc.data())
      .filter((like) => like.productId)
      .sort((a, b) => Number(b.createdAt?.toMillis?.() || 0) - Number(a.createdAt?.toMillis?.() || 0));

    if (likes.length === 0) return [];

    const productDocs = await db.getAll(
      ...likes.map((like) => productsRef.doc(like.productId))
    );

    return productDocs
      .map(serializeDoc)
      .filter(Boolean);
  },

  /*
   * The running total lives on the listing as `likeCount`, so anyone
   * browsing — signed in or not — sees it with the listing itself, with no
   * extra request and without being able to see who liked it. Counting is
   * done in a transaction against the like document, so liking twice or
   * unliking what was never liked can't drift the number.
   */
  async add(userId, productId) {
    const productRef = productsRef.doc(productId);
    const likeRef = likesRef.doc(likeId(userId, productId));

    const likeCount = await db.runTransaction(async (tx) => {
      const [productSnap, likeSnap] = await Promise.all([tx.get(productRef), tx.get(likeRef)]);

      if (!productSnap.exists) throw notFound("Product not found.");

      const current = Number(productSnap.data().likeCount || 0);
      if (likeSnap.exists) return current;

      tx.set(likeRef, {
        userId,
        productId,
        createdAt: FieldValue.serverTimestamp()
      });

      const next = current + 1;
      tx.update(productRef, { likeCount: next });
      return next;
    });

    return { productId, liked: true, likeCount };
  },

  async remove(userId, productId) {
    const productRef = productsRef.doc(productId);
    const likeRef = likesRef.doc(likeId(userId, productId));

    const likeCount = await db.runTransaction(async (tx) => {
      const [productSnap, likeSnap] = await Promise.all([tx.get(productRef), tx.get(likeRef)]);

      const current = Number(productSnap.exists ? productSnap.data().likeCount || 0 : 0);
      if (!likeSnap.exists) return current;

      tx.delete(likeRef);

      const next = Math.max(0, current - 1);
      if (productSnap.exists) tx.update(productRef, { likeCount: next });
      return next;
    });

    return { productId, liked: false, likeCount };
  }
};
