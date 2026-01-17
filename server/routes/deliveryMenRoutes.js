const express = require("express");
const router = express.Router();
const deliveryController = require("../controller/deliveryMenController");

router.get("/delivery-men", deliveryController.getDeliveryMen);
router.post("/delivery-men", deliveryController.addDeliveryMan);
router.get("/cash", deliveryController.getDeliveryMenCash);
router.get(
  "/cash/pending/:deliveryManId",
  deliveryController.getDeliveryManPendingCashOrders
);

router.post("/allByDay",deliveryController.getDeliverySummaryByDateAndBoy)


module.exports = router;
