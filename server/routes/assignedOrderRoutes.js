const express = require("express");
const router = express.Router();
const assignedOrderController = require("../controller/assignedOrderController");

// Create assignment
router.post("/assign-order", assignedOrderController.assignOrder);

// Get all assignments
router.get("/assigned-orders", assignedOrderController.getAssignedOrders);

// Update assignment
router.put("/assigned-orders/:id", assignedOrderController.updateAssignedOrder);

router.put(
  "/assigned-orders/:id/status",
  assignedOrderController.updateDeliveryStatus
);

module.exports = router;
