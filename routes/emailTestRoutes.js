const express = require("express");
const router = express.Router();
const { sendBookingToAdmins } = require("../services/adminEmailService");
const { testConnection } = require("../services/Mail/nodemailer");

// Test email service (admin only)
router.post("/test-booking-email", async (req, res) => {
  try {
    // Create a test booking object
    const testBooking = {
      bookingId: 'test-booking-123',
      userName: 'Test Customer',
      userEmail: 'test@example.com',
      userMobile: '+971501234567',
      carName: 'Test Car Model',
      categoryName: 'Economy',
      pickupDate: new Date().toISOString(),
      returnDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      pickupLocationName: 'Test Pickup Location',
      returnLocationName: 'Test Return Location',
      status: 'pending',
      totalAmount: 500,
      createdAt: new Date().toISOString(),
      userId: 'test-user-123'
    };

    console.log('Testing booking email service via SMTP...');
    console.log('Environment check - SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_USER:', process.env.SMTP_USER);

    const result = await sendBookingToAdmins(testBooking);
    
    if (result.success) {
      console.log('Test booking email sent successfully');
      return res.status(200).json({
        success: true,
        message: 'Test booking email sent successfully',
        details: result
      });
    } else {
      console.error('Test booking email failed:', result.message);
      return res.status(500).json({
        success: false,
        message: 'Test booking email failed',
        error: result.message,
        details: result
      });
    }
  } catch (error) {
    console.error('Error testing booking email:', error);
    return res.status(500).json({
      success: false,
      message: 'Error testing booking email',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Check email service configuration
router.get("/check-config", (req, res) => {
  const config = {
    smtpHost: process.env.SMTP_HOST || 'Not configured',
    smtpPort: process.env.SMTP_PORT || 'Not configured',
    smtpSecure: process.env.SMTP_SECURE || 'Not configured',
    smtpUser: process.env.SMTP_USER || 'Not configured',
    smtpFrom: process.env.SMTP_FROM || 'Not configured',
    smtpPassExists: !!process.env.SMTP_PASS,
    nodeEnv: process.env.NODE_ENV || 'development'
  };

  return res.status(200).json({
    success: true,
    message: 'Email service configuration check',
    config
  });
});

// Test SMTP connection
router.post("/test-smtp-connection", async (req, res) => {
  try {
    const result = await testConnection();
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'SMTP connection test successful',
        details: result
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'SMTP connection test failed',
        error: result.error,
        details: result
      });
    }
  } catch (error) {
    console.error('Error testing SMTP connection:', error);
    return res.status(500).json({
      success: false,
      message: 'Error testing SMTP connection',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test Message to Customer email functionality
router.post("/test-message-to-customer", async (req, res) => {
  try {
    const { customerEmail, message, bookingId } = req.body;

    if (!customerEmail || !message) {
      return res.status(400).json({
        success: false,
        message: 'Customer email and message are required'
      });
    }

    const { sendEmail } = require("../services/Mail/nodemailer");
    
    // Generate email template similar to CustomerDetailsSection
    const emailTemplate = `
      <div style="font-family: sans-serif; padding: 16px;">
        <h2>Hello Customer,</h2>
        <p>${message}</p>
        <hr/>
        <small>Booking ID: ${bookingId || 'TEST-123'}</small>
      </div>
    `;

    const subject = `Message about your booking #${bookingId || 'TEST-123'}`;
    
    console.log('Testing Message to Customer via Gmail SMTP...');
    console.log('To:', customerEmail);
    console.log('Subject:', subject);
    
    const result = await sendEmail(customerEmail, subject, emailTemplate);
    
    console.log('Message to Customer sent successfully:', result.messageId);
    
    return res.status(200).json({
      success: true,
      message: 'Test message sent to customer successfully',
      details: {
        messageId: result.messageId,
        to: customerEmail,
        subject: subject
      }
    });

  } catch (error) {
    console.error('Error testing Message to Customer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send test message to customer',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
