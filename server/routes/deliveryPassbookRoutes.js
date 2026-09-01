const express = require("express");

const router = express.Router();

const {
  getDeliveryCashAccounts,
  getDeliveryBoyPassbook,
} = require("../controller/deliveryPassbookController");

// All delivery boys + their current cash balance
router.get("/", getDeliveryCashAccounts);

// Particular delivery boy passbook
router.get("/:deliveryManId", getDeliveryBoyPassbook);

module.exports = router;
