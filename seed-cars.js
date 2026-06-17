const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function seedCars() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'db', 'seed-cars-only.sql'), 'utf8');
    const queries = sql.split(';').filter(q => q.trim());

    console.log('Seeding 20 sample cars...');
    for (const query of queries) {
      await pool.query(query);
    }

    // Fix auto-increment if it has overflowed past INT max
    const [maxRow] = await pool.query('SELECT COALESCE(MAX(id), 0) AS maxId FROM cars');
    const nextId = Number(maxRow[0].maxId) + 1;
    await pool.query(`ALTER TABLE cars AUTO_INCREMENT = ${nextId}`);

    const [rows] = await pool.query('SELECT COUNT(*) as count FROM cars');
    console.log(`Done. Total cars in database: ${rows[0].count}`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding cars:', err.message);
    process.exit(1);
  }
}

seedCars();
