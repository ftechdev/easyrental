const pool = require('./db');

async function migrate() {
  try {
    console.log('Migrating bookings table...');
    await pool.query(`
      ALTER TABLE bookings 
      MODIFY customer_name VARCHAR(255) NULL,
      MODIFY customer_email VARCHAR(255) NULL,
      MODIFY customer_phone VARCHAR(50) NOT NULL;
    `);
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
