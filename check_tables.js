require("dotenv").config();
const mysql = require("mysql2/promise");

async function checkTables() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    console.log('🔍 Checking existing tables in database...\n');
    
    const [tables] = await pool.query("SHOW TABLES");
    
    if (tables.length === 0) {
      console.log('❌ No tables found in database');
    } else {
      console.log('✅ Found tables:');
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`  - ${tableName}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
