import { COLLECTIONS, PRODUCT_MODERATION_STATUSES, PUBLIC_PRODUCT_FIELDS, ROLES } from "../config/constants.js";
import { db, FieldValue } from "../config/firebase.js";
import { cleanObject, pick, serializeDoc, serializeSnapshot } from "../utils/formatters.js";
import { badRequest, notFound } from "../utils/errors.js";
import { toPositiveInt } from "../utils/validators.js";

const productsRef = db.collection(COLLECTIONS.PRODUCTS);
const VIEW_DEDUP_WINDOW_MS = 1000 * 60 * 60 * 12; // 12 hours

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
      let query = productsRef;

      if (params.category) query = query.where("category", "==", params.category);
      if (params.status) query = query.where("status", "==", params.status);

      /*
      | No Firestore-level .limit() here — the public-availability filter
      | below runs client-side (same composite-index-avoidance convention
      | as the sellerId branch), so limiting the raw query first could
      | under-return fewer available products than actually exist. The
      | requested limit is applied client-side, after filtering, instead.
      */

      const snapshot = await query.get();
      products = serializeSnapshot(snapshot);
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
    return this.findById(id);
  },

  async remove(id) {
    await productsRef.doc(id).delete();
    return { id };
  },

  /*
   * Admin-only moderation action — approve or reject a pending
   * listing. Deliberately separate from update() so a seller can
   * never reach this through the general product-edit endpoint.
   */
  async updateStatus(id, status, reviewedBy) {
    if (!PRODUCT_MODERATION_STATUSES.includes(status)) {
      throw badRequest(`Status must be one of: ${PRODUCT_MODERATION_STATUSES.join(", ")}.`);
    }

    const current = await this.findById(id);
    if (!current) throw notFound("Product not found.");

    await productsRef.doc(id).update({
      status,
      reviewedBy: reviewedBy || null,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return this.findById(id);
  },

  async reviews(id) {
    const snapshot = await productsRef.doc(id).collection("reviews").limit(50).get();
    return serializeSnapshot(snapshot);
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