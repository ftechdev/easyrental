require("dotenv").config();
const axios = require('axios');

const productionUrl = 'https://amirhost.in/easyrental/api';

async function testProductionSeo() {
  console.log('🌐 Testing Production SEO API...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing production health endpoint...');
    try {
      const healthResponse = await axios.get(`${productionUrl}/seo/health`);
      console.log('✅ Production health check:', healthResponse.data);
    } catch (error) {
      console.log('❌ Production health check failed:', error.response?.status || error.message);
    }

    // Test get all SEO (should fail without auth)
    console.log('\n2. Testing production getAllSeo without auth...');
    try {
      const getAllResponse = await axios.get(`${productionUrl}/seo/getall`);
      console.log('❌ Unexpected success (should require auth):', getAllResponse.data);
    } catch (error) {
      console.log('✅ Correctly requires auth:', error.response?.status || error.message);
    }

  } catch (error) {
    console.error('❌ Production test failed:', error.message);
  }
}

testProductionSeo();
