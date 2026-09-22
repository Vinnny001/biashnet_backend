import {
  COLLECTIONS,
  PRODUCT_MODERATION_STATUSES,
  PRODUCT_REVIEW_NOTE_MAX_LENGTH,
  PRODUCT_REVIEWS_SUBCOLLECTION,
  PUBLIC_PRODUCT_FIELDS,
  REVIEW_COMMENT_MAX_LENGTH,
  ROLES
} from "../config/constants.js";
import { db, FieldValue } from "../config/firebase.js";
import { cleanObject, pick, serializeDoc, serializeSnapshot } from "../utils/formatters.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
import { toPositiveInt } from "../utils/validators.js";

const productsRef = db.collection(COLLECTIONS.PRODUCTS);
const VIEW_DEDUP_WINDOW_MS = 1000 * 60 * 60 * 12; // 12 hours

/*
|--------------------------------------------------------------------------
| Browsing the storefront
|--------------------------------------------------------------------------
|
| A product record carries far more than a product card shows: the full
| description, the search keywords, the promotion record, every image in
| five sizes each. Sending all of it for every listing made the
| storefront 446 KB — most of it never read, and all of it parsed on a
| phone before the first card appeared.
|
| So public browsing asks Firestore for these fields only, and keeps one
| image (the only one a card can show). The product page still loads the
| whole record.
|
*/

const CARD_FIELDS = [
  "title", "name", "price", "markedPrice", "oldPrice", "discount",
  "category", "subCategory", "condition", "location", "stock",
  "images", "rating", "reviewCount", "likeCount", "views",
  "flashSale", "flashSalePrice", "flashSaleStart", "flashSaleEnd",
  "promoted", "sellerName", "sellerId", "userId", "verified",
  "sellerVerified", "service", "status", "isActive", "createdAt", "updatedAt"
];

// Only the two sizes ProductCard reads, out of the five each image carries.
function cardImage(image) {
  if (!image || typeof image !== "object") return image;
  return { thumb: image.thumb || image.full, full: image.full || image.thumb };
}

function toCard(product) {
  const images = Array.isArray(product.images) ? product.images.slice(0, 1) : [];
  return { ...product, images: images.map(cardImage) };
}

/*
 * The storefront is the same for everyone and changes rarely, so the
 * answer is held briefly instead of re-reading every product per visitor.
 * Any write below clears it, so an approved listing appears at once
 * rather than up to a minute later.
 */
const CACHE_TTL_MS = 60 * 1000;
const listCache = new Map();

function cached(key, load) {
  const hit = listCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const value = load();
  listCache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

function clearListCache() {
  listCache.clear();
}

/*
 * Mirrors payment/biashnet-mpesa-api's checkoutService.js
 * isProductAvailable() exactly — a product that can't pass this can't be
 * checked out, so public browsing (home, search, wishlist, category
 * pages) must never show it as if it were purchasable. Keep both in
 * sync if this ever changes.
 */
function isPubliclyAvailable(product) {
  if (!product) return false;
  if (product.isActive !== true) return false;

  const status = String(product.status || "").trim().toLowerCase();
  return ["approved", "active"].includes(status);
}

export const productService = {
  isPubliclyAvailable,

  async list(params = {}) {
    let products;

    if (params.sellerId) {
      /*
      |--------------------------------------------------------------------------
      | Some legacy products only have userId, not sellerId (fixed going
      | forward at the upload server, but old docs still exist). Query both
      | fields separately and merge, deduping by document id.
      |--------------------------------------------------------------------------
      */

      const [bySellerId, byUserId] = await Promise.all([
        productsRef.where("sellerId", "==", params.sellerId).get(),
        productsRef.where("userId", "==", params.sellerId).get(),
      ]);

      const merged = new Map();

      for (const doc of [...bySellerId.docs, ...byUserId.docs]) {
        merged.set(doc.id, serializeDoc(doc));
      }

      products = Array.from(merged.values());

    } else {
      /*
      | No Firestore-level .limit() here — the public-availability filter
      | below runs client-side (same composite-index-avoidance convention
      | as the sellerId branch), so limiting the raw query first could
      | under-return fewer available products than actually exist. The
      | requested limit is applied client-side, after filtering, instead.
      |
      | What IS narrowed is the fields: browsing asks for card fields
      | only, plus the description when there's something to search in it.
      */

      const fields = params.q ? [...CARD_FIELDS, "description"] : CARD_FIELDS;

      const key = JSON.stringify([
        params.category || "",
        params.status || "",
        Boolean(params.includeUnavailable),
        Boolean(params.q)
      ]);

      products = await cached(key, async () => {
        let query = productsRef;

        if (params.category) query = query.where("category", "==", params.category);
        if (params.status) query = query.where("status", "==", params.status);

        const snapshot = await query.select(...fields).get();

        return serializeSnapshot(snapshot).map(toCard);
      });

      // The cached array is shared; sorting or slicing must not touch it.
      products = [...products];
    }

    if (params.status && params.sellerId) {
      products = products.filter((product) => product.status === params.status);
    }

    /*
    | Public browsing (no sellerId — the buyer-facing home/search/category
    | pages) must only ever show what checkout can actually sell. Sellers
    | viewing their own products (sellerId set) and admins explicitly
    | requesting everything (includeUnavailable) both bypass this.
    */
    if (!params.sellerId && !params.includeUnavailable) {
      products = products.filter(isPubliclyAvailable);
    }

    if (params.q) {
      const q = params.q.toLowerCase();
      products = products.filter((product) =>
        `${product.name || ""} ${product.title || ""} ${product.description || ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    if (params.sort === "price_asc") products.sort((a, b) => Number(a.price) - Number(b.price));
    if (params.sort === "price_desc") products.sort((a, b) => Number(b.price) - Number(a.price));

    if (params.limit) {
      products = products.slice(0, toPositiveInt(params.limit));
    }

    return products;
  },

  async findById(id) {
    const doc = await productsRef.doc(id).get();
    return serializeDoc(doc);
  },

  async create(data, actor) {
    const payload = cleanObject({
      ...pick(data, PUBLIC_PRODUCT_FIELDS),
      sellerId: actor.uid,
      sellerName: actor.name || actor.email,
      status: actor.role === ROLES.ADMIN ? data.status || "active" : "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    const doc = await productsRef.add(payload);
    clearListCache();
    return this.findById(doc.id);
  },

  async update(id, data) {
    const current = await this.findById(id);
    if (!current) throw notFound("Product not found.");

    await productsRef.doc(id).set(
      cleanObject({
        ...pick(data, PUBLIC_PRODUCT_FIELDS),
        updatedAt: FieldValue.serverTimestamp()
      }),
      { merge: true }
    );
    clearListCache();
    return this.findById(id);
  },

  async remove(id) {
    await productsRef.doc(id).delete();
    clearListCache();
    return { id };
  },

  /*
   * Admin-only moderation action — approve or reject a pending
   * listing. Deliberately separate from update() so a seller can
   * never reach this through the general product-edit endpoint.
   *
   * The note is the admin's message to the seller: required to reject,
   * optional to approve. It replaces any earlier note, so an approval
   * without one clears the reason a previous rejection gave.
   */
  async updateStatus(id, status, reviewedBy, note) {
    if (!PRODUCT_MODERATION_STATUSES.includes(status)) {
      throw badRequest(`Status must be one of: ${PRODUCT_MODERATION_STATUSES.join(", ")}.`);
    }

    const reviewNote = typeof note === "string" ? note.trim() : "";

    if (status === "rejected" && !reviewNote) {
      throw badRequest("Add a note telling the seller why the listing was rejected.");
    }

    if (reviewNote.length > PRODUCT_REVIEW_NOTE_MAX_LENGTH) {
      throw badRequest(`The note must be ${PRODUCT_REVIEW_NOTE_MAX_LENGTH} characters or fewer.`);
    }

    const current = await this.findById(id);
    if (!current) throw notFound("Product not found.");

    await productsRef.doc(id).update({
      status,
      reviewNote: reviewNote || null,
      reviewedBy: reviewedBy || null,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    clearListCache();

    return this.findById(id);
  },

  async reviews(id) {
    const snapshot = await productsRef
      .doc(id)
      .collection(PRODUCT_REVIEWS_SUBCOLLECTION)
      .limit(50)
      .get();

    // Newest first, sorted here so no composite index is needed.
    return serializeSnapshot(snapshot).sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  },

  /*
   * Has this buyer actually received this listing? Only then may they
   * review it, which is what stops a seller's friends — or a competitor —
   * from rating a listing nobody bought.
   *
   * COMPLETED is the order's final state, reached when the buyer's
   * delivery code is entered on hand-over. Orders come in two shapes: the
   * current one lists items[].listingId, the older single-item one puts
   * listingId at the top level. Both count.
   */
  async hasPurchased(userId, productId) {
    if (!userId || !productId) return false;

    const snapshot = await db
      .collection(COLLECTIONS.ORDERS)
      .where("buyerId", "==", userId)
      .where("status", "==", "COMPLETED")
      .get();

    return snapshot.docs.some((doc) => {
      const order = doc.data();

      if (order.listingId === productId) return true;

      return (order.items || []).some(
        (item) => item?.listingId === productId || item?.productId === productId
      );
    });
  },

  /*
   * A buyer's review of a listing they have received. The document id is
   * the buyer's uid, so leaving a second review edits the first instead of
   * stacking up, and the listing's own rating/reviewCount (fields the
   * product page and the older Biashnet app both read) are recalculated
   * from what's stored.
   */
  async addReview(id, { userId, author, rating, comment }) {
    const score = Number(rating);

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw badRequest("Give the product a rating from 1 to 5 stars.");
    }

    const text = typeof comment === "string" ? comment.trim() : "";

    if (text.length > REVIEW_COMMENT_MAX_LENGTH) {
      throw badRequest(`Your review must be ${REVIEW_COMMENT_MAX_LENGTH} characters or fewer.`);
    }

    const product = await this.findById(id);
    if (!product) throw notFound("Product not found.");

    if (!(await this.hasPurchased(userId, id))) {
      throw forbidden(
        "You can review this product once an order you placed for it has been delivered."
      );
    }

    const reviewsRef = productsRef.doc(id).collection(PRODUCT_REVIEWS_SUBCOLLECTION);
    const existing = await reviewsRef.doc(userId).get();

    await reviewsRef.doc(userId).set(
      cleanObject({
        userId,
        author: author || "Customer",
        rating: score,
        comment: text || null,
        createdAt: existing.exists
          ? existing.data().createdAt
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }),
      { merge: true }
    );

    const all = await reviewsRef.get();
    const scores = all.docs
      .map((doc) => Number(doc.data().rating))
      .filter((value) => Number.isFinite(value));

    const average = scores.length
      ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10
      : 0;

    await productsRef.doc(id).update({
      rating: average,
      reviewCount: scores.length,
      updatedAt: FieldValue.serverTimestamp()
    });

    clearListCache();

    return {
      review: { id: userId, userId, author: author || "Customer", rating: score, comment: text || null },
      rating: average,
      reviewCount: scores.length,
      edited: existing.exists
    };
  },

  async recordView(id, { viewerKey, authedUid } = {}) {
    if (!viewerKey) return;

    const productRef = productsRef.doc(id);
    const viewLogId = String(viewerKey).replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 500);
    const viewLogRef = productRef.collection("viewLogs").doc(viewLogId);

    await db.runTransaction(async (tx) => {
      const [productSnap, viewLogSnap] = await Promise.all([
        tx.get(productRef),
        tx.get(viewLogRef)
      ]);

      if (!productSnap.exists) {
        console.log("[recordView] product not found:", id);
        return;
      }

      const product = productSnap.data();
      const productSellerId = product.sellerId || product.userId;
      console.log("[recordView] authedUid:", authedUid, "| productSellerId:", productSellerId, "| viewerKey:", viewerKey);

      if (authedUid && productSellerId === authedUid) {
        console.log("[recordView] SKIPPED: self-view");
        return;
      }

      const now = Date.now();
      const lastSeen = viewLogSnap.exists ? viewLogSnap.data().lastSeen : 0;
      if (now - lastSeen < VIEW_DEDUP_WINDOW_MS) {
        console.log("[recordView] SKIPPED: dedup window, lastSeen:", new Date(lastSeen));
        return;
      }

      console.log("[recordView] INCREMENTING view count");
      tx.set(viewLogRef, { lastSeen: now }, { merge: true });
      tx.update(productRef, { views: FieldValue.increment(1) });
    });
  }
};