const express = require("express");
const router = express.Router();
console.log("SEO Routes loading...");
const {
  getSeoByPath,
  getAllSeo,
  upsertSeo,
  deleteSeo,
} = require("../controller/seoController");
const checkAdmin = require("../middlewares/checkAdmin");
const checkAuthMiddle = require("../middlewares/authMiddleware");

// Public route to get SEO for a specific path
router.get("/get", getSeoByPath);

// Health check for SEO routes
router.get("/health", (req, res) => res.json({ status: "SEO API is active" }));

// Admin routes
router.get("/getall", checkAuthMiddle, checkAdmin, getAllSeo);
router.post("/save", checkAuthMiddle, checkAdmin, upsertSeo);
router.delete("/delete/:id", checkAuthMiddle, checkAdmin, deleteSeo);

module.exports = router;
