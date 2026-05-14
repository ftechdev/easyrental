const express = require("express");
const router = express.Router();

// Import the email handler
const customMail = require("../services/Mail/sendInfoMail");

// Define POST route for sending emails
router.post("/", customMail);

module.exports = router;
