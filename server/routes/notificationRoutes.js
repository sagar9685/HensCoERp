const express = require("express");
const router = express.Router();
const notificationController = require("../controller/notificationController");

router.get("/notifications", notificationController.getNotifications);
router.delete("/notifications/:id", notificationController.readNotification);
module.exports = router;
