#!/usr/bin/env node

/**
 * Test script for Gmail App SMTP configuration
 * Run this script to verify your Gmail SMTP setup
 */

require('dotenv').config();
const { sendEmail, testConnection } = require('./services/Mail/nodemailer');

async function testGmailSMTP() {
  console.log('🔧 Testing Gmail App SMTP Configuration...\n');

  // Check environment variables
  console.log('📋 Configuration Check:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST || '❌ Not set');
  console.log('SMTP_PORT:', process.env.SMTP_PORT || '❌ Not set');
  console.log('SMTP_SECURE:', process.env.SMTP_SECURE || '❌ Not set');
  console.log('SMTP_USER:', process.env.SMTP_USER ? `✅ ${process.env.SMTP_USER}` : '❌ Not set');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set' : '❌ Not set');
  console.log('SMTP_FROM:', process.env.SMTP_FROM || '❌ Not set');
  console.log('');
  
  // Validate configuration
  if (process.env.SMTP_HOST === 'smtp.gmail.com' && process.env.SMTP_PORT === '465') {
    console.log('🔒 Using Gmail with SSL (port 465) - Production configuration detected');
  } else if (process.env.SMTP_HOST === 'smtp.gmail.com' && process.env.SMTP_PORT === '587') {
    console.log('🔓 Using Gmail with STARTTLS (port 587) - Development configuration');
  }
  console.log('');

  // Test connection
  console.log('🔌 Testing SMTP Connection...');
  try {
    const connectionResult = await testConnection();
    if (connectionResult.success) {
      console.log('✅ SMTP connection successful!');
    } else {
      console.log('❌ SMTP connection failed:', connectionResult.error);
      return;
    }
  } catch (error) {
    console.log('❌ Connection test error:', error.message);
    return;
  }

  // Test sending email
  console.log('\n📧 Testing Email Sending...');
  const testEmail = process.argv[2] || 'test@example.com';
  
  const emailTemplate = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
        <h1 style="color: #333; margin-bottom: 10px;">Alras Cars</h1>
        <p style="color: #666; margin: 0;">Test Email from Gmail App SMTP</p>
      </div>
      
      <div style="padding: 20px; background: white;">
        <h2 style="color: #333; margin-bottom: 15px;">Hello Customer!</h2>
        <p style="color: #666; line-height: 1.6;">
          This is a test message from the Alras Cars admin system using Gmail App SMTP.
        </p>
        <p style="color: #666; line-height: 1.6;">
          If you receive this email, the Gmail App SMTP configuration is working correctly.
        </p>
        
        <div style="background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #495057;">
            <strong>Booking ID:</strong> TEST-123<br>
            <strong>Sent at:</strong> ${new Date().toLocaleString()}<br>
            <strong>System:</strong> Gmail App SMTP
          </p>
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>This is an automated test message from Alras Cars</p>
      </div>
    </div>
  `;

  try {
    const result = await sendEmail(
      testEmail,
      'Alras Cars - Gmail App SMTP Test',
      emailTemplate
    );
    
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📨 To:', testEmail);
    console.log('🕐 Sent at:', new Date().toLocaleString());
    
  } catch (error) {
    console.log('❌ Email sending failed:', error.message);
    
    // Provide specific troubleshooting advice
    if (error.message.includes('535')) {
      console.log('\n💡 Troubleshooting:');
      console.log('- Check if 2FA is enabled on your Gmail account');
      console.log('- Generate a new App Password');
      console.log('- Ensure no spaces in the app password');
    } else if (error.message.includes('ETIMEDOUT')) {
      console.log('\n💡 Troubleshooting:');
      console.log('- Check internet connection');
      console.log('- Verify firewall settings');
      console.log('- Try switching to port 465 with SMTP_SECURE=true');
    }
  }
}

// Run the test
if (require.main === module) {
  testGmailSMTP().catch(console.error);
}

module.exports = { testGmailSMTP };
