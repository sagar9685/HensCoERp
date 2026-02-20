const express = require("express");
const router = express.Router();
const askAiController = require("../controller/askAiController");

router.post("/ask", askAiController.askAi);

module.exports = router;
