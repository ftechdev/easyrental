require("dotenv").config();
const mysql = require("mysql2/promise");

async function checkProfiles() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    console.log('🔍 Checking existing profiles in database...\n');
    
    const [profiles] = await pool.query("SELECT id, first_name, last_name, email, role FROM profiles LIMIT 10");
    
    if (profiles.length === 0) {
      console.log('❌ No profiles found in database');
      console.log('💡 You need to create a user first. Use the registration endpoint.');
    } else {
      console.log('✅ Found profiles:');
      profiles.forEach(profile => {
        console.log(`  - ID: ${profile.id}, Name: ${profile.first_name} ${profile.last_name}, Email: ${profile.email}, Role: ${profile.role || 'user'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking profiles:', error.message);
  } finally {
    await pool.end();
  }
}

checkProfiles();
