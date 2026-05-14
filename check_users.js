require("dotenv").config();
const mysql = require("mysql2/promise");

async function checkUsers() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    console.log('🔍 Checking existing users in database...\n');
    
    const [users] = await pool.query("SELECT id, email, role FROM users LIMIT 10");
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      console.log('💡 You need to create a user first. Use the registration endpoint or add one manually.');
    } else {
      console.log('✅ Found users:');
      users.forEach(user => {
        console.log(`  - ID: ${user.id}, Email: ${user.email}, Role: ${user.role || 'user'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
