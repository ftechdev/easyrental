// Quick script to check the cars table schema
require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkSchema() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    const [rows] = await pool.query("DESCRIBE cars");
    console.log('\n=== CARS TABLE STRUCTURE ===\n');
    rows.forEach(row => {
      console.log(`${row.Field}: ${row.Type} ${row.Null} ${row.Key} ${row.Default || ''}`);
    });
    
    // Also check if car_variants exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'car_variants'");
    console.log('\n=== CAR_VARIANTS TABLE EXISTS: ===', tables.length > 0 ? 'YES' : 'NO');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
