require('dotenv').config();
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function migrateSampleData() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT)
    });

    console.log('🔄 Starting sample data migration...\n');

    // Sample Categories
    console.log('📁 Migrating Categories...');
    const categories = [
      { name: 'Economy' },
      { name: 'Compact' },
      { name: 'Mid-size' },
      { name: 'Full-size' },
      { name: 'SUV' },
      { name: 'Luxury' },
      { name: 'Sports' },
      { name: 'Van' },
      { name: 'Truck' }
    ];

    for (const cat of categories) {
      await conn.query(
        'INSERT IGNORE INTO categories (id, name) VALUES (?, ?)',
        [uuidv4(), cat.name]
      );
    }

    // Get category IDs
    const [categoryRows] = await conn.query('SELECT id, name FROM categories');
    const categoryMap = Object.fromEntries(categoryRows.map(cat => [cat.name, cat.id]));

    // Sample Cars
    console.log('🚗 Migrating Cars...');
    const cars = [
      {
        brand: 'Toyota',
        model: 'Yaris',
        year: 2023,
        color: 'White',
        license_plate: 'A12345',
        chassis_number: 'JTDKB20U993045678',
        mileage: 15000,
        fuel_type: 'Petrol',
        transmission: 'Automatic',
        seats: 5,
        doors: 4,
        luggage_capacity: 2,
        daily_rate: 120,
        weekly_rate: 700,
        monthly_rate: 2500,
        security_deposit: 500,
        description: 'Compact and fuel-efficient city car, perfect for daily commuting',
        main_image: 'https://example.com/toyota-yaris.jpg',
        category: 'Economy'
      },
      {
        brand: 'Honda',
        model: 'Civic',
        year: 2023,
        color: 'Blue',
        license_plate: 'B67890',
        chassis_number: '2HGFC2F89MH123456',
        mileage: 8000,
        fuel_type: 'Petrol',
        transmission: 'Automatic',
        seats: 5,
        doors: 4,
        luggage_capacity: 3,
        daily_rate: 150,
        weekly_rate: 900,
        monthly_rate: 3200,
        security_deposit: 600,
        description: 'Reliable and comfortable sedan with modern features',
        main_image: 'https://example.com/honda-civic.jpg',
        category: 'Compact'
      },
      {
        brand: 'Toyota',
        model: 'Fortuner',
        year: 2023,
        color: 'Black',
        license_plate: 'C11111',
        chassis_number: 'JTEBX9FJ2EK234567',
        mileage: 12000,
        fuel_type: 'Diesel',
        transmission: 'Automatic',
        seats: 7,
        doors: 5,
        luggage_capacity: 5,
        daily_rate: 300,
        weekly_rate: 1800,
        monthly_rate: 6500,
        security_deposit: 1000,
        description: 'Spacious SUV perfect for family trips and off-road adventures',
        main_image: 'https://example.com/toyota-fortuner.jpg',
        category: 'SUV'
      },
      {
        brand: 'BMW',
        model: 'X5',
        year: 2023,
        color: 'Silver',
        license_plate: 'D22222',
        chassis_number: '5UXCR6C53H9D34567',
        mileage: 5000,
        fuel_type: 'Petrol',
        transmission: 'Automatic',
        seats: 7,
        doors: 5,
        luggage_capacity: 4,
        daily_rate: 450,
        weekly_rate: 2800,
        monthly_rate: 10000,
        security_deposit: 1500,
        description: 'Luxury SUV with premium features and exceptional performance',
        main_image: 'https://example.com/bmw-x5.jpg',
        category: 'Luxury'
      },
      {
        brand: 'Ford',
        model: 'Transit',
        year: 2023,
        color: 'White',
        license_plate: 'E33333',
        chassis_number: 'WF0AXXGBGAFA12345',
        mileage: 10000,
        fuel_type: 'Diesel',
        transmission: 'Manual',
        seats: 3,
        doors: 4,
        luggage_capacity: 10,
        daily_rate: 200,
        weekly_rate: 1200,
        monthly_rate: 4000,
        security_deposit: 800,
        description: 'Commercial van perfect for moving and business use',
        main_image: 'https://example.com/ford-transit.jpg',
        category: 'Van'
      }
    ];

    for (const car of cars) {
      const carId = uuidv4();
      await conn.query(
        `INSERT INTO cars (
          id, category_id, brand, model, year, color, license_plate, chassis_number,
          mileage, fuel_type, transmission, seats, doors, luggage_capacity,
          daily_rate, weekly_rate, monthly_rate, security_deposit, is_available,
          is_featured, description, main_image, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          carId, categoryMap[car.category], car.brand, car.model, car.year,
          car.color, car.license_plate, car.chassis_number, car.mileage,
          car.fuel_type, car.transmission, car.seats, car.doors,
          car.luggage_capacity, car.daily_rate, car.weekly_rate,
          car.monthly_rate, car.security_deposit, true, Math.random() > 0.7,
          car.description, car.main_image
        ]
      );

      // Add car variants
      const variants = [
        { year: 2022, daily_rate: car.daily_rate * 0.9 },
        { year: 2024, daily_rate: car.daily_rate * 1.1 }
      ];

      for (const variant of variants) {
        await conn.query(
          `INSERT INTO car_variants (
            id, car_id, name, year, daily_rate, weekly_rate, monthly_rate,
            security_deposit, is_available, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            uuidv4(), carId, `${car.brand} ${car.model} ${variant.year}`,
            variant.year, variant.daily_rate,
            variant.daily_rate * 6, variant.daily_rate * 25,
            car.security_deposit, true
          ]
        );
      }
    }

    // Sample Users
    console.log('👥 Migrating Sample Users...');
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('User@123456', 10);

    const users = [
      {
        email: 'john.doe@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+971501234567',
        password: hashedPassword,
        role: 'user'
      },
      {
        email: 'jane.smith@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '+971559876543',
        password: hashedPassword,
        role: 'user'
      }
    ];

    for (const user of users) {
      await conn.query(
        `INSERT IGNORE INTO profiles (
          id, email, first_name, last_name, phone, password, role, is_verified, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [uuidv4(), user.email, user.first_name, user.last_name, user.phone, user.password, user.role, true]
      );
    }

    // Get user and car IDs for bookings
    const [userRows] = await conn.query('SELECT id, email FROM profiles WHERE role = "user"');
    const [carRows] = await conn.query('SELECT id, brand, model FROM cars');
    const [locationRows] = await conn.query('SELECT id, name FROM locations');

    // Sample Bookings
    console.log('📅 Migrating Sample Bookings...');
    if (userRows.length > 0 && carRows.length > 0 && locationRows.length > 0) {
      const bookings = [
        {
          user_id: userRows[0].id,
          car_id: carRows[0].id,
          pickup_location_id: locationRows[0].id,
          dropoff_location_id: locationRows[1].id,
          start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
          end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days from now
          total_days: 3,
          daily_rate: 120,
          total_amount: 360,
          driver_name: 'John Doe',
          driver_phone: '+971501234567',
          driver_email: 'john.doe@example.com',
          status: 'approved',
          payment_status: 'paid'
        },
        {
          user_id: userRows.length > 1 ? userRows[1].id : userRows[0].id,
          car_id: carRows.length > 1 ? carRows[1].id : carRows[0].id,
          pickup_location_id: locationRows[1].id,
          dropoff_location_id: locationRows[0].id,
          start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
          end_date: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 17 days from now
          total_days: 3,
          daily_rate: 150,
          total_amount: 450,
          driver_name: 'Jane Smith',
          driver_phone: '+971559876543',
          driver_email: 'jane.smith@example.com',
          status: 'pending',
          payment_status: 'pending'
        }
      ];

      for (const booking of bookings) {
        await conn.query(
          `INSERT INTO bookings (
            id, user_id, car_id, pickup_location_id, dropoff_location_id,
            start_date, end_date, total_days, daily_rate, total_amount,
            driver_name, driver_phone, driver_email, status, payment_status,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            uuidv4(), booking.user_id, booking.car_id, booking.pickup_location_id,
            booking.dropoff_location_id, booking.start_date, booking.end_date,
            booking.total_days, booking.daily_rate, booking.total_amount,
            booking.driver_name, booking.driver_phone, booking.driver_email,
            booking.status, booking.payment_status
          ]
        );
      }
    }

    // Sample Reviews
    console.log('⭐ Migrating Sample Reviews...');
    const [bookingRows] = await conn.query('SELECT id, user_id, car_id FROM bookings WHERE status = "approved"');
    
    for (const booking of bookingRows) {
      await conn.query(
        `INSERT INTO reviews (
          id, booking_id, user_id, car_id, rating, comment, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          uuidv4(), booking.id, booking.user_id, booking.car_id,
          Math.floor(Math.random() * 2) + 4, // 4-5 stars
          'Great experience! Car was clean and well-maintained. Highly recommend.'
        ]
      );
    }

    // Sample Settings
    console.log('⚙️ Migrating Settings...');
    const settings = [
      { key_name: 'site_name', value: 'Easy Rental', description: 'Website name' },
      { key_name: 'site_email', value: 'info@easyrental.com', description: 'Contact email' },
      { key_name: 'currency', value: 'AED', description: 'Default currency' },
      { key_name: 'tax_rate', value: '5.00', description: 'Tax rate percentage' },
      { key_name: 'min_booking_days', value: '1', description: 'Minimum booking days' },
      { key_name: 'max_booking_days', value: '365', description: 'Maximum booking days' },
      { key_name: 'security_deposit_percentage', value: '20.00', description: 'Security deposit as percentage of rental amount' }
    ];

    for (const setting of settings) {
      await conn.query(
        'INSERT IGNORE INTO settings (id, key_name, value, description, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [uuidv4(), setting.key_name, setting.value, setting.description]
      );
    }

    console.log('\n✅ Sample data migration completed successfully!\n');

    // Show summary
    const [summary] = await conn.query(`
      SELECT 
        (SELECT COUNT(*) FROM profiles) as users,
        (SELECT COUNT(*) FROM cars) as cars,
        (SELECT COUNT(*) FROM bookings) as bookings,
        (SELECT COUNT(*) FROM reviews) as reviews,
        (SELECT COUNT(*) FROM locations) as locations,
        (SELECT COUNT(*) FROM categories) as categories
    `);

    console.log('📊 Migration Summary:');
    console.log(`👥 Users: ${summary[0].users}`);
    console.log(`🚗 Cars: ${summary[0].cars}`);
    console.log(`📅 Bookings: ${summary[0].bookings}`);
    console.log(`⭐ Reviews: ${summary[0].reviews}`);
    console.log(`📍 Locations: ${summary[0].locations}`);
    console.log(`📁 Categories: ${summary[0].categories}`);

  } catch (error) {
    console.error('❌ Migration Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

migrateSampleData();
