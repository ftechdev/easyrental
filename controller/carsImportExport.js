const pool = require("../config/DB");
const { parse } = require("csv-parse/sync");
const { stringify } = require("csv-stringify/sync");

/**
 * Export all cars to CSV
 * GET /api/cars/export
 */
exports.exportCars = async (req, res) => {
  try {
    const [cars] = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.category_id,
        cat.name as category_name,
        c.description,
        c.doors,
        c.seats,
        c.luggage,
        c.engine_capacity,
        c.fuel_type,
        c.transmission,
        c.has_ac,
        c.has_air_bags,
        c.has_audio_input,
        c.has_car_kit,
        c.has_gps,
        c.has_music,
        c.has_seat_belts,
        c.single_image,
        c.gallery_images,
        c.day_price,
        c.week_price,
        c.month_price,
        c.daily_rate,
        c.weekly_rate,
        c.monthly_rate,
        c.additional_driver_cost,
        c.cdw_cost,
        c.insurance_cost,
        c.units_available,
        c.created_at,
        c.updated_at
      FROM cars c
      LEFT JOIN categories cat ON c.category_id = cat.id
      ORDER BY c.created_at DESC
    `);

    // Get car variants for each car
    const carsWithVariants = await Promise.all(cars.map(async (car) => {
      const [variants] = await pool.query(`
        SELECT 
          id,
          model_year,
          daily_price,
          weekly_price,
          monthly_price,
          units_available
        FROM car_variants 
        WHERE car_id = ?
        ORDER BY model_year DESC
      `, [car.id]);

      return {
        ...car,
        variants: variants
      };
    }));

    // Transform data for CSV with variants
    const csvData = [];
    
    carsWithVariants.forEach(car => {
      // If car has variants, create separate rows for each variant
      if (car.variants && car.variants.length > 0) {
        car.variants.forEach((variant, index) => {
          csvData.push({
            id: car.id,
            name: car.name,
            category_id: car.category_id,
            category_name: car.category_name,
            description: car.description || '',
            doors: car.doors || '',
            seats: car.seats || '',
            luggage: car.luggage || '',
            engine_capacity: car.engine_capacity || '',
            fuel_type: car.fuel_type || '',
            transmission: car.transmission || '',
            has_ac: car.has_ac ? 'Yes' : 'No',
            has_air_bags: car.has_air_bags ? 'Yes' : 'No',
            has_audio_input: car.has_audio_input ? 'Yes' : 'No',
            has_car_kit: car.has_car_kit ? 'Yes' : 'No',
            has_gps: car.has_gps ? 'Yes' : 'No',
            has_music: car.has_music ? 'Yes' : 'No',
            has_seat_belts: car.has_seat_belts ? 'Yes' : 'No',
            single_image: car.single_image || '',
            gallery_images: Array.isArray(car.gallery_images) ? car.gallery_images.join(';') : '',
            day_price: car.day_price || 0,
            week_price: car.week_price || 0,
            month_price: car.month_price || 0,
            daily_rate: car.daily_rate || 0,
            weekly_rate: car.weekly_rate || 0,
            monthly_rate: car.monthly_rate || 0,
            additional_driver_cost: car.additional_driver_cost || 0,
            cdw_cost: car.cdw_cost || 0,
            insurance_cost: car.insurance_cost || 0,
            units_available: car.units_available || 1,
            // Year variant fields
            variant_id: variant.id,
            model_year: variant.model_year,
            variant_daily_price: variant.daily_price || 0,
            variant_weekly_price: variant.weekly_price || 0,
            variant_monthly_price: variant.monthly_price || 0,
            variant_units_available: variant.units_available || 1,
            is_variant: 'Yes',
            variant_index: index + 1,
            created_at: car.created_at,
            updated_at: car.updated_at
          });
        });
      } else {
        // Car without variants - single row
        csvData.push({
          id: car.id,
          name: car.name,
          category_id: car.category_id,
          category_name: car.category_name,
          description: car.description || '',
          doors: car.doors || '',
          seats: car.seats || '',
          luggage: car.luggage || '',
          engine_capacity: car.engine_capacity || '',
          fuel_type: car.fuel_type || '',
          transmission: car.transmission || '',
          has_ac: car.has_ac ? 'Yes' : 'No',
          has_air_bags: car.has_air_bags ? 'Yes' : 'No',
          has_audio_input: car.has_audio_input ? 'Yes' : 'No',
          has_car_kit: car.has_car_kit ? 'Yes' : 'No',
          has_gps: car.has_gps ? 'Yes' : 'No',
          has_music: car.has_music ? 'Yes' : 'No',
          has_seat_belts: car.has_seat_belts ? 'Yes' : 'No',
          single_image: car.single_image || '',
          gallery_images: Array.isArray(car.gallery_images) ? car.gallery_images.join(';') : '',
          day_price: car.day_price || 0,
          week_price: car.week_price || 0,
          month_price: car.month_price || 0,
          daily_rate: car.daily_rate || 0,
          weekly_rate: car.weekly_rate || 0,
          monthly_rate: car.monthly_rate || 0,
          additional_driver_cost: car.additional_driver_cost || 0,
          cdw_cost: car.cdw_cost || 0,
          insurance_cost: car.insurance_cost || 0,
          units_available: car.units_available || 1,
          // Year variant fields (empty for non-variant cars)
          variant_id: '',
          model_year: '',
          variant_daily_price: 0,
          variant_weekly_price: 0,
          variant_monthly_price: 0,
          variant_units_available: 0,
          is_variant: 'No',
          variant_index: 0,
          created_at: car.created_at,
          updated_at: car.updated_at
        });
      }
    });

    // Generate CSV
    const csv = stringify(csvData, {
      header: true,
      columns: [
        'id', 'name', 'category_id', 'category_name', 'description',
        'doors', 'seats', 'luggage', 'engine_capacity', 'fuel_type', 'transmission',
        'has_ac', 'has_air_bags', 'has_audio_input', 'has_car_kit', 'has_gps', 'has_music', 'has_seat_belts',
        'single_image', 'gallery_images',
        'day_price', 'week_price', 'month_price', 'daily_rate', 'weekly_rate', 'monthly_rate',
        'additional_driver_cost', 'cdw_cost', 'insurance_cost', 'units_available',
        // Year variant columns
        'variant_id', 'model_year', 'variant_daily_price', 'variant_weekly_price', 'variant_monthly_price',
        'variant_units_available', 'is_variant', 'variant_index',
        'created_at', 'updated_at'
      ]
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=cars-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('❌ Export cars error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to export cars',
      error: error.message
    });
  }
};

/**
 * Handle car variants for import/export
 * @param {string} carId - Car ID
 * @param {object} record - CSV record data
 */
async function handleCarVariants(carId, record) {
  try {
    // Only process variants if this is a variant row
    if (record.is_variant === 'Yes' && record.model_year) {
      const variantId = record.variant_id || require('uuid').v4();
      
      // Check if variant exists
      const [existingVariant] = await pool.query(
        'SELECT id FROM car_variants WHERE id = ? OR (car_id = ? AND model_year = ?) LIMIT 1',
        [variantId, carId, parseInt(record.model_year)]
      );
      
      if (existingVariant.length > 0) {
        // Update existing variant
        await pool.query(`
          UPDATE car_variants SET
            model_year = ?,
            daily_price = ?,
            weekly_price = ?,
            monthly_price = ?,
            units_available = ?
          WHERE id = ?
        `, [
          parseInt(record.model_year),
          parseFloat(record.variant_daily_price) || 0,
          parseFloat(record.variant_weekly_price) || 0,
          parseFloat(record.variant_monthly_price) || 0,
          parseInt(record.variant_units_available) || 1,
          existingVariant[0].id
        ]);
      } else {
        // Insert new variant
        await pool.query(`
          INSERT INTO car_variants (
            id, car_id, model_year, daily_price, weekly_price, monthly_price, units_available
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          variantId,
          carId,
          parseInt(record.model_year),
          parseFloat(record.variant_daily_price) || 0,
          parseFloat(record.variant_weekly_price) || 0,
          parseFloat(record.variant_monthly_price) || 0,
          parseInt(record.variant_units_available) || 1
        ]);
      }
    }
  } catch (error) {
    console.error('Error handling car variants:', error.message);
    throw error;
  }
}

/**
 * Import cars from CSV
 * POST /api/cars/import
 * Body: FormData with 'file' field containing CSV
 */
exports.importCars = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Parse CSV
    const csvContent = req.file.buffer.toString('utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    if (!records || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is empty or invalid'
      });
    }

    let imported = 0;
    let updated = 0;
    let errors = [];

    for (const record of records) {
      try {
        // Validate required fields
        if (!record.name) {
          errors.push(`Row skipped: Missing name`);
          continue;
        }

        // Resolve/validate category
        let categoryId = record.category_id || null;
        let categoryName = record.category_name || null;

        if (categoryId) {
          const [categoryById] = await pool.query(
            "SELECT id, name FROM categories WHERE id = ? LIMIT 1",
            [categoryId]
          );

          if (!categoryById || categoryById.length === 0) {
            categoryId = null;
          } else if (!categoryName) {
            categoryName = categoryById[0].name;
          }
        }

        if (!categoryId && categoryName) {
          const [categoryByName] = await pool.query(
            "SELECT id, name FROM categories WHERE name = ? LIMIT 1",
            [categoryName]
          );

          if (categoryByName && categoryByName.length > 0) {
            categoryId = categoryByName[0].id;
            categoryName = categoryByName[0].name;
          }
        }

        if (!categoryId) {
          errors.push(
            `Row skipped for "${record.name}": Invalid category (category_id="${record.category_id || ''}", category_name="${record.category_name || ''}")`
          );
          continue;
        }

        // Parse gallery (semicolon-separated)
        const galleryImages = record.gallery_images ? record.gallery_images.split(';').map(g => g.trim()).filter(Boolean) : [];

        // Check if car exists (by ID or name)
        const [existing] = await pool.query(
          'SELECT id FROM cars WHERE id = ? OR name = ? LIMIT 1',
          [record.id || null, record.name]
        );

        if (existing.length > 0) {
          // Update existing car
          await pool.query(`
            UPDATE cars SET
              name = ?,
              category_id = ?,
              category_name = ?,
              description = ?,
              doors = ?,
              seats = ?,
              luggage = ?,
              engine_capacity = ?,
              fuel_type = ?,
              transmission = ?,
              has_ac = ?,
              has_air_bags = ?,
              has_audio_input = ?,
              has_car_kit = ?,
              has_gps = ?,
              has_music = ?,
              has_seat_belts = ?,
              single_image = ?,
              gallery_images = ?,
              day_price = ?,
              week_price = ?,
              month_price = ?,
              daily_rate = ?,
              weekly_rate = ?,
              monthly_rate = ?,
              additional_driver_cost = ?,
              cdw_cost = ?,
              insurance_cost = ?,
              units_available = ?,
              updated_at = NOW()
            WHERE id = ?
          `, [
            record.name,
            categoryId,
            categoryName,
            record.description || null,
            parseInt(record.doors) || 4,
            parseInt(record.seats) || 5,
            parseInt(record.luggage) || 2,
            record.engine_capacity || null,
            record.fuel_type || null,
            record.transmission || null,
            record.has_ac === 'Yes' ? 1 : 0,
            record.has_air_bags === 'Yes' ? 1 : 0,
            record.has_audio_input === 'Yes' ? 1 : 0,
            record.has_car_kit === 'Yes' ? 1 : 0,
            record.has_gps === 'Yes' ? 1 : 0,
            record.has_music === 'Yes' ? 1 : 0,
            record.has_seat_belts === 'Yes' ? 1 : 0,
            record.single_image || null,
            JSON.stringify(galleryImages),
            parseFloat(record.day_price) || 0,
            parseFloat(record.week_price) || 0,
            parseFloat(record.month_price) || 0,
            parseFloat(record.daily_rate) || 0,
            parseFloat(record.weekly_rate) || 0,
            parseFloat(record.monthly_rate) || 0,
            parseFloat(record.additional_driver_cost) || 0,
            parseFloat(record.cdw_cost) || 0,
            parseFloat(record.insurance_cost) || 0,
            parseInt(record.units_available) || 1,
            existing[0].id
          ]);
          updated++;
          
          // Handle year variants for existing car
          await handleCarVariants(existing[0].id, record);
          
        } else {
          // Insert new car
          const carId = require('uuid').v4();
          await pool.query(`
            INSERT INTO cars (
              id, name, category_id, category_name, description, doors, seats, luggage,
              engine_capacity, fuel_type, transmission,
              has_ac, has_air_bags, has_audio_input, has_car_kit, has_gps, has_music, has_seat_belts,
              single_image, gallery_images,
              day_price, week_price, month_price, daily_rate, weekly_rate, monthly_rate,
              additional_driver_cost, cdw_cost, insurance_cost, units_available
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            carId,
            record.name,
            categoryId,
            categoryName,
            record.description || null,
            parseInt(record.doors) || 4,
            parseInt(record.seats) || 5,
            parseInt(record.luggage) || 2,
            record.engine_capacity || null,
            record.fuel_type || null,
            record.transmission || null,
            record.has_ac === 'Yes' ? 1 : 0,
            record.has_air_bags === 'Yes' ? 1 : 0,
            record.has_audio_input === 'Yes' ? 1 : 0,
            record.has_car_kit === 'Yes' ? 1 : 0,
            record.has_gps === 'Yes' ? 1 : 0,
            record.has_music === 'Yes' ? 1 : 0,
            record.has_seat_belts === 'Yes' ? 1 : 0,
            record.single_image || null,
            JSON.stringify(galleryImages),
            parseFloat(record.day_price) || 0,
            parseFloat(record.week_price) || 0,
            parseFloat(record.month_price) || 0,
            parseFloat(record.daily_rate) || 0,
            parseFloat(record.weekly_rate) || 0,
            parseFloat(record.monthly_rate) || 0,
            parseFloat(record.additional_driver_cost) || 0,
            parseFloat(record.cdw_cost) || 0,
            parseFloat(record.insurance_cost) || 0,
            parseInt(record.units_available) || 1
          ]);
          
          // Handle year variants for new car
          await handleCarVariants(carId, record);
          imported++;
        }
      } catch (rowError) {
        console.error('Row import error:', rowError.message);
        errors.push(`Error importing "${record.name}": ${rowError.message}`);
      }
    }

    res.json({
      success: true,
      message: `Import completed: ${imported} new, ${updated} updated`,
      details: {
        imported,
        updated,
        total: records.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('❌ Import cars error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to import cars',
      error: error.message
    });
  }
};

/**
 * Download CSV template
 * GET /api/cars/template
 */
exports.downloadTemplate = async (req, res) => {
  try {
    const template = [
      {
        id: '',
        name: 'Toyota Camry',
        category_id: 'your-category-uuid-here',
        category_name: 'Sedan',
        description: 'Comfortable and reliable sedan',
        doors: '4',
        seats: '5',
        luggage: '3',
        engine_capacity: '2.5',
        fuel_type: 'Petrol',
        transmission: 'Automatic',
        has_ac: 'Yes',
        has_air_bags: 'Yes',
        has_audio_input: 'Yes',
        has_car_kit: 'No',
        has_gps: 'Yes',
        has_music: 'Yes',
        has_seat_belts: 'Yes',
        single_image: 'https://example.com/image.jpg',
        gallery_images: 'https://example.com/img1.jpg;https://example.com/img2.jpg',
        day_price: '150',
        week_price: '900',
        month_price: '3000',
        daily_rate: '150',
        weekly_rate: '900',
        monthly_rate: '3000',
        additional_driver_cost: '50',
        cdw_cost: '30',
        insurance_cost: '40',
        units_available: '1',
        // Year variant fields
        variant_id: '',
        model_year: '',
        variant_daily_price: '0',
        variant_weekly_price: '0',
        variant_monthly_price: '0',
        variant_units_available: '0',
        is_variant: 'No',
        variant_index: '0',
        created_at: '',
        updated_at: ''
      },
      {
        id: '',
        name: 'Toyota Camry',
        category_id: 'your-category-uuid-here',
        category_name: 'Sedan',
        description: '2024 model variant',
        doors: '4',
        seats: '5',
        luggage: '3',
        engine_capacity: '2.5',
        fuel_type: 'Petrol',
        transmission: 'Automatic',
        has_ac: 'Yes',
        has_air_bags: 'Yes',
        has_audio_input: 'Yes',
        has_car_kit: 'No',
        has_gps: 'Yes',
        has_music: 'Yes',
        has_seat_belts: 'Yes',
        single_image: 'https://example.com/image.jpg',
        gallery_images: 'https://example.com/img1.jpg;https://example.com/img2.jpg',
        day_price: '150',
        week_price: '900',
        month_price: '3000',
        daily_rate: '150',
        weekly_rate: '900',
        monthly_rate: '3000',
        additional_driver_cost: '50',
        cdw_cost: '30',
        insurance_cost: '40',
        units_available: '1',
        // Year variant fields
        variant_id: 'variant-uuid-here',
        model_year: '2024',
        variant_daily_price: '160',
        variant_weekly_price: '950',
        variant_monthly_price: '3200',
        variant_units_available: '2',
        is_variant: 'Yes',
        variant_index: '1',
        created_at: '',
        updated_at: ''
      }
    ];

    const csv = stringify(template, {
      header: true,
      columns: [
        'id', 'name', 'category_id', 'category_name', 'description',
        'doors', 'seats', 'luggage', 'engine_capacity', 'fuel_type', 'transmission',
        'has_ac', 'has_air_bags', 'has_audio_input', 'has_car_kit', 'has_gps', 'has_music', 'has_seat_belts',
        'single_image', 'gallery_images',
        'day_price', 'week_price', 'month_price', 'daily_rate', 'weekly_rate', 'monthly_rate',
        'additional_driver_cost', 'cdw_cost', 'insurance_cost', 'units_available',
        // Year variant columns
        'variant_id', 'model_year', 'variant_daily_price', 'variant_weekly_price', 'variant_monthly_price',
        'variant_units_available', 'is_variant', 'variant_index',
        'created_at', 'updated_at'
      ]
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=cars-import-template.csv');
    res.send(csv);

  } catch (error) {
    console.error('❌ Template download error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
      error: error.message
    });
  }
};
