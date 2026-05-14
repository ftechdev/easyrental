require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkCarsWithVariants() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    console.log('\n=== Cars with Year Variants ===\n');

    const [results] = await pool.query(`
      SELECT 
        c.id as car_id,
        c.name as car_name,
        COUNT(cv.id) as variant_count,
        GROUP_CONCAT(cv.model_year ORDER BY cv.model_year) as years
      FROM cars c
      LEFT JOIN car_variants cv ON c.id = cv.car_id
      GROUP BY c.id, c.name
      HAVING variant_count > 0
      ORDER BY variant_count DESC
    `);

    if (results.length === 0) {
      console.log('❌ No cars have variants yet\n');
      return;
    }

    console.log(`✅ Found ${results.length} car(s) with variants:\n`);
    
    results.forEach((car, index) => {
      console.log(`${index + 1}. ${car.car_name}`);
      console.log(`   Car ID: ${car.car_id}`);
      console.log(`   Variants: ${car.variant_count}`);
      console.log(`   Years: ${car.years}`);
      console.log('');
    });

    console.log('💡 To see variants in admin panel:');
    console.log('   1. Copy one of the Car IDs above');
    console.log('   2. Go to Admin Dashboard → Manage Cars');
    console.log('   3. Find and edit that specific car');
    console.log('   4. Scroll to "Year Variants" section');
    console.log('   5. You should see the variants listed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCarsWithVariants();
