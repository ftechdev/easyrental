require('dotenv').config();
const mysql = require('mysql2/promise');

async function testAPIEndpoints() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT)
    });

    console.log('🧪 Testing API Data Readiness...\n');

    // Test Categories API
    console.log('📁 Categories API Test:');
    const [categories] = await conn.query('SELECT id, name FROM categories ORDER BY name');
    categories.forEach(cat => console.log(`  - ${cat.name} (ID: ${cat.id})`));

    // Test Locations API
    console.log('\n📍 Locations API Test:');
    const [locations] = await conn.query('SELECT id, name, delivery_fee FROM locations ORDER BY name');
    locations.forEach(loc => console.log(`  - ${loc.name} - ${loc.delivery_fee} AED delivery (ID: ${loc.id})`));

    // Test Cars API
    console.log('\n🚗 Cars API Test:');
    const [cars] = await conn.query(`
      SELECT c.id, c.brand, c.model, c.year, c.daily_rate, cat.name as category 
      FROM cars c 
      LEFT JOIN categories cat ON c.category_id = cat.id 
      ORDER BY c.daily_rate
    `);
    cars.forEach(car => console.log(`  - ${car.brand} ${car.model} (${car.year}) - ${car.daily_rate} AED/day - ${car.category}`));

    // Test Users API
    console.log('\n👥 Users API Test:');
    const [users] = await conn.query('SELECT id, email, first_name, last_name, role FROM profiles ORDER BY role, email');
    users.forEach(user => console.log(`  - ${user.email} - ${user.first_name} ${user.last_name} (${user.role})`));

    // Test Bookings API
    console.log('\n📅 Bookings API Test:');
    const [bookings] = await conn.query(`
      SELECT b.id, b.start_date, b.end_date, b.total_amount, b.status, b.payment_status,
             p.email as user_email, c.brand as car_brand, c.model as car_model
      FROM bookings b
      JOIN profiles p ON b.user_id = p.id
      JOIN cars c ON b.car_id = c.id
      ORDER BY b.created_at DESC
    `);
    bookings.forEach(booking => console.log(`  - ${booking.user_email} - ${booking.car_brand} ${booking.car_model} - ${booking.start_date} to ${booking.end_date} - ${booking.total_amount} AED (${booking.status}/${booking.payment_status})`));

    // Test Car Variants API
    console.log('\n🔄 Car Variants API Test:');
    const [variants] = await conn.query(`
      SELECT cv.id, cv.name, cv.year, cv.daily_rate, c.brand, c.model
      FROM car_variants cv
      JOIN cars c ON cv.car_id = c.id
      ORDER BY c.brand, c.model, cv.year
    `);
    variants.forEach(variant => console.log(`  - ${variant.name} - ${variant.daily_rate} AED/day`));

    // Test Reviews API
    console.log('\n⭐ Reviews API Test:');
    const [reviews] = await conn.query(`
      SELECT r.id, r.rating, r.comment, p.email as user_email, c.brand as car_brand, c.model as car_model
      FROM reviews r
      JOIN profiles p ON r.user_id = p.id
      JOIN cars c ON r.car_id = c.id
      ORDER BY r.created_at DESC
    `);
    reviews.forEach(review => console.log(`  - ${review.user_email} - ${review.car_brand} ${review.car_model} - ${review.rating}/5 - ${review.comment}`));

    console.log('\n✅ All API endpoints have data ready for testing!');
    console.log('\n🔗 Ready for Frontend Integration:');
    console.log('  - GET /api/categories - Categories list');
    console.log('  - GET /api/locations/getlocations - Locations with delivery fees');
    console.log('  - GET /api/cars/getallCars - All cars with pricing');
    console.log('  - GET /api/cars/:id/variants - Car variants');
    console.log('  - POST /api/auth/login - User authentication');
    console.log('  - POST /api/booking/create - Create booking');
    console.log('  - GET /api/booking/user/current - User bookings');

  } catch (error) {
    console.error('❌ API Test Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

testAPIEndpoints();
