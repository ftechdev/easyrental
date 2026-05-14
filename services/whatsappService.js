const { client, config, isValid, initializeClient, getClientStatus } = require('../config/whatsapp');

/**
 * Format booking details for WhatsApp message
 * @param {Object} bookingData - Booking information
 * @returns {string} Formatted WhatsApp message
 */
const formatBookingMessage = (bookingData) => {
  const {
    bookingId,
    userName,
    userEmail,
    userMobile,
    carName,
    pickupDate,
    returnDate,
    pickupLocationName,
    returnLocationName,
    totalPrice,
    status,
    paymentStatus,
    modelYear,
    additionalDriver,
    cdwSunny,
    insurance,
    addOnCharges,
    pickupDeliveryCost,
    returnDeliveryCost
  } = bookingData;

  // Calculate VAT and breakdown
  const deliveryCost = (pickupDeliveryCost || 0) + (returnDeliveryCost || 0);
  const subtotal = (totalPrice || 0) - (addOnCharges || 0) - deliveryCost;
  const vatOnSubtotal = subtotal * 0.05;
  const vatOnAddOnCharges = (addOnCharges || 0) * 0.05;
  const totalVat = vatOnSubtotal + vatOnAddOnCharges;

  const message = `*New Car Booking Received* 

*Booking ID:* ${bookingId}
*Customer:* ${userName}${userEmail ? ` (${userEmail})` : ''}${userMobile ? ` - ${userMobile}` : ''}

*Vehicle Details:*
- Car: ${carName}${modelYear ? ` (${modelYear})` : ''}
- Pickup: ${pickupLocationName || 'Not specified'}
- Return: ${returnLocationName || 'Not specified'}
- Pickup Date: ${pickupDate ? new Date(pickupDate).toLocaleDateString() : 'Not specified'}
- Return Date: ${returnDate ? new Date(returnDate).toLocaleDateString() : 'Not specified'}

*Pricing:*
- Base Rental: AED ${subtotal.toFixed(2)}
${deliveryCost > 0 ? `- Delivery Fees: AED ${deliveryCost.toFixed(2)}` : ''}
${addOnCharges > 0 ? `- Additional Services: AED ${(addOnCharges || 0).toFixed(2)}` : ''}
- VAT (5%): AED ${totalVat.toFixed(2)}
- **Total Price (incl. VAT): AED ${(totalPrice || 0).toFixed(2)}**
- Status: ${status || 'Pending'}
- Payment: ${paymentStatus || 'Pending'}

*Additional Services:*
${additionalDriver ? 'Additional Driver: Yes' : 'Additional Driver: No'}
${cdwSunny ? 'CDW/Sunny: Yes' : 'CDW/Sunny: No'}
${insurance ? 'Insurance: Yes' : 'Insurance: No'}

*Time:* ${new Date().toLocaleString()}

Please review and process this booking accordingly.`;

  return message;
};

/**
 * Ensure WhatsApp client is ready
 * @returns {Promise<Object>} Client status
 */
const ensureClientReady = async () => {
  try {
    if (!client) {
      console.log('Initializing WhatsApp client...');
      await initializeClient();
    }

    const status = getClientStatus();
    
    if (!status.isReady) {
      console.log('WhatsApp client not ready, waiting...');
      // Wait up to 30 seconds for client to be ready
      let attempts = 0;
      while (!status.isReady && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        const currentStatus = getClientStatus();
        if (currentStatus.isReady) break;
      }
      
      if (!getClientStatus().isReady) {
        return { success: false, error: 'WhatsApp client not ready after waiting' };
      }
    }

    return { success: true, client };
    
  } catch (error) {
    console.error('Error ensuring WhatsApp client is ready:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send WhatsApp message with retry mechanism
 * @param {string} to - Recipient phone number (with country code)
 * @param {string} message - Message content
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<Object>} Send result
 */
const sendWhatsAppMessage = async (to, message, retries = 3) => {
  if (!isValid) {
    console.warn('WhatsApp service not configured - skipping message');
    return { success: false, error: 'WhatsApp service not configured' };
  }

  // Ensure client is ready
  const clientReady = await ensureClientReady();
  if (!clientReady.success) {
    return { success: false, error: clientReady.error };
  }

  // Format phone number (remove non-digits, ensure country code)
  const formattedNumber = to.replace(/[^\d]/g, '');
  const targetNumber = formattedNumber.startsWith('971') ? `${formattedNumber}@c.us` : `971${formattedNumber}@c.us`;

  let attempt = 0;
  
  while (attempt < retries) {
    attempt++;
    try {
      console.log(`Attempt ${attempt}/${retries} - Sending WhatsApp message to ${targetNumber}`);
      
      const result = await client.sendMessage(targetNumber, message);

      console.log('WhatsApp message sent successfully:', result.id._serialized);
      return { 
        success: true, 
        messageId: result.id._serialized,
        status: 'sent',
        attempt: attempt
      };
      
    } catch (error) {
      console.error(`WhatsApp send attempt ${attempt} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.message.includes('not a WhatsApp user') || 
          error.message.includes('phone number not registered') ||
          error.message.includes('Number not found')) {
        return { 
          success: false, 
          error: `Invalid phone number: ${error.message}`,
          code: 'INVALID_NUMBER'
        };
      }

      // If this is the last attempt, return the error
      if (attempt === retries) {
        return { 
          success: false, 
          error: error.message,
          code: 'SEND_FAILED',
          attempts: attempt
        };
      }

      // Wait before retry (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

/**
 * Send booking notification to WhatsApp
 * @param {Object} bookingData - Booking information
 * @returns {Promise<Object>} Send result
 */
const sendBookingNotification = async (bookingData) => {
  try {
    const targetNumber = config.targetNumber || '+97167475354';
    const message = formatBookingMessage(bookingData);
    
    console.log('Sending booking notification to WhatsApp...');
    const result = await sendWhatsAppMessage(targetNumber, message);
    
    if (result.success) {
      console.log('WhatsApp booking notification sent successfully');
    } else {
      console.warn('Failed to send WhatsApp booking notification:', result.error);
    }
    
    return result;
    
  } catch (error) {
    console.error('Error sending WhatsApp booking notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send custom WhatsApp message
 * @param {string} message - Custom message content
 * @param {string} to - Optional recipient number (uses default if not provided)
 * @returns {Promise<Object>} Send result
 */
const sendCustomMessage = async (message, to = null) => {
  try {
    const targetNumber = to || config.targetNumber || '+97167475354';
    const result = await sendWhatsAppMessage(targetNumber, message);
    
    if (result.success) {
      console.log('Custom WhatsApp message sent successfully');
    } else {
      console.warn('Failed to send custom WhatsApp message:', result.error);
    }
    
    return result;
    
  } catch (error) {
    console.error('Error sending custom WhatsApp message:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test WhatsApp connectivity
 * @returns {Promise<Object>} Test result
 */
const testWhatsAppConnection = async () => {
  try {
    if (!isValid) {
      return { success: false, error: 'WhatsApp service not configured' };
    }

    const targetNumber = config.targetNumber || '+97167475354';
    const testMessage = `*WhatsApp Test Message*

This is a test message from Alras Cars Booking System.
Sent at: ${new Date().toLocaleString()}

If you receive this message, WhatsApp integration is working correctly!`;

    const result = await sendWhatsAppMessage(targetNumber, testMessage);
    
    return {
      success: result.success,
      message: result.success ? 'WhatsApp test successful' : 'WhatsApp test failed',
      details: result
    };
    
  } catch (error) {
    console.error('Error testing WhatsApp connection:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get WhatsApp client status
 * @returns {Object} Client status information
 */
const getWhatsAppStatus = () => {
  return getClientStatus();
};

/**
 * Generate QR code for WhatsApp authentication
 * @returns {Promise<Object>} QR code generation result
 */
const generateQRCode = async () => {
  try {
    if (!isValid) {
      return { success: false, error: 'WhatsApp service not configured' };
    }

    const status = getClientStatus();
    
    if (status.isReady) {
      return { success: true, message: 'WhatsApp client is already ready', qrRequired: false };
    }

    // Force QR code generation by reinitializing client
    await initializeClient();
    
    return { 
      success: true, 
      message: 'QR code generation initiated',
      qrRequired: true,
      status: getClientStatus()
    };
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendBookingNotification,
  sendCustomMessage,
  sendWhatsAppMessage,
  testWhatsAppConnection,
  formatBookingMessage,
  getWhatsAppStatus,
  generateQRCode
};
