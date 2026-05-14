# Direct WhatsApp Integration Setup Guide

This guide will help you set up WhatsApp notifications for car bookings using direct WhatsApp Web integration (no Twilio required).

## Overview
When a user books a car for rent, the booking details will be automatically sent to the configured WhatsApp number (+971559254955) using WhatsApp Web API.

## Prerequisites
1. Node.js environment with the Easy Rental API
2. WhatsApp account (for authentication)
3. Server with internet access (for WhatsApp Web connection)

## Step 1: Configure Environment Variables

Add the following to your `.env` file:

```bash
# Direct WhatsApp Configuration
WHATSAPP_TARGET_NUMBER=+971559254955 # Default recipient for booking notifications
WHATSAPP_SESSION_PATH=./.wwebjs_auth # Path to store WhatsApp session files
WHATSAPP_ENABLE_QR=true # Enable QR code generation for authentication
```

**Important:**
- The target number is already set to +971559254955 as requested
- Session path will store authentication data automatically
- QR code generation is needed for first-time setup

## Step 2: First-Time Authentication

When you start the server for the first time, WhatsApp will require authentication:

1. **Check WhatsApp Status** (Optional):
   ```
   GET /api/whatsapp/status
   ```
   (Requires admin authentication)

2. **Generate QR Code** (If needed):
   ```
   POST /api/whatsapp/qr
   ```
   (Requires admin authentication)

3. **Scan QR Code**:
   - The QR code will be displayed in the server console
   - Open WhatsApp on your phone
   - Go to Settings > Linked Devices
   - Scan the QR code with your phone

4. **Wait for Connection**:
   - The server will automatically connect after scanning
   - Session data will be saved for future use

## Step 3: Test the Integration

### Option 1: Check WhatsApp Status
Send a GET request to:
```
GET /api/whatsapp/status
```
(Requires admin authentication)
This will show if WhatsApp is connected and ready.

### Option 2: Send Test Message
Send a GET request to:
```
GET /api/whatsapp/test
```
(Requires admin authentication)

### Option 3: Send Custom Message
Send a POST request to:
```
POST /api/whatsapp/send
Content-Type: application/json

{
  "message": "Test message from Alras Cars Booking System",
  "to": "+971559254955" // Optional - uses default if not provided
}
```
(Requires admin authentication)

## Step 5: Verify Booking Notifications

After setup is complete, every new booking will automatically send a WhatsApp message containing:
- Booking ID
- Customer details (name, email, phone)
- Vehicle information
- Pickup/return details
- Pricing information
- Additional services
- Timestamp

## Message Format Example

```
*New Car Booking Received*

*Booking ID:* abc123-def456-ghi789
*Customer:* John Doe (john@example.com) - +9715012345678

*Vehicle Details:*
- Car: Toyota Camry (2023)
- Pickup: Dubai Airport
- Return: Dubai Mall
- Pickup Date: 15/04/2026
- Return Date: 18/04/2026

*Pricing:*
- Total Amount: AED 450
- Status: Pending
- Payment: Pending

*Additional Services:*
Additional Driver: Yes
CDW/Sunny: No
Insurance: Yes

*Time:* 16/04/2026, 11:00:00 AM

Please review and process this booking accordingly.
```

## Troubleshooting

### Common Issues

1. **"WhatsApp client not ready"**
   - Check if you've scanned the QR code
   - Use `/api/whatsapp/status` to check connection status
   - Restart the server and scan QR code again if needed

2. **"QR code not generated"**
   - Ensure WHATSAPP_ENABLE_QR=true in your .env
   - Use `/api/whatsapp/qr` endpoint to force QR generation
   - Check server console for QR code display

3. **"Invalid phone number"**
   - Ensure phone numbers are in E.164 format (+countrycode number)
   - The target number should include the country code (971 for UAE)

4. **"WhatsApp authentication failed"**
   - The QR code might have expired
   - Generate a new QR code and scan again
   - Check your internet connection

5. **"Connection lost"**
   - WhatsApp Web sessions can expire
   - Re-authenticate by generating a new QR code
   - Check server logs for disconnection reasons

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=true
```

This will provide detailed logs about WhatsApp connection and message sending attempts.

### Session Management

- WhatsApp sessions are stored in `./.wwebjs_auth/` directory
- Sessions persist between server restarts
- Delete the session directory to force re-authentication
- Backup the session directory for quick recovery

## Security Notes

- WhatsApp sessions contain sensitive authentication data
- The WhatsApp endpoints are protected with admin authentication
- Rate limiting is implemented to prevent abuse
- Failed messages are logged but don't break the booking process
- Never commit session files to version control

## Costs

- **FREE** - Direct WhatsApp integration uses WhatsApp Web API
- No per-message charges (unlike Twilio)
- Only requires standard WhatsApp account
- Subject to WhatsApp's usage policies and rate limits

## Support

If you encounter issues:
1. Check the server logs for detailed error messages
2. Use `/api/whatsapp/status` to check connection status
3. Re-authenticate with QR code if connection is lost
4. Test with the test endpoints first
5. Ensure your phone has WhatsApp installed and internet connection

## Features Included

- **No Third-Party Costs**: Direct WhatsApp integration (no Twilio fees)
- **Automatic Authentication**: QR code-based setup
- **Session Persistence**: Re-authentication only needed when expired
- **Automatic Retry**: Built-in retry mechanism for failed messages
- **Graceful Fallback**: Booking process continues if WhatsApp fails
- **Detailed Logging**: Comprehensive error tracking
- **Test Endpoints**: Multiple endpoints for verification
- **Status Monitoring**: Real-time connection status checking
- **Admin Protection**: All WhatsApp endpoints require admin authentication
- **Seamless Integration**: Works with existing booking flow
