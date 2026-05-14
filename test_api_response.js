require('dotenv').config();
const mysql = require('mysql2/promise');

async function testAPIResponse() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT)
    });

    console.log('🧪 Testing actual API response format...\n');

    // Test the exact query from getCars
    const query = `
      SELECT 
        c.*,
        COALESCE(MIN(cv.daily_rate), c.daily_rate) as daily_rate,
        COALESCE(MIN(cv.weekly_rate), c.weekly_rate) as weekly_rate,
        COALESCE(MIN(cv.monthly_rate), c.monthly_rate) as monthly_rate,
        GROUP_CONCAT(DISTINCT cv.year ORDER BY cv.year SEPARATOR ',') as available_years
      FROM cars c
      LEFT JOIN car_variants cv ON c.id = cv.car_id AND cv.is_available = true
      GROUP BY c.id
    `;
    
    const [rows] = await conn.query(query);
    
    console.log('📊 Raw Database Response:');
    console.log(JSON.stringify(rows[0], null, 2));
    
    console.log('\n🔍 Field Analysis:');
    console.log('Available fields:', Object.keys(rows[0]));
    
    console.log('\n❌ Missing fields that frontend expects:');
    console.log('- carId (backend has: id)');
    console.log('- name (backend has: brand + model)');
    console.log('- image (backend has: main_image)');
    console.log('- gallery (backend has: images)');
    console.log('- pricing (backend has: daily_rate, weekly_rate, monthly_rate)');
    console.log('- categoryName (backend has: category_id)');
    console.log('- seats, doors, luggage (backend has: seats, doors, luggage_capacity)');
    console.log('- engine (backend has: no engine field)');
    console.log('- features (backend has: is_featured)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

testAPIResponse();
