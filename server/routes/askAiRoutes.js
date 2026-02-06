// routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const aiController = require('../controller/aiController');

// AI Assistant Routes
router.post('/ask', aiController.askAI);
router.get('/quick-stats', aiController.getQuickStats);
router.get('/weekly-summary', aiController.getWeeklySummary);
router.get('/assistant-info', aiController.getAssistantInfo);
router.get('/system-health', aiController.getSystemHealth);

module.exports = router;