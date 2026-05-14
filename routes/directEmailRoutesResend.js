const express = require("express");
const router = express.Router();
const { Resend } = require("resend");

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Direct POST to /api/email-direct
router.post("/", async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: to, subject, message" 
      });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "RESEND_API_KEY not configured"
      });
    }

    console.log("🚀 Sending email via Resend...");
    
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@alrascars.com',
      to: [to],
      subject: subject,
      html: message,
    });

    if (error) {
      console.error("❌ Resend error:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ Email sent successfully via Resend:", data);
    
    res.json({
      success: true,
      message: "Email sent successfully via Resend",
      data: {
        messageId: data.id,
        to: to,
        subject: subject,
        sentAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("❌ Email error:", error);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Direct Gmail SMTP implementation to bypass any caching issues
router.post("/send-direct", async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: to, subject, message" 
      });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "RESEND_API_KEY not configured"
      });
    }

    console.log("🚀 Sending email via Resend...");
    
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@alrascars.com',
      to: [to],
      subject: subject,
      html: message,
    });

    if (error) {
      console.error("❌ Resend error:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log("✅ Email sent successfully via Resend:", data);
    
    res.json({
      success: true,
      message: "Email sent successfully via Resend",
      data: {
        messageId: data.id,
        to: to,
        subject: subject,
        sentAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("❌ Email error:", error);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
