const { testWhatsAppConnection, sendCustomMessage, getWhatsAppStatus, generateQRCode } = require('../services/whatsappService');

/**
 * Test WhatsApp connection and send a test message
 */
exports.testWhatsApp = async (req, res) => {
  try {
    console.log('Testing WhatsApp connection...');
    
    const result = await testWhatsAppConnection();
    
    if (result.success) {
      console.log('WhatsApp test successful');
      return res.status(200).json({
        success: true,
        message: 'WhatsApp test successful - message sent to configured number',
        details: result.details
      });
    } else {
      console.error('WhatsApp test failed:', result.error);
      return res.status(500).json({
        success: false,
        message: 'WhatsApp test failed',
        error: result.error,
        details: result.details
      });
    }
    
  } catch (error) {
    console.error('Error in WhatsApp test endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during WhatsApp test',
      error: error.message
    });
  }
};

/**
 * Send custom WhatsApp message
 */
exports.sendCustomWhatsAppMessage = async (req, res) => {
  try {
    const { message, to } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }
    
    console.log('Sending custom WhatsApp message...');
    
    const result = await sendCustomMessage(message, to);
    
    if (result.success) {
      console.log('Custom WhatsApp message sent successfully');
      return res.status(200).json({
        success: true,
        message: 'WhatsApp message sent successfully',
        messageId: result.messageId,
        status: result.status
      });
    } else {
      console.error('Failed to send custom WhatsApp message:', result.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send WhatsApp message',
        error: result.error,
        code: result.code
      });
    }
    
  } catch (error) {
    console.error('Error sending custom WhatsApp message:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while sending WhatsApp message',
      error: error.message
    });
  }
};

/**
 * Get WhatsApp client status
 */
exports.getWhatsAppStatus = async (req, res) => {
  try {
    const status = getWhatsAppStatus();
    
    return res.status(200).json({
      success: true,
      message: 'WhatsApp status retrieved successfully',
      data: status
    });
    
  } catch (error) {
    console.error('Error getting WhatsApp status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while getting WhatsApp status',
      error: error.message
    });
  }
};

/**
 * Generate QR code for WhatsApp authentication
 */
exports.generateQRCode = async (req, res) => {
  try {
    console.log('Generating QR code for WhatsApp authentication...');
    
    const result = await generateQRCode();
    
    if (result.success) {
      console.log('QR code generation initiated successfully');
      return res.status(200).json({
        success: true,
        message: result.message,
        qrRequired: result.qrRequired,
        status: result.status
      });
    } else {
      console.error('Failed to generate QR code:', result.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate QR code',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while generating QR code',
      error: error.message
    });
  }
};
