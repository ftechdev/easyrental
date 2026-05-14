require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkVariantsTable() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    console.log('\n=== Checking car_variants table ===\n');
    
    // Check if table exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'car_variants'");
    
    if (tables.length === 0) {
      console.log('❌ car_variants table DOES NOT EXIST');
      console.log('\n📋 You need to run the database migration!');
      console.log('👉 Go to phpMyAdmin and run SIMPLE_CAR_VARIANTS_MIGRATION.sql\n');
    } else {
      console.log('✅ car_variants table EXISTS');
      
      // Check table structure
      const [structure] = await pool.query("DESCRIBE car_variants");
      console.log('\n📊 Table Structure:');
      structure.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type}`);
      });
      
      // Check existing data
      const [count] = await pool.query("SELECT COUNT(*) as total FROM car_variants");
      console.log(`\n📈 Total variants: ${count[0].total}`);
      
      if (count[0].total > 0) {
        const [variants] = await pool.query("SELECT * FROM car_variants LIMIT 5");
        console.log('\n📝 Sample variants:');
        variants.forEach(v => {
          console.log(`  - Year ${v.model_year}: ${v.daily_rate} AED/day`);
        });
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkVariantsTable();
