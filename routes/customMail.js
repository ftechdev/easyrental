const express = require("express");
const router = express.Router();
const customMail = require("../services/Mail/sendInfoMail");
const checkAuth = require("../middlewares/authMiddleware");
const checkAdmin = require("../middlewares/checkAdmin");

router.post("/send", checkAuth, checkAdmin, customMail);

module.exports = router;
