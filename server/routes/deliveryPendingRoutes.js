const express = require("express");

const {
  getDeliveryPendingSummary,
  getDeliveryManPendingOrders,
  getPendingOrderItems,
} = require("../controller/deliveryPendingController");

const router = express.Router();

// Delivery boys summary
router.get("/summary", getDeliveryPendingSummary);

// Specific delivery boy pending orders
router.get("/:deliveryManId/orders", getDeliveryManPendingOrders);

// Specific order items
router.get("/order/:orderId/items", getPendingOrderItems);

module.exports = router;
