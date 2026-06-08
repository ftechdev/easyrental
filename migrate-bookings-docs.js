const pool = require('./db');

async function migrate() {
  try {
    console.log('Starting migration to add document fields to bookings table...');
    
    // Check if columns already exist to avoid errors
    const [columns] = await pool.query('SHOW COLUMNS FROM bookings');
    const columnNames = columns.map(c => c.Field);
    
    const newColumns = [
      { name: 'passport_front', type: 'TEXT NULL' },
      { name: 'passport_back', type: 'TEXT NULL' },
      { name: 'driving_licence', type: 'TEXT NULL' }
    ];
    
    for (const col of newColumns) {
      if (!columnNames.includes(col.name)) {
        console.log(`Adding column ${col.name}...`);
        await pool.query(`ALTER TABLE bookings ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`Column ${col.name} already exists.`);
      }
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
