import { getMessaging } from "firebase-admin/messaging";

import { COLLECTIONS } from "../config/constants.js";
import { db, FieldValue, firebaseAdmin } from "../config/firebase.js";
import { logger } from "../utils/logger.js";

/*
|--------------------------------------------------------------------------
| Tell a seller their listing was approved or rejected
|--------------------------------------------------------------------------
|
| Written to the shared `notifications` collection in the same shape the
| payment service and the upload server use, with audience "SELLER", so it
| appears only on the seller notifications screen and a tapped push opens
| the seller account. The push mirrors the upload server's
| adminNotificationService: one send() per device, removing tokens for
| uninstalled apps.
|
|--------------------------------------------------------------------------
*/

const ANDROID_NOTIFICATION_CHANNEL_ID = "biashnet_default";

const DEAD_TOKEN_CODES = [
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered"
];

export const PRODUCT_REVIEW_NOTIFICATION_TYPES = {
  approved: "PRODUCT_APPROVED",
  rejected: "PRODUCT_REJECTED"
};

// "Dear Seller," — with their name when the listing carries one. The upload
// server falls back to the seller's email for sellerName; don't greet that.
function sellerSalutation(sellerName) {
  const name = String(sellerName || "").trim();
  return name && !name.includes("@") ? `Dear Seller ${name},` : "Dear Seller,";
}

function asSentence(text) {
  const trimmed = String(text || "").trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function buildProductReviewMessage({ product, status, note }) {
  const listing = String(product?.title || product?.name || "").trim() || "your product";
  const salutation = sellerSalutation(product?.sellerName);

  if (status === "rejected") {
    return {
      title: `Listing rejected: ${listing}`,
      message:
        `${salutation} your listing "${listing}" was not approved. ` +
        `Reason: ${asSentence(note)} ` +
        "Edit the listing to fix this and it will be reviewed again."
    };
  }

  const live = product?.isActive === false
    ? "has been approved. It's switched off, so turn it on when you want buyers to see it."
    : "has been approved and is now live for buyers on Biashnet.";

  return {
    title: `Listing approved: ${listing}`,
    message: `${salutation} your listing "${listing}" ${live}` + (note ? ` Note from Biashnet: ${asSentence(note)}` : "")
  };
}

async function pushToUser(userId, { title, message, data }) {
  const userSnap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
  const tokens = userSnap.exists ? userSnap.data().fcmTokens || [] : [];

  if (!Array.isArray(tokens) || tokens.length === 0) return;

  const results = await Promise.allSettled(
    tokens.map((token) =>
      getMessaging(firebaseAdmin).send({
        token,
        notification: { title, body: message },
        // FCM only accepts string values in data.
        data: Object.fromEntries(
          Object.entries(data)
            .filter(([, value]) => value !== undefined && value !== null && value !== "")
            .map(([key, value]) => [key, String(value)])
        ),
        android: {
          priority: "high",
          notification: { channelId: ANDROID_NOTIFICATION_CHANNEL_ID }
        }
      })
    )
  );

  const deadTokens = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") return;

    if (DEAD_TOKEN_CODES.includes(result.reason?.code)) {
      deadTokens.push(tokens[index]);
      return;
    }

    logger.error("Seller push rejected by FCM:", userId, result.reason?.code || "", result.reason?.message);
  });

  if (deadTokens.length > 0) {
    await db
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .update({ fcmTokens: FieldValue.arrayRemove(...deadTokens) })
      .catch(() => {});
  }
}

/*
 * Returns whether the in-app notification was saved. A failed push is
 * logged but still counts: the seller sees it on their notifications screen.
 */
export async function notifySellerOfProductReview({ product, status, note }) {
  const sellerId = product?.sellerId || product?.userId;
  const type = PRODUCT_REVIEW_NOTIFICATION_TYPES[status];

  if (!sellerId || !type) {
    logger.warn("Product review notification skipped: no seller or unknown status.", product?.id, status);
    return false;
  }

  const productId = product.id;
  const { title, message } = buildProductReviewMessage({ product, status, note });
  const ref = db.collection(COLLECTIONS.NOTIFICATIONS).doc();

  await ref.set({
    notificationId: ref.id,
    userId: sellerId,
    type,
    audience: "SELLER",
    title,
    message,
    productId,
    reviewNote: note || null,
    data: { productId, status, action: "VIEW_PRODUCT", audience: "SELLER" },
    read: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  await pushToUser(sellerId, {
    title,
    message,
    data: { notificationId: ref.id, audience: "SELLER", type, productId }
  }).catch((error) => logger.error("Seller push failed:", sellerId, error.message));

  return true;
}
