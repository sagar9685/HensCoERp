const express = require("express");
const router = express.Router();
const aiController = require("../controller/aiController");

// Postman: POST http://localhost:5005/api/ask-ai
router.post("/ask-ai", aiController.askAI);

// Note: Agar aapne controller se ye functions hata diye hain, 
// toh unhe wapas add karna hoga ya ye routes delete karne honge.
if(aiController.getQuickStats) {
    router.get("/quick-stats", aiController.getQuickStats);
}
if(aiController.getAssistantInfo) {
    router.get("/assistant-info", aiController.getAssistantInfo);
}

module.exports = router;