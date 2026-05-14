require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");

async function setAdminPassword() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    console.log('🔧 Setting password for admin user...\n');
    
    // Hash the password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the admin user with password
    const [result] = await pool.query(
      "UPDATE profiles SET password = ? WHERE email = 'dataftech@gmail.com'",
      [hashedPassword]
    );
    
    console.log('✅ Set password for admin user dataftech@gmail.com');
    console.log('🔑 Password: admin123');
    
    // Verify the update
    const [adminUser] = await pool.query(
      "SELECT id, first_name, last_name, email, role FROM profiles WHERE email = 'dataftech@gmail.com'"
    );
    
    if (adminUser.length > 0) {
      console.log('✅ Admin user ready for testing:', adminUser[0]);
    }
    
  } catch (error) {
    console.error('❌ Error setting admin password:', error.message);
  } finally {
    await pool.end();
  }
}

setAdminPassword();
