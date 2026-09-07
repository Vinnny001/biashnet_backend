import {
  sellerService
} from "../services/seller.service.js";

import {
  asyncHandler,
  notFound
} from "../utils/errors.js";


export const sellerController = {

  publicProfile:
    asyncHandler(async (req, res) => {

      const seller =
        await sellerService.getPublicSeller(
          req.params.id
        );


      if (!seller) {
        throw notFound(
          "Seller not found."
        );
      }


      res.json({

        success: true,

        data: seller

      });

    })

};