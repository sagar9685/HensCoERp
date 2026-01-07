const express = require("express");
const router = express.Router();
const areaController = require("../controller/areaController");

router.get("/area", areaController.getAreaName);

module.exports = router;
