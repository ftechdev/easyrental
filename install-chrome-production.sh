#!/bin/bash

# Chrome Installation Script for Production Server
# This script installs Chrome/Chromium for Puppeteer in production environments

echo "🔧 Installing Chrome/Chromium for Puppeteer..."

# Update package lists
echo "Updating package lists..."
sudo apt-get update

# Install Chromium browser (lighter alternative to Chrome)
echo "Installing Chromium browser..."
sudo apt-get install -y chromium-browser

# Alternative: Install full Chrome (uncomment if Chromium doesn't work)
# echo "Installing Google Chrome..."
# wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
# echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
# sudo apt-get update
# sudo apt-get install -y google-chrome-stable

# Install additional dependencies that Chrome might need
echo "Installing additional dependencies..."
sudo apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2

# Verify installation
echo "Verifying Chrome/Chromium installation..."
if command -v chromium-browser &> /dev/null; then
    echo "✅ Chromium browser installed successfully at: $(which chromium-browser)"
    chromium-browser --version
elif command -v google-chrome &> /dev/null; then
    echo "✅ Google Chrome installed successfully at: $(which google-chrome)"
    google-chrome --version
else
    echo "❌ Chrome/Chromium installation failed"
    exit 1
fi

# Install Puppeteer browsers as backup
echo "Installing Puppeteer browsers..."
npx puppeteer browsers install chrome

echo "🎉 Chrome/Chromium installation completed!"
echo "You can now restart your Node.js application to use WhatsApp functionality."
