const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');

const whatsappConfig = {
  targetNumber: process.env.WHATSAPP_TARGET_NUMBER || '+97167475354',
  sessionPath: process.env.WHATSAPP_SESSION_PATH || path.join(__dirname, '../.wwebjs_auth'),
  enableQR: process.env.WHATSAPP_ENABLE_QR === 'true'
};

// WhatsApp client instance
let client = null;
let isReady = false;
let qrCodeGenerated = false;

// Initialize WhatsApp client
const initializeClient = async () => {
  if (client) {
    return client;
  }

  try {
    console.log('Initializing WhatsApp Web client...');
    
    // Puppeteer configuration for production hosting
    const puppeteerConfig = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    };

    // Add executable path for production environment if needed
    if (process.env.NODE_ENV === 'production') {
      // Try to find Chrome in common locations
      const possibleChromePaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/snap/bin/chromium',
        '/usr/local/bin/chrome',
        '/usr/local/bin/chromium'
      ];
      
      const fs = require('fs');
      for (const chromePath of possibleChromePaths) {
        if (fs.existsSync(chromePath)) {
          puppeteerConfig.executablePath = chromePath;
          console.log(`Using Chrome at: ${chromePath}`);
          break;
        }
      }
    }

    client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'alras-cars-booking',
        dataPath: whatsappConfig.sessionPath
      }),
      puppeteer: puppeteerConfig
    });

    // QR Code generation for first-time setup
    client.on('qr', (qr) => {
      console.log('QR Code received for WhatsApp authentication');
      console.log('Please scan this QR code with WhatsApp:');
      qrcode.generate(qr, { small: true });
      qrCodeGenerated = true;
      
      // Also save QR code to file for easier access
      const fs = require('fs');
      const qrFilePath = path.join(__dirname, '../whatsapp-qr.txt');
      fs.writeFileSync(qrFilePath, qr);
      console.log(`QR code also saved to: ${qrFilePath}`);
    });

    // Client ready event
    client.on('ready', () => {
      console.log('WhatsApp client is ready!');
      isReady = true;
      qrCodeGenerated = false;
    });

    // Client authentication failure
    client.on('auth_failure', (msg) => {
      console.error('WhatsApp authentication failed:', msg);
      isReady = false;
    });

    // Client disconnected
    client.on('disconnected', (reason) => {
      console.log('WhatsApp client disconnected:', reason);
      isReady = false;
    });

    // Remote session saved
    client.on('remote_session_saved', () => {
      console.log('WhatsApp remote session saved successfully');
    });

    // Initialize the client
    await client.initialize();
    
    return client;
    
  } catch (error) {
    console.error('Failed to initialize WhatsApp client:', error.message);
    throw error;
  }
};

// Validate configuration
const validateConfig = () => {
  if (!whatsappConfig.targetNumber) {
    console.warn('WhatsApp target number not configured');
    return false;
  }
  return true;
};

// Get client status
const getClientStatus = () => ({
  isReady,
  qrCodeGenerated,
  targetNumber: whatsappConfig.targetNumber,
  sessionPath: whatsappConfig.sessionPath
});

// Auto-initialize if not in test environment
if (process.env.NODE_ENV !== 'test') {
  initializeClient().catch(err => {
    console.warn('Failed to auto-initialize WhatsApp client:', err.message);
  });
}

module.exports = {
  client,
  config: whatsappConfig,
  isValid: validateConfig(),
  initializeClient,
  getClientStatus
};
