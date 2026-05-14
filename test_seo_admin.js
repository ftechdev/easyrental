require("dotenv").config();
const axios = require('axios');

const baseUrl = 'http://localhost:5000'; // API runs on port 5000

async function testSeoWithAdmin() {
  console.log('🧪 Testing SEO Endpoints with Admin User...\n');
  
  try {
    // Login as admin
    console.log('1. Logging in as admin user...');
    let token;
    try {
      const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
        email: 'dataftech@gmail.com',
        password: 'admin123'
      });
      
      token = loginResponse.data.data.accessToken;
      console.log('✅ Admin login successful');
    } catch (error) {
      console.log('❌ Admin login failed:', error.response?.data || error.message);
      console.log('💡 You may need to reset the password or use correct credentials');
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
    console.log('\n2. Testing getAllSeo with admin auth...');
    try {
      const getAllResponse = await authAxios.get('/api/seo/getall');
      console.log('✅ Get all SEO works, found', getAllResponse.data.data.length, 'records');
    } catch (error) {
      console.log('❌ Get all SEO failed:', error.response?.data || error.message);
    }

    // Test 3: Save SEO with admin auth
    console.log('\n3. Testing save SEO with admin auth...');
    try {
      const saveData = {
        page_path: '/test-page-' + Date.now(),
        title: 'Test Page Title ' + Date.now(),
        description: 'Test description for SEO testing - this should save properly',
        keywords: 'test, keywords, seo, alras cars',
        og_image: 'https://example.com/image.jpg',
        og_type: 'website'
      };
      
      console.log('📝 Saving SEO data:', saveData);
      const saveResponse = await authAxios.post('/api/seo/save', saveData);
      console.log('✅ Save SEO works:', saveResponse.data);
      
      // Test 4: Verify the saved data
      console.log('\n4. Verifying saved SEO data...');
      const verifyResponse = await authAxios.get('/api/seo/getall');
      const savedItem = verifyResponse.data.data.find(item => item.page_path === saveData.page_path);
      if (savedItem) {
        console.log('✅ SEO data saved and verified successfully');
        console.log('📋 Saved item:', savedItem);
      } else {
        console.log('❌ Saved SEO data not found in database');
      }
      
    } catch (error) {
      console.log('❌ Save SEO failed:', error.response?.data || error.message);
      if (error.response) {
        console.log('🔍 Error details:', error.response.data);
      }
    }

    // Test 5: Test update functionality
    console.log('\n5. Testing SEO update...');
    try {
      const updatePath = '/test-update-page';
      const updateData = {
        page_path: updatePath,
        title: 'Initial Test Page Title',
        description: 'Initial test description',
        keywords: 'initial, keywords, seo',
        og_image: 'https://example.com/initial-image.jpg',
        og_type: 'website'
      };
      
      // First save
      await authAxios.post('/api/seo/save', updateData);
      console.log('✅ Initial save for update test successful');
      
      // Update with same path but different data
      const updatedData = { ...updateData, title: 'Final Updated Title', description: 'Final updated description' };
      const updateResponse = await authAxios.post('/api/seo/save', updatedData);
      console.log('✅ SEO update works:', updateResponse.data);
      
      // Verify update
      const verifyUpdate = await authAxios.get('/api/seo/getall');
      const updatedItem = verifyUpdate.data.data.find(item => item.page_path === updatePath);
      if (updatedItem && updatedItem.title === 'Final Updated Title') {
        console.log('✅ SEO update verified successfully');
      } else {
        console.log('❌ SEO update failed - data not updated correctly');
      }
      
    } catch (error) {
      console.log('❌ SEO update failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSeoWithAdmin();
