require('dotenv').config();
const mysql = require('mysql2/promise');

// Copy the formatCar function to debug it
const formatCar = (row) => ({
  categoryId: row.category_id || null,
  categoryName: row.category_name || null,
  name: `${row.brand} ${row.model}` || null,
  carCategory: row.category_name || null,
  description: row.description || null,
  features: row.is_featured ? ['featured'] : null,
  doors: row.doors ?? null,
  seats: row.seats ?? null,
  luggage: row.luggage_capacity ?? null,
  engine: `${row.year} ${row.fuel_type}` || null,
  fuelType: row.fuel_type || null,
  transmission: row.transmission || null,
  airConditioning: true, // Default to true since most cars have AC
  pricing: {
    daily: parseFloat(row.daily_rate) || null,
    weekly: parseFloat(row.weekly_rate) || null,
    monthly: parseFloat(row.monthly_rate) || null,
  },
  locations: null,
  image: row.main_image || null,
  gallery: row.images ? JSON.parse(row.images) : null,
  carId: row.id || null,
  modelYear: row.year || null,
  availableYears: row.available_years ? row.available_years.split(',').map(y => parseInt(y)) : null,
});

async function debugFormatCar() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT)
    });

    const query = `
      SELECT 
        c.*,
        cat.name as category_name,
        COALESCE(MIN(cv.daily_rate), c.daily_rate) as daily_rate,
        COALESCE(MIN(cv.weekly_rate), c.weekly_rate) as weekly_rate,
        COALESCE(MIN(cv.monthly_rate), c.monthly_rate) as monthly_rate,
        GROUP_CONCAT(DISTINCT cv.year ORDER BY cv.year SEPARATOR ',') as available_years
      FROM cars c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN car_variants cv ON c.id = cv.car_id AND cv.is_available = true
      GROUP BY c.id, cat.name
      LIMIT 1
    `;
    
    const [rows] = await conn.query(query);
    const row = rows[0];
    
    console.log('🔍 Raw database row:');
    console.log('brand:', row.brand);
    console.log('model:', row.model);
    console.log('year:', row.year);
    console.log('category_name:', row.category_name);
    console.log('main_image:', row.main_image);
    console.log('luggage_capacity:', row.luggage_capacity);
    console.log('is_featured:', row.is_featured);
    
    console.log('\n📝 Formatted car:');
    const formatted = formatCar(row);
    console.log(JSON.stringify(formatted, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

debugFormatCar();
