#!/bin/bash

# SEO API Deployment Script
# This script helps deploy the SEO endpoints to production

echo "🚀 SEO API Deployment Script"
echo "=========================="

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js not found. Please run this from the API root directory."
    exit 1
fi

# Check if SEO routes exist
if [ ! -f "routes/seoRoutes.js" ]; then
    echo "❌ Error: SEO routes not found."
    exit 1
fi

echo "✅ API files verified"

# Test SEO endpoints locally first
echo "🧪 Testing SEO endpoints locally..."

# Start the server in background
npm start &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s http://localhost:5000/api/seo/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Health endpoint working"
else
    echo "❌ Health endpoint failed"
    kill $SERVER_PID
    exit 1
fi

# Kill the test server
kill $SERVER_PID

echo "✅ Local tests passed"

# Deployment instructions
echo ""
echo "📋 Deployment Instructions:"
echo "=========================="
echo ""
echo "To deploy SEO functionality to production:"
echo ""
echo "1. Upload the latest API code to your production server"
echo "2. Ensure the following files are included:"
echo "   - routes/seoRoutes.js"
echo "   - controller/seoController.js"
echo "   - scripts/createSeoTable.js (run once to create table)"
echo "   - Updated server.js (includes SEO routes)"
echo ""
echo "3. On production server, run:"
echo "   npm install"
echo "   node scripts/createSeoTable.js"
echo "   npm start"
echo ""
echo "4. Test production endpoints:"
echo "   curl https://your-domain.com/api/seo/health"
echo ""
echo "5. Update frontend .env file to use production URL:"
echo "   VITE_API_BASE_URL=https://your-domain.com/api/"
echo ""

read -p "Press Enter to continue or Ctrl+C to exit..."

echo "🎯 Ready for deployment!"
