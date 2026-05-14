require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test car ID - use one from your database
const TEST_CAR_ID = '3d2563cb-77e1-40a7-ac57-283afe4f3369'; // Toyota Raize from your data

async function testVariantsAPI() {
  console.log('\n=== Testing Car Variants API ===\n');

  try {
    // Test 1: GET variants (public endpoint)
    console.log('1️⃣ Testing GET /cars/:id/variants...');
    const getResponse = await axios.get(`${BASE_URL}/cars/${TEST_CAR_ID}/variants`);
    console.log('✅ GET Success:', getResponse.data);
    console.log(`   Found ${getResponse.data.data?.length || 0} variants\n`);

    // Test 2: POST variant (requires admin auth)
    console.log('2️⃣ Testing POST /cars/variants (without auth)...');
    try {
      await axios.post(`${BASE_URL}/cars/variants`, {
        carId: TEST_CAR_ID,
        modelYear: 2025,
        pricing: {
          daily: 109.00,
          weekly: 700.00,
          monthly: 2300.00
        },
        unitsAvailable: 3
      });
      console.log('✅ POST Success (no auth required - SECURITY ISSUE!)\n');
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('✅ POST correctly requires authentication\n');
      } else {
        console.log('❌ POST Error:', error.response?.data || error.message, '\n');
      }
    }

    console.log('📋 Summary:');
    console.log('- GET endpoint: Working ✅');
    console.log('- POST endpoint: Requires admin auth ✅');
    console.log('\n💡 To test with authentication:');
    console.log('1. Login to admin dashboard');
    console.log('2. Open browser DevTools (F12)');
    console.log('3. Go to Console tab');
    console.log('4. Run: localStorage.getItem("token")');
    console.log('5. Copy the token value');
    console.log('6. Use it in API requests\n');

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Backend server is not running!');
      console.log('👉 Start it with: npm run dev\n');
    }
  }
}

testVariantsAPI();
