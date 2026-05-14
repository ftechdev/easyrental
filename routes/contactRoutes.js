const express = require("express");
const router = express.Router();
const {
  createContactMessage,
  getContactMessages,
  updateContactMessageStatus,
  deleteContactMessage,
} = require("../controller/contactController");
const chekAuthMiddleware = require("../middlewares/authMiddleware");
const isAdmin = require("../middlewares/checkAdmin");

// POST route to create a new contact message
router.post("/add", createContactMessage);

// GET route to fetch all contact messages (admin only)
router.get("/get", chekAuthMiddleware, isAdmin, getContactMessages);

// PUT route to update the status of a contact message
router.put(
  "/updateStatus/:id",
  chekAuthMiddleware,
  isAdmin,
  updateContactMessageStatus
);
router.delete("/delete/:id", chekAuthMiddleware, isAdmin, deleteContactMessage);

module.exports = router;
