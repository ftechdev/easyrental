const express = require("express");
const router = express.Router();
const checkAuthMiddle = require("../middlewares/authMiddleware");
const checkAdmin = require("../middlewares/checkAdmin");
const { getQuickStats } = require("../controller/dashboardController");

// Get dashboard stats (admin)
router.get("/stats", checkAuthMiddle, checkAdmin, getQuickStats);

module.exports = router;
