const express = require("express");
const router = express.Router();

const {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
} = require("../controller/noteController");

router.post("/create", createNote);

router.get("/all", getNotes);

router.get("/:id", getNoteById);

router.put("/update", updateNote);

router.delete("/delete/:id", deleteNote);

module.exports = router;
