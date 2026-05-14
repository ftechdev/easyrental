require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkDatabase() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT)
    });

    console.log('✅ Database connected!\n');

    // Check table counts
    const [profiles] = await conn.query('SELECT COUNT(*) as count FROM profiles');
    console.log('👥 Users:', profiles[0].count);

    const [cars] = await conn.query('SELECT COUNT(*) as count FROM cars');
    console.log('🚗 Cars:', cars[0].count);

    const [bookings] = await conn.query('SELECT COUNT(*) as count FROM bookings');
    console.log('📅 Bookings:', bookings[0].count);

    const [locations] = await conn.query('SELECT COUNT(*) as count FROM locations');
    console.log('📍 Locations:', locations[0].count);

    const [categories] = await conn.query('SELECT COUNT(*) as count FROM categories');
    console.log('📁 Categories:', categories[0].count);

    // Check sample data
    console.log('\n=== SAMPLE DATA ===');
    
    const [sampleUsers] = await conn.query('SELECT id, email, role, is_verified FROM profiles LIMIT 3');
    console.log('\n👤 Sample Users:');
    sampleUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Verified: ${user.is_verified}`);
    });

    const [sampleCars] = await conn.query('SELECT id, brand, model, year, daily_rate FROM cars LIMIT 3');
    console.log('\n🚗 Sample Cars:');
    sampleCars.forEach(car => {
      console.log(`  - ${car.brand} ${car.model} (${car.year}) - ${car.daily_rate} AED/day`);
    });

    const [sampleLocations] = await conn.query('SELECT id, name, delivery_fee FROM locations LIMIT 3');
    console.log('\n📍 Sample Locations:');
    sampleLocations.forEach(loc => {
      console.log(`  - ${loc.name} - Delivery: ${loc.delivery_fee} AED`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

checkDatabase();
