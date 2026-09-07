import {
  db
} from "../config/firebase.js";

import {
  COLLECTIONS
} from "../config/constants.js";

import {
  serializeDoc,
  serializeSnapshot
} from "../utils/formatters.js";


export const sellerService = {

  async getPublicSeller(sellerId) {

    /*
    =====================================================
    USER PROFILE
    =====================================================
    */

    const userRef =
      db
        .collection(
          COLLECTIONS.USERS
        )
        .doc(sellerId);

    const userSnap =
      await userRef.get();


    if (!userSnap.exists) {
      return null;
    }


    const user =
      userSnap.data();


    /*
    =====================================================
    VERIFY SELLER
    =====================================================
    */

    const isSeller =
      user.roles?.seller === true ||
      user.role === "seller" ||
      user.sellerVerified === true;


    if (!isSeller) {
      return null;
    }


    /*
    =====================================================
    SELLER PRODUCTS
    =====================================================
    */

    const productsSnapshot =
      await db
        .collection(
          COLLECTIONS.PRODUCTS
        )
        .where(
          "sellerId",
          "==",
          sellerId
        )
        .where(
          "status",
          "==",
          "active"
        )
        .get();


    const products =
      serializeSnapshot(
        productsSnapshot
      );


    /*
    =====================================================
    PUBLIC PROFILE
    =====================================================
    */

    return {

      id: sellerId,

      name:
        user.name || "",

      email:
        user.email || null,

      phone:
        user.phone || null,

      photoURL:
        user.photoURL || "",

      bio:
        user.bio || "",

      location:
        user.location || "",

      badgeLevel:
        user.badgeLevel || null,

      badgeStatus:
        user.badgeStatus || null,

      sellerBadge:
        user.roles?.sellerBadge ||
        user.sellerBadge ||
        null,

      sellerVerified:
        user.sellerVerified === true,

      sellerRating:
        Number(
          user.sellerRating || 0
        ),

      totalRatings:
        Number(
          user.totalRatings || 0
        ),

      listingsCount:
        Number(
          user.listingsCount ||
          products.length
        ),

      products

    };

  }

};