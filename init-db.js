const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function initDb() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
    const seed = fs.readFileSync(path.join(__dirname, 'db', 'seed.sql'), 'utf8');

    console.log('Connecting to database...');
    
    // Split by semicolon but handle potential issues with triggers/functions if any
    const queries = schema.split(';').filter(q => q.trim());
    
    console.log('Running schema queries...');
    for (let query of queries) {
      await pool.query(query);
    }
    
    console.log('Running seed queries...');
    const seedQueries = seed.split(';').filter(q => q.trim());
    for (let query of seedQueries) {
      await pool.query(query);
    }

    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

initDb();
