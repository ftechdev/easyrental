require("dotenv").config();
const mysql = require("mysql2/promise");

async function createSeoTable() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS seo_metadata (
        id INT AUTO_INCREMENT PRIMARY KEY,
        page_path VARCHAR(255) NOT NULL UNIQUE,
        title VARCHAR(255),
        description TEXT,
        keywords TEXT,
        og_image VARCHAR(255),
        og_type VARCHAR(50) DEFAULT 'website',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createTableQuery);
    console.log("✅ seo_metadata table created or already exists.");
  } catch (error) {
    console.error("❌ Error creating seo_metadata table:", error);
  } finally {
    await pool.end();
  }
}

createSeoTable();
