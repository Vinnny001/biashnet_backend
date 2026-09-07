import {
  Router
} from "express";

import {
  sellerController
} from "../controllers/seller.controller.js";


const router = Router();


/*
=========================================================
PUBLIC SELLER PROFILE
=========================================================

GET /api/sellers/:id

No authentication required.

Anyone can view a seller's public shop.
=========================================================
*/

router.get(
  "/:id",
  sellerController.publicProfile
);


export default router;