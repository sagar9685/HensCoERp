const express = require("express");
const router = express.Router();
const areaController = require("../controller/areaController");
const uploadExcel = require("../middleware/upload");

router.get("/area", areaController.getAreaName);

router.post(
  "/area/import",
  uploadExcel.single("file"),
  areaController.importAreaExcel
);

module.exports = router;
