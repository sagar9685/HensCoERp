// routes/aiRoutes.js
const express = require("express");
const router = express.Router();
const aiController = require("../controller/aiController");

// AI Assistant Routes
router.post("/ask-ai", aiController.askAI);
router.get("/quick-stats", aiController.getQuickStats);
router.get("/assistant-info", aiController.getAssistantInfo);

module.exports = router;