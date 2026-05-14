require("dotenv").config();
const axios = require('axios');

const baseUrl = 'http://localhost:5000'; // API runs on port 5000

async function testSeoEndpoints() {
  console.log('🧪 Testing SEO Endpoints...\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${baseUrl}/api/seo/health`);
      console.log('✅ Health check:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      return;
    }

    // Test 2: Get all SEO (should fail without auth)
    console.log('\n2. Testing getAllSeo without auth...');
    try {
      const getAllResponse = await axios.get(`${baseUrl}/api/seo/getall`);
      console.log('❌ Unexpected success (should require auth):', getAllResponse.data);
    } catch (error) {
      console.log('✅ Correctly requires auth:', error.response?.status || error.message);
    }

    // Test 3: Save SEO without auth (should fail)
    console.log('\n3. Testing save SEO without auth...');
    try {
      const saveData = {
        page_path: '/test-page',
        title: 'Test Page Title',
        description: 'Test description',
        keywords: 'test, keywords',
        og_image: '',
        og_type: 'website'
      };
      const saveResponse = await axios.post(`${baseUrl}/api/seo/save`, saveData);
      console.log('❌ Unexpected success (should require auth):', saveResponse.data);
    } catch (error) {
      console.log('✅ Correctly requires auth:', error.response?.status || error.message);
    }

    // Test 4: Get SEO by path (public endpoint)
    console.log('\n4. Testing getSeoByPath (public endpoint)...');
    try {
      const getByPathResponse = await axios.get(`${baseUrl}/api/seo/get?path=/test-page`);
      console.log('✅ Get by path works:', getByPathResponse.data);
    } catch (error) {
      console.log('❌ Get by path failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSeoEndpoints();
