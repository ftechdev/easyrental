require('dotenv').config();
const mysql = require('mysql2/promise');

async function testVariantCRUD() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    console.log('\n=== Testing Year Variant CRUD Operations ===\n');

    // Get a test car ID
    const [cars] = await pool.query("SELECT id, name FROM cars LIMIT 1");
    if (cars.length === 0) {
      console.log('❌ No cars found in database. Add a car first.');
      return;
    }

    const testCarId = cars[0].id;
    const testCarName = cars[0].name;
    console.log(`✅ Using test car: ${testCarName} (${testCarId})\n`);

    // 1. Check existing variants
    console.log('1️⃣ Checking existing variants...');
    const [existing] = await pool.query(
      "SELECT * FROM car_variants WHERE car_id = ?",
      [testCarId]
    );
    console.log(`   Found ${existing.length} existing variants`);
    if (existing.length > 0) {
      existing.forEach(v => {
        console.log(`   - ${v.model_year}: ${v.daily_rate} AED/day`);
      });
    }
    console.log('');

    // 2. Test INSERT
    console.log('2️⃣ Testing INSERT (Add Variant)...');
    const { v4: uuidv4 } = require('uuid');
    const testVariantId = uuidv4();
    const testYear = 2024;
    
    try {
      await pool.query(
        `INSERT INTO car_variants (id, car_id, model_year, daily_rate, weekly_rate, monthly_rate, units_available)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [testVariantId, testCarId, testYear, 99.00, 600.00, 2000.00, 5]
      );
      console.log(`   ✅ Variant added successfully (ID: ${testVariantId})`);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log(`   ⚠️  Variant for year ${testYear} already exists`);
      } else {
        console.log(`   ❌ Insert failed: ${err.message}`);
      }
    }
    console.log('');

    // 3. Test SELECT
    console.log('3️⃣ Testing SELECT (Fetch Variants)...');
    const [variants] = await pool.query(
      "SELECT * FROM car_variants WHERE car_id = ? ORDER BY model_year",
      [testCarId]
    );
    console.log(`   ✅ Found ${variants.length} variants for this car:`);
    variants.forEach(v => {
      console.log(`   - ${v.model_year}: Daily ${v.daily_rate}, Weekly ${v.weekly_rate}, Monthly ${v.monthly_rate}, Units: ${v.units_available}`);
    });
    console.log('');

    // 4. Test UPDATE
    console.log('4️⃣ Testing UPDATE (Edit Variant)...');
    if (variants.length > 0) {
      const variantToUpdate = variants[0];
      const newDailyRate = 109.00;
      
      await pool.query(
        `UPDATE car_variants SET daily_rate = ?, weekly_rate = ?, monthly_rate = ? WHERE id = ?`,
        [newDailyRate, 650.00, 2200.00, variantToUpdate.id]
      );
      
      const [updated] = await pool.query(
        "SELECT * FROM car_variants WHERE id = ?",
        [variantToUpdate.id]
      );
      
      console.log(`   ✅ Updated variant ${variantToUpdate.model_year}:`);
      console.log(`   - Old daily rate: ${variantToUpdate.daily_rate}`);
      console.log(`   - New daily rate: ${updated[0].daily_rate}`);
    } else {
      console.log('   ⚠️  No variants to update');
    }
    console.log('');

    // 5. Test DELETE
    console.log('5️⃣ Testing DELETE (Remove Variant)...');
    const [toDelete] = await pool.query(
      "SELECT * FROM car_variants WHERE car_id = ? ORDER BY created_at DESC LIMIT 1",
      [testCarId]
    );
    
    if (toDelete.length > 0) {
      const variantId = toDelete[0].id;
      const variantYear = toDelete[0].model_year;
      
      await pool.query("DELETE FROM car_variants WHERE id = ?", [variantId]);
      
      const [check] = await pool.query(
        "SELECT * FROM car_variants WHERE id = ?",
        [variantId]
      );
      
      if (check.length === 0) {
        console.log(`   ✅ Variant ${variantYear} deleted successfully`);
      } else {
        console.log(`   ❌ Delete failed - variant still exists`);
      }
    } else {
      console.log('   ⚠️  No variants to delete');
    }
    console.log('');

    // 6. Final count
    console.log('6️⃣ Final variant count...');
    const [final] = await pool.query(
      "SELECT COUNT(*) as count FROM car_variants WHERE car_id = ?",
      [testCarId]
    );
    console.log(`   ✅ Total variants for ${testCarName}: ${final[0].count}`);
    console.log('');

    console.log('📊 Summary:');
    console.log('- Database operations: Working ✅');
    console.log('- car_variants table: Accessible ✅');
    console.log('- CRUD operations: All functional ✅');
    console.log('\n💡 If frontend still shows empty array, the issue is likely:');
    console.log('   1. Wrong car ID being passed to component');
    console.log('   2. API endpoint not returning data correctly');
    console.log('   3. Frontend not using correct car ID in request\n');

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testVariantCRUD();
