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
  CART: "cart",
  /*
   * A buyer's liked listings. New collection rather than a field on the
   * product or the user, so a like is one small document that other
   * services reading `products` or `users` never see change.
   */
  PRODUCT_LIKES: "marketplaceProductLikes"
};

/*
 * A buyer may leave one review per listing, stored under the listing
 * itself (products/{id}/reviews/{buyerUid}) — which is where the product
 * page already reads them from.
 */
export const PRODUCT_REVIEWS_SUBCOLLECTION = "reviews";
export const REVIEW_COMMENT_MAX_LENGTH = 1000;

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

/*
 * The admin's note to the seller on a moderation decision: required when
 * rejecting (the seller has to know what to fix), optional when approving.
 */
export const PRODUCT_REVIEW_NOTE_MAX_LENGTH = 500;

/*
 * Moderation details only the listing's seller and admins may see — never
 * buyers browsing the storefront.
 */
export const PRODUCT_REVIEW_FIELDS = ["reviewNote", "reviewedBy", "reviewedAt", "policyReview"];


