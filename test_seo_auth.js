require("dotenv").config();
const axios = require('axios');

const baseUrl = 'http://localhost:5000'; // API runs on port 5000

async function testSeoWithAuth() {
  console.log('🧪 Testing SEO Endpoints with Authentication...\n');
  
  try {
    // First, login to get a token
    console.log('1. Logging in to get auth token...');
    let token;
    try {
      const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
        email: 'admin@example.com', // You'll need to use actual admin credentials
        password: 'admin123'
      });
      
      token = loginResponse.data.data.accessToken;
      console.log('✅ Login successful, got token');
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data || error.message);
      console.log('⚠️  You may need to create an admin user first or use existing credentials');
      return;
    }

    // Create authenticated axios instance
    const authAxios = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Test 2: Get all SEO with auth
    console.log('\n2. Testing getAllSeo with auth...');
    try {
      const getAllResponse = await authAxios.get('/api/seo/getall');
      console.log('✅ Get all SEO works:', getAllResponse.data);
    } catch (error) {
      console.log('❌ Get all SEO failed:', error.response?.data || error.message);
    }

    // Test 3: Save SEO with auth
    console.log('\n3. Testing save SEO with auth...');
    try {
      const saveData = {
        page_path: '/test-page-' + Date.now(),
        title: 'Test Page Title ' + Date.now(),
        description: 'Test description for SEO testing',
        keywords: 'test, keywords, seo',
        og_image: 'https://example.com/image.jpg',
        og_type: 'website'
      };
      
      const saveResponse = await authAxios.post('/api/seo/save', saveData);
      console.log('✅ Save SEO works:', saveResponse.data);
      
      // Test 4: Verify the saved data
      console.log('\n4. Verifying saved SEO data...');
      const verifyResponse = await authAxios.get('/api/seo/getall');
      const savedItem = verifyResponse.data.data.find(item => item.page_path === saveData.page_path);
      if (savedItem) {
        console.log('✅ SEO data saved and verified successfully:', savedItem);
      } else {
        console.log('❌ Saved SEO data not found in database');
      }
      
    } catch (error) {
      console.log('❌ Save SEO failed:', error.response?.data || error.message);
    }

    // Test 5: Test update functionality
    console.log('\n5. Testing SEO update...');
    try {
      const updateData = {
        page_path: '/test-page-update',
        title: 'Updated Test Page Title',
        description: 'Updated test description',
        keywords: 'updated, keywords, seo',
        og_image: 'https://example.com/updated-image.jpg',
        og_type: 'website'
      };
      
      // First save
      await authAxios.post('/api/seo/save', updateData);
      console.log('✅ Initial save for update test successful');
      
      // Update with same path but different data
      const updatedData = { ...updateData, title: 'Final Updated Title', description: 'Final updated description' };
      const updateResponse = await authAxios.post('/api/seo/save', updatedData);
      console.log('✅ SEO update works:', updateResponse.data);
      
    } catch (error) {
      console.log('❌ SEO update failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSeoWithAuth();
