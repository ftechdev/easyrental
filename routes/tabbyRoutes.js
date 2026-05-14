const express = require("express");
const router = express.Router();
const { createCheckoutSession } = require("../controller/tabbyController");

router.post("/create-tabby-session", createCheckoutSession);

module.exports = router;
