const express = require("express");
const router = express.Router();

const ai = require("../controller/askAiController");
const { protect } = require("../middleware/authMiddleware");

router.post("/ask", protect, ai.askAi);

module.exports = router;
