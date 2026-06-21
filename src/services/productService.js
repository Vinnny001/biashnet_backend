import { COLLECTIONS, PUBLIC_PRODUCT_FIELDS, ROLES } from "../config/constants.js";
import { db, FieldValue } from "../config/firebase.js";
import { cleanObject, pick, serializeDoc, serializeSnapshot } from "../utils/formatters.js";
import { notFound } from "../utils/errors.js";
import { toPositiveInt } from "../utils/validators.js";

const productsRef = db.collection(COLLECTIONS.PRODUCTS);

export const productService = {
  async list(params = {}) {
    const limit = toPositiveInt(params.limit, 20, 100);
    let query = productsRef.limit(limit);

    if (params.category) query = query.where("category", "==", params.category);
    if (params.sellerId) query = query.where("sellerId", "==", params.sellerId);
    if (params.status) query = query.where("status", "==", params.status);

    const snapshot = await query.get();
    let products = serializeSnapshot(snapshot);

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
      status: actor.role === ROLES.ADMIN ? data.status || "active" : "pending",
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

  async reviews(id) {
    const snapshot = await productsRef.doc(id).collection("reviews").limit(50).get();
    return serializeSnapshot(snapshot);
  }
};
