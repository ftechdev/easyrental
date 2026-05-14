require("dotenv").config();
const mysql = require("mysql2/promise");

async function createAdminUser() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    console.log('🔧 Creating admin user for testing...\n');
    
    // Update the first user to admin role
    const [result] = await pool.query(
      "UPDATE profiles SET role = 'admin' WHERE email = 'dataftech@gmail.com'"
    );
    
    console.log('✅ Updated user dataftech@gmail.com to admin role');
    
    // Verify the update
    const [adminUser] = await pool.query(
      "SELECT id, first_name, last_name, email, role FROM profiles WHERE email = 'dataftech@gmail.com'"
    );
    
    if (adminUser.length > 0) {
      console.log('✅ Admin user details:', adminUser[0]);
    }
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    await pool.end();
  }
}

createAdminUser();
