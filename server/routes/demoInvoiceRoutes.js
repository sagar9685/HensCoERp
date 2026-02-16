const express = require("express");
const router = express.Router();
const demoInvoice = require("../controller/saveDemoInvoice");

router.post("/demo", demoInvoice.saveDemoInvoice);

module.exports = router;
