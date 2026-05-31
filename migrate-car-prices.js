const pool = require('./db');

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

async function migrate() {
  try {
    console.log('Migrating cars table for weekly/monthly prices...');

    if (!(await columnExists('cars', 'weekly_rate'))) {
      await pool.query(
        'ALTER TABLE cars ADD COLUMN weekly_rate DECIMAL(10, 2) NULL AFTER daily_rate'
      );
      console.log('Added weekly_rate column');
    }

    if (!(await columnExists('cars', 'monthly_rate'))) {
      await pool.query(
        'ALTER TABLE cars ADD COLUMN monthly_rate DECIMAL(10, 2) NULL AFTER weekly_rate'
      );
      console.log('Added monthly_rate column');
    }

    const [result] = await pool.query(`
      UPDATE cars
      SET
        weekly_rate = COALESCE(weekly_rate, ROUND(daily_rate * 5.5, 2)),
        monthly_rate = COALESCE(monthly_rate, ROUND(daily_rate * 22, 2))
      WHERE daily_rate IS NOT NULL
        AND (weekly_rate IS NULL OR monthly_rate IS NULL)
    `);
    console.log(`Backfilled prices for ${result.affectedRows} car(s)`);
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
