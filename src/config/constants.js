export const NODE_ENV = process.env.NODE_ENV || "development";
export const PORT = Number(process.env.PORT || 5000);
export const IS_PRODUCTION = NODE_ENV === "production";

export const COLLECTIONS = {
  USERS: "users",
  PRODUCTS: "products",
  ORDERS: "marketplaceOrders",
  ADVERTS: "adverts",
  CHATS: "chats",
  MESSAGES: "messages",
  PAYMENTS: "payments",
  NOTIFICATIONS: "notifications",
  CART: "cart"
};

export const ROLES = {
  ADMIN: "admin",
  SELLER: "seller",
  BUYER: "buyer",
  INVESTOR: "investor"
};

export const ALLOWED_SIGNUP_ROLES = [ROLES.BUYER, ROLES.SELLER];

/*
 * "status" is deliberately excluded — it's the moderation field
 * (pending/approved/rejected), only ever set at creation time or
 * changed by an admin via PATCH /api/products/:id/status. A seller
 * editing their own listing through the general update endpoint must
 * never be able to self-approve by slipping it into the request body.
 */
export const PUBLIC_PRODUCT_FIELDS = [
  "name",
  "title",
  "description",
  "price",
  "category",
  "image",
  "imageUrl",
  "images",
  "sellerId",
  "sellerName",
  "createdAt",
  "updatedAt"
];

export const PRODUCT_MODERATION_STATUSES = ["approved", "rejected"];


