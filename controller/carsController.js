const cloudinary = require("../config/cloudinary");
const pool = require("../config/DB");

// Utility to safely parse JSON
const safeJsonParse = (input, fallback = {}) => {
  try {
    return typeof input === "string" ? JSON.parse(input) : input;
  } catch {
    return fallback;
  }
};

// Helper to check missing fields
const checkRequiredFields = (obj, fields, parentKey = "") => {
  const missing = [];

  fields.forEach((field) => {
    if (typeof field === "string") {
      if (!obj?.[field]) {
        missing.push(parentKey ? `${parentKey}.${field}` : field);
      }
    } else if (typeof field === "object") {
      const key = Object.keys(field)[0];
      if (!obj?.[key]) {
        missing.push(parentKey ? `${parentKey}.${key}` : key);
      } else {
        missing.push(...checkRequiredFields(obj[key], field[key], `${key}`));
      }
    }
  });

  return missing;
};

// ADD CAR
const addCar = async (req, res) => {
  try {
    // Handle FormData sending "undefined" as string
    const cleanCategoryId = req.body.categoryId && 
                           req.body.categoryId !== "undefined" && 
                           req.body.categoryId.trim() !== "" 
                           ? req.body.categoryId.trim() 
                           : undefined;
    
    const cleanName = req.body.name && 
                     req.body.name !== "undefined" && 
                     req.body.name.trim() !== "" 
                     ? req.body.name.trim() 
                     : undefined;

    const body = {
      ...req.body,
      categoryId: cleanCategoryId,
      name: cleanName,
      features: safeJsonParse(req.body.features, []),
      pricing: safeJsonParse(req.body.pricing),
      locations: safeJsonParse(req.body.locations, []),
    };

    const requiredFields = [
      "categoryId",
      "categoryName",
      "name",
      { pricing: ["daily", "weekly", "monthly"] },
    ];

    const missing = checkRequiredFields(body, requiredFields);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: `Missing required field(s): ${missing.join(", ")}`,
      });
    }

    // Validate that categoryId exists in categories table
    const [categoryCheck] = await pool.query(
      "SELECT id FROM categories WHERE id = ? LIMIT 1",
      [body.categoryId]
    );

    if (!categoryCheck || categoryCheck.length === 0) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: `Invalid categoryId: Category with id '${body.categoryId}' does not exist. Please ensure the category exists before adding a car.`,
      });
    }

    const doors = parseInt(body.doors, 10) || 0;
    const seats = parseInt(body.seats, 10) || 0;
    const luggage = parseInt(body.luggage, 10) || 0;

    // Upload images to Cloudinary
    const imageUrl = req.files?.image?.[0]
      ? (
          await cloudinary.uploader.upload_stream_promise(
            req.files.image[0].buffer
          )
        ).secure_url
      : "";

    const galleryUrls = req.files?.gallery
      ? await Promise.all(
          req.files.gallery.map((file) =>
            cloudinary.uploader
              .upload_stream_promise(file.buffer)
              .then((res) => res.secure_url)
          )
        )
      : [];

    const fuelType = body.fuelType || null;
    const transmission = body.transmission || null;

    const hasAc = body.airConditioning === true || body.airConditioning === "true";

    const dailyRate = Number(body.pricing?.daily) || 0;
    const weeklyRate = Number(body.pricing?.weekly) || 0;
    const monthlyRate = Number(body.pricing?.monthly) || 0;

    const [result] = await pool.query(
      `INSERT INTO cars (
        id,
        category_id,
        category_name,
        name,
        description,
        doors,
        seats,
        luggage,
        engine_capacity,
        fuel_type,
        transmission,
        has_ac,
        single_image,
        gallery_images,
        day_price,
        week_price,
        month_price,
        hour_price,
        daily_rate,
        weekly_rate,
        monthly_rate
      ) VALUES (
        UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        body.categoryId,
        body.categoryName,
        body.name,
        body.description || null,
        doors,
        seats,
        luggage,
        body.engine || null,
        fuelType,
        transmission,
        hasAc ? 1 : 0,
        imageUrl,
        JSON.stringify(galleryUrls),
        dailyRate,
        weeklyRate,
        monthlyRate,
        0,
        dailyRate,
        weeklyRate,
        monthlyRate,
      ]
    );

    const insertedId = result.insertId || null;

    const newCar = {
      id: insertedId,
      category_id: body.categoryId,
      category_name: body.categoryName,
      name: body.name,
      description: body.description || null,
      doors,
      seats,
      luggage,
      engine_capacity: body.engine || null,
      fuel_type: fuelType,
      transmission,
      has_ac: hasAc ? 1 : 0,
      single_image: imageUrl,
      gallery_images: galleryUrls,
      daily_rate: dailyRate,
      weekly_rate: weeklyRate,
      monthly_rate: monthlyRate,
    };

    res.status(201).json({
      success: true,
      code: 201,
      message: "Car Added successfully",
      data: formatCar(newCar),
    });
  } catch (error) {
    console.error("Error in addCar:", error);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to add car",
      error: error.message,
    });
  }
};

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
  gallery: row.images ? safeJsonParse(row.images, []) : null,
  carId: row.id || null,
  modelYear: row.year || null,
  availableYears: row.available_years ? row.available_years.split(',').map(y => parseInt(y)) : null,
});

// GET ALL CARS (with lowest price from variants)
const getCars = async (_req, res) => {
  try {
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
    `;
    
    const [rows] = await pool.query(query);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        code: 404,
        data: [],
        message: "No cars found",
      });
    }

    res.status(200).json({
      success: true,
      code: 200,
      message: "Cars retrieved successfully",
      data: rows.map(formatCar),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to fetch cars",
      error: error.message,
    });
  }
};

// GET CAR BY ID
const getCarById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query("SELECT * FROM cars WHERE id = ? LIMIT 1", [
      id,
    ]);

    const car = rows[0];

    if (!car) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Car not found",
      });
    }

    res.status(200).json({
      success: true,
      code: 200,
      message: "Car retrieved successfully",
      data: formatCar(car),
    });
  } catch (error) {
    console.error("Error fetching car:", error.message);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to get car",
      error: error.message,
    });
  }
};

// UPDATE CAR
const updateCar = async (req, res) => {
  const { id } = req.params;

  try {
    const body = req.body || {};
    console.log("📝 Update car request body:", body);
    console.log("📁 Files:", req.files);

    // Parse JSON fields but keep all other body fields
    const updates = {
      ...body,
      features: safeJsonParse(body.features, []),
      pricing: safeJsonParse(body.pricing, {}),
      locations: safeJsonParse(body.locations, []),
    };
    
    console.log("🔄 Parsed updates:", updates);
    console.log("🔄 Original body keys:", Object.keys(body));

    // Get existing car data to preserve images if needed
    const [existingCarRows] = await pool.query(
      "SELECT single_image, gallery_images FROM cars WHERE id = ? LIMIT 1",
      [id]
    );
    const existingCar = existingCarRows?.[0];

    let imageUrl = updates.image;
    if (req.files?.image?.[0]) {
      imageUrl = (
        await cloudinary.uploader.upload_stream_promise(
          req.files.image[0].buffer
        )
      ).secure_url;
    } else if (updates.keepExistingImage === "true" && existingCar) {
      imageUrl = existingCar.single_image;
    }

    let galleryUrls = updates.gallery;
    if (req.files?.gallery?.length) {
      galleryUrls = await Promise.all(
        req.files.gallery.map((file) =>
          cloudinary.uploader
            .upload_stream_promise(file.buffer)
            .then((res) => res.secure_url)
        )
      );
    } else if (updates.keepExistingGallery === "true" && existingCar) {
      galleryUrls = safeJsonParse(existingCar.gallery_images, []);
    }

    const doors = updates.doors ? parseInt(updates.doors, 10) : undefined;
    const seats = updates.seats ? parseInt(updates.seats, 10) : undefined;
    const luggage = updates.luggage ? parseInt(updates.luggage, 10) : undefined;

    const dailyRate = updates.pricing?.daily
      ? Number(updates.pricing.daily)
      : undefined;
    const weeklyRate = updates.pricing?.weekly
      ? Number(updates.pricing.weekly)
      : undefined;
    const monthlyRate = updates.pricing?.monthly
      ? Number(updates.pricing.monthly)
      : undefined;

    const fields = [];
    const values = [];

    console.log("🔍 Checking fields to update:");
    console.log("- categoryId:", updates.categoryId);
    console.log("- categoryName:", updates.categoryName);
    console.log("- name:", updates.name);
    console.log("- doors:", doors);
    console.log("- seats:", seats);
    console.log("- luggage:", luggage);
    console.log("- dailyRate:", dailyRate);
    console.log("- weeklyRate:", weeklyRate);
    console.log("- monthlyRate:", monthlyRate);

    // Validate categoryId if it's being updated
    if (updates.categoryId && updates.categoryId.trim() !== "") {
      const [categoryCheck] = await pool.query(
        "SELECT id FROM categories WHERE id = ? LIMIT 1",
        [updates.categoryId]
      );

      if (!categoryCheck || categoryCheck.length === 0) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: `Invalid categoryId: Category with id '${updates.categoryId}' does not exist`,
        });
      }

      fields.push("category_id = ?");
      values.push(updates.categoryId);
    }
    if (updates.categoryName !== undefined && updates.categoryName !== null) {
      fields.push("category_name = ?");
      values.push(updates.categoryName || null);
    }
    if (updates.name !== undefined && updates.name !== null && updates.name.trim() !== "") {
      fields.push("name = ?");
      values.push(updates.name.trim());
    }
    if (typeof updates.description !== "undefined") {
      fields.push("description = ?");
      values.push(updates.description || null);
    }
    if (typeof doors !== "undefined") {
      fields.push("doors = ?");
      values.push(doors);
    }
    if (typeof seats !== "undefined") {
      fields.push("seats = ?");
      values.push(seats);
    }
    if (typeof luggage !== "undefined") {
      fields.push("luggage = ?");
      values.push(luggage);
    }
    if (typeof updates.engine !== "undefined") {
      fields.push("engine_capacity = ?");
      values.push(updates.engine || null);
    }
    if (typeof updates.fuelType !== "undefined") {
      fields.push("fuel_type = ?");
      values.push(updates.fuelType || null);
    }
    if (typeof updates.transmission !== "undefined") {
      fields.push("transmission = ?");
      values.push(updates.transmission || null);
    }
    if (typeof updates.airConditioning !== "undefined") {
      const hasAc =
        updates.airConditioning === true ||
        updates.airConditioning === "true";
      fields.push("has_ac = ?");
      values.push(hasAc ? 1 : 0);
    }
    if (typeof imageUrl !== "undefined") {
      fields.push("single_image = ?");
      values.push(imageUrl || null);
    }
    if (typeof galleryUrls !== "undefined") {
      fields.push("gallery_images = ?");
      values.push(JSON.stringify(galleryUrls || []));
    }
    if (typeof dailyRate !== "undefined") {
      fields.push("daily_rate = ?", "day_price = ?");
      values.push(dailyRate, dailyRate);
    }
    if (typeof weeklyRate !== "undefined") {
      fields.push("weekly_rate = ?", "week_price = ?");
      values.push(weeklyRate, weeklyRate);
    }
    if (typeof monthlyRate !== "undefined") {
      fields.push("monthly_rate = ?", "month_price = ?");
      values.push(monthlyRate, monthlyRate);
    }
    
    // Handle individual feature flags
    if (updates.features && typeof updates.features === 'object') {
      const featureMap = {
        has_gps: updates.features.has_gps,
        has_music: updates.features.has_music,
        has_seat_belts: updates.features.has_seat_belts,
        has_audio_input: updates.features.has_audio_input,
        has_air_bags: updates.features.has_air_bags,
        has_car_kit: updates.features.has_car_kit,
      };
      
      Object.entries(featureMap).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value ? 1 : 0);
        }
      });
    }

    console.log("📋 Fields to update:", fields);
    console.log("📊 Values:", values);

    if (!fields.length) {
      console.error("❌ No fields to update. Updates object:", updates);
      return res.status(400).json({
        success: false,
        code: 400,
        message: "No valid fields to update. Please check that you're sending valid data.",
        debug: {
          receivedFields: Object.keys(updates),
          categoryId: updates.categoryId,
          name: updates.name,
          pricing: updates.pricing
        }
      });
    }

    values.push(id);

    const [result] = await pool.query(
      `UPDATE cars SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, code: 404, message: "Car not found" });
    }

    const [rows] = await pool.query("SELECT * FROM cars WHERE id = ? LIMIT 1", [
      id,
    ]);
    const updatedCar = rows[0];

    res.status(200).json({
      success: true,
      code: 200,
      message: "Car updated successfully",
      data: formatCar(updatedCar),
    });
  } catch (error) {
    console.error("❌ Update car error details:", {
      message: error.message,
      code: error.code,
      sql: error.sql,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to update car",
      error: error.message,
      debug: {
        sqlMessage: error.sqlMessage,
        code: error.code
      }
    });
  }
};

// DELETE CAR
const deleteCar = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query("SELECT * FROM cars WHERE id = ? LIMIT 1", [
      id,
    ]);
    const car = rows[0];

    if (!car) {
      return res
        .status(404)
        .json({ success: false, code: 404, message: "Car not found" });
    }

    if (car.single_image) {
      const publicId = car.single_image.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    const gallery = car.gallery_images
      ? Array.isArray(car.gallery_images)
        ? car.gallery_images
        : safeJsonParse(car.gallery_images, [])
      : [];

    if (Array.isArray(gallery)) {
      for (const url of gallery) {
        const publicId = url.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }
    }

    const [result] = await pool.query("DELETE FROM cars WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, code: 404, message: "Car not found" });
    }

    res
      .status(200)
      .json({ success: true, code: 200, message: "Car deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to delete car",
      error: error.message,
    });
  }
};

// GET CAR VARIANTS BY CAR ID
const getCarVariants = async (req, res) => {
  const { id } = req.params;

  try {
    const [variants] = await pool.query(
      `SELECT 
        cv.*,
        CONCAT(c.brand, ' ', c.model) as car_name,
        cat.name as category_name
      FROM car_variants cv
      JOIN cars c ON cv.car_id = c.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE cv.car_id = ? AND cv.is_available = true
      ORDER BY cv.year ASC`,
      [id]
    );

    res.status(200).json({
      success: true,
      code: 200,
      message: "Car variants retrieved successfully",
      data: variants.map(v => ({
        variantId: v.id,
        carId: v.car_id,
        modelYear: v.year,
        pricing: {
          daily: v.daily_rate,
          weekly: v.weekly_rate,
          monthly: v.monthly_rate,
        },
        carName: v.car_name,
        categoryName: v.category_name,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to fetch car variants",
      error: error.message,
    });
  }
};

// ADD CAR VARIANT
const addCarVariant = async (req, res) => {
  const { carId, modelYear, pricing, unitsAvailable } = req.body;

  try {
    if (!carId || !modelYear || !pricing?.daily || !pricing?.weekly || !pricing?.monthly) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Missing required fields: carId, modelYear, and pricing (daily, weekly, monthly) are required",
      });
    }

    // Check if car exists
    const [carCheck] = await pool.query("SELECT id FROM cars WHERE id = ? LIMIT 1", [carId]);
    if (!carCheck || carCheck.length === 0) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Car not found",
      });
    }

    // Check if variant already exists
    const [existingVariant] = await pool.query(
      "SELECT id FROM car_variants WHERE car_id = ? AND year = ?",
      [carId, modelYear]
    );

    if (existingVariant && existingVariant.length > 0) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: `A variant for year ${modelYear} already exists for this car`,
      });
    }

    const [result] = await pool.query(
      `INSERT INTO car_variants (
        id, car_id, name, year, daily_rate, weekly_rate, monthly_rate, is_available
      ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, true)`,
      [
        carId,
        `${modelYear} Variant`,
        modelYear,
        pricing.daily,
        pricing.weekly,
        pricing.monthly,
      ]
    );

    res.status(201).json({
      success: true,
      code: 201,
      message: "Car variant added successfully",
      data: {
        carId,
        modelYear,
        pricing,
        unitsAvailable: unitsAvailable || 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to add car variant",
      error: error.message,
    });
  }
};

// UPDATE CAR VARIANT
const updateCarVariant = async (req, res) => {
  const { id } = req.params;
  const { pricing, unitsAvailable, isActive } = req.body;

  try {
    const fields = [];
    const values = [];

    if (pricing?.daily !== undefined) {
      fields.push("daily_rate = ?");
      values.push(pricing.daily);
    }
    if (pricing?.weekly !== undefined) {
      fields.push("weekly_rate = ?");
      values.push(pricing.weekly);
    }
    if (pricing?.monthly !== undefined) {
      fields.push("monthly_rate = ?");
      values.push(pricing.monthly);
    }
    if (isActive !== undefined) {
      fields.push("is_available = ?");
      values.push(isActive ? 1 : 0);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "No fields to update",
      });
    }

    values.push(id);

    const [result] = await pool.query(
      `UPDATE car_variants SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Car variant not found",
      });
    }

    res.status(200).json({
      success: true,
      code: 200,
      message: "Car variant updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to update car variant",
      error: error.message,
    });
  }
};

// DELETE CAR VARIANT
const deleteCarVariant = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query("DELETE FROM car_variants WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Car variant not found",
      });
    }

    res.status(200).json({
      success: true,
      code: 200,
      message: "Car variant deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to delete car variant",
      error: error.message,
    });
  }
};

// GET CAR BY NAME
const getCarByName = async (req, res) => {
  const { name } = req.params;

  try {
    console.log('Searching for car with slug:', name);
    // Try multiple matching strategies
    const slug = name.toLowerCase();
    const carName = name.replace(/-/g, ' ');
    
    // Strategy 1: Try exact match with slugified brand + model
    const exactResult = await pool.query(
      "SELECT * FROM cars WHERE LOWER(CONCAT(brand, ' ', model)) = ? LIMIT 1", 
      [carName]
    );
    const exactRows = exactResult[0];
    
    if (exactRows && exactRows.length > 0) {
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Car retrieved successfully",
        data: formatCar(exactRows[0]),
      });
    }
    
    // Strategy 2: Try exact match with hyphenated slug
    const slugResult = await pool.query(
      "SELECT * FROM cars WHERE LOWER(CONCAT(brand, '-', model)) = ? LIMIT 1", 
      [slug]
    );
    const slugRows = slugResult[0];
    
    if (slugRows && slugRows.length > 0) {
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Car retrieved successfully",
        data: formatCar(slugRows[0]),
      });
    }
    
    // Strategy 3: Try partial match with brand or model
    const partialResult = await pool.query(
      "SELECT * FROM cars WHERE brand LIKE ? OR model LIKE ? OR CONCAT(brand, ' ', model) LIKE ? LIMIT 1", 
      [`%${carName}%`, `%${carName}%`, `%${carName}%`]
    );
    const partialRows = partialResult[0];
    
    const car = partialRows[0];

    if (!car) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Car not found",
      });
    }

    res.status(200).json({
      success: true,
      code: 200,
      message: "Car retrieved successfully",
      data: formatCar(car),
    });
  } catch (error) {
    console.error("Error fetching car by name:", error.message);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to get car",
      error: error.message,
    });
  }
};

// STATIC PRICES
const getAdditionalPrices = (_req, res) => {
  try {
    res.status(200).json({
      success: true,
      code: 200,
      data: { driver: 50, cdw: 25, insurance: 75 },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to get additional prices",
      error: error.message,
    });
  }
};

module.exports = {
  addCar,
  getCars,
  getCarById,
  getCarByName,
  updateCar,
  deleteCar,
  getAdditionalPrices,
  getCarVariants,
  addCarVariant,
  updateCarVariant,
  deleteCarVariant,
};
