// Script to create an admin user in the database
// Run this with: node scripts/createAdminUser.js

const bcrypt = require('bcrypt');
const pool = require('../config/DB');
const { v4: uuidv4 } = require('uuid');

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user...');

    // Admin credentials
    const adminEmail = 'admin@alrascars.com';
    const adminPassword = 'Admin@123456'; // Change this to your desired password
    const firstName = 'Admin';
    const lastName = 'AlrasCars';

    // Check if admin already exists
    const [existingAdmin] = await pool.query(
      'SELECT * FROM profiles WHERE email = ? LIMIT 1',
      [adminEmail]
    );

    if (existingAdmin.length > 0) {
      console.log('⚠️  Admin user already exists!');
      console.log('📧 Email:', adminEmail);
      console.log('👤 Name:', existingAdmin[0].first_name, existingAdmin[0].last_name);
      console.log('🔑 Role:', existingAdmin[0].role);
      
      // Ask if user wants to update password
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      readline.question('Do you want to reset the password? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          await pool.query(
            'UPDATE profiles SET password = ?, role = ? WHERE email = ?',
            [hashedPassword, 'admin', adminEmail]
          );
          console.log('✅ Admin password updated successfully!');
          console.log('📧 Email:', adminEmail);
          console.log('🔑 Password:', adminPassword);
        } else {
          console.log('❌ Password not updated.');
        }
        readline.close();
        process.exit(0);
      });
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const adminId = uuidv4();
    await pool.query(
      `INSERT INTO profiles (
        id, email, first_name, last_name, password, role, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, adminEmail, firstName, lastName, hashedPassword, 'admin', 1]
    );

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('👤 Name:', firstName, lastName);
    console.log('🎯 Role: admin');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

// Run the script
createAdminUser();
