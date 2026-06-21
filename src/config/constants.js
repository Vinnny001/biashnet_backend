export const NODE_ENV = process.env.NODE_ENV || "development";
export const PORT = Number(process.env.PORT || 5000);
export const IS_PRODUCTION = NODE_ENV === "production";

export const COLLECTIONS = {
  USERS: "users",
  PRODUCTS: "products",
  ORDERS: "orders",
  ADVERTS: "adverts",
  CHATS: "chats",
  MESSAGES: "messages",
  PAYMENTS: "payments",
  NOTIFICATIONS: "notifications"
};

export const ROLES = {
  ADMIN: "admin",
  SELLER: "seller",
  BUYER: "buyer"
};

export const ALLOWED_SIGNUP_ROLES = [ROLES.BUYER, ROLES.SELLER];

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
  "status",
  "createdAt",
  "updatedAt"
];
