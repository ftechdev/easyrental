const express = require("express");
const router = express.Router();
const checkAuthMiddle = require("../middlewares/authMiddleware");
const cheakAdmin = require("../middlewares/checkAdmin");
const {
  testWhatsApp,
  sendCustomWhatsAppMessage,
  getWhatsAppStatus,
  generateQRCode
} = require("../controller/whatsappTestController");

// Test WhatsApp connection (admin only)
router.get("/test", checkAuthMiddle, cheakAdmin, testWhatsApp);

// Send custom WhatsApp message (admin only)
router.post("/send", checkAuthMiddle, cheakAdmin, sendCustomWhatsAppMessage);

// Get WhatsApp client status (admin only)
router.get("/status", checkAuthMiddle, cheakAdmin, getWhatsAppStatus);

// Generate QR code for WhatsApp authentication (admin only)
router.post("/qr", checkAuthMiddle, cheakAdmin, generateQRCode);

module.exports = router;
