const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const uploadExcel = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".xlsx") cb(null, true);
    else cb(new Error("Only Excel (.xlsx) files are allowed"));
  },
});

module.exports = uploadExcel;
