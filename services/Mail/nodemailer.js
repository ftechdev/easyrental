const nodemailer = require('nodemailer');

// Create SMTP transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true', // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Gmail-specific optimizations for SSL (port 465)
    tls: {
      rejectUnauthorized: false // Allow self-signed certificates for Gmail
    },
    // Connection pooling for better performance
    pool: true,
    maxConnections: 3, // Conservative for SSL connections
    maxMessages: 50, // Limit messages per connection
    rateDelta: 2000, // 2 seconds between emails for SSL
    rateLimit: 3, // Maximum 3 emails per 2 seconds
    // Additional SSL-specific settings
    socketTimeout: 60000, // 60 seconds socket timeout
    connectionTimeout: 60000, // 60 seconds connection timeout
  });
};

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(' Email sent via SMTP:', info.messageId);
    return info;
  } catch (error) {
    console.error(' Email sending failed:', error.message);
    throw error;
  }
};

// Test SMTP connection
const testConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log(' SMTP connection verified successfully');
    return { success: true };
  } catch (error) {
    console.error(' SMTP connection failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail, testConnection };
