const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controller/purchaseOrderController');

router.post("/", purchaseOrderController.createPurchaseOrder);
router.get("/", purchaseOrderController.getPurchaseOrders);
router.get("/:id", purchaseOrderController.getPurchaseOrderById);
router.delete("/:id", purchaseOrderController.deletePurchaseOrder);

module.exports = router;
