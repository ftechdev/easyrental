const ftpService = require("../services/ftpService");
const pool = require("../config/DB");

// Utility to safely parse JSON
const safeJsonParse = (input, fallback = []) => {
  try {
    return typeof input === "string" ? JSON.parse(input) : input || fallback;
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

// ADD CAR WITH FTP STORAGE
const addCarFTP = async (req, res) => {
  try {
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

    // Validate category exists
    const [categoryCheck] = await pool.query(
      "SELECT id FROM categories WHERE id = ? LIMIT 1",
      [body.categoryId]
    );

    if (!categoryCheck || categoryCheck.length === 0) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: `Invalid categoryId: Category with id '${body.categoryId}' does not exist`,
      });
    }

    // Generate car ID for FTP path
    const carId = require('uuid').v4();
    
    // Upload images to FTP
    let imageUrl = "";
    let galleryUrls = [];

    try {
      // Upload main image
      if (req.files?.image?.[0]) {
        const imagePath = ftpService.getCarImagePath(carId, 'main');
        const filename = ftpService.generateFilename(req.files.image[0].originalname, carId, 'main');
        imageUrl = await ftpService.uploadFile(req.files.image[0].buffer, imagePath, filename);
      }

      // Upload gallery images
      if (req.files?.gallery?.length) {
        const galleryPath = ftpService.getCarImagePath(carId, 'gallery');
        
        galleryUrls = await Promise.all(
          req.files.gallery.map(async (file) => {
            const filename = ftpService.generateFilename(file.originalname, carId, 'gallery');
            return await ftpService.uploadFile(file.buffer, galleryPath, filename);
          })
        );
      }
    } catch (uploadError) {
      console.error("FTP upload error:", uploadError);
      return res.status(500).json({
        success: false,
        code: 500,
        message: "Failed to upload images to FTP",
        error: uploadError.message,
      });
    }

    // Parse car data
    const doors = parseInt(body.doors, 10) || 0;
    const seats = parseInt(body.seats, 10) || 0;
    const luggage = parseInt(body.luggage, 10) || 0;
    const fuelType = body.fuelType || null;
    const transmission = body.transmission || null;
    const hasAc = body.airConditioning === true || body.airConditioning === "true";
    const dailyRate = Number(body.pricing?.daily) || 0;
    const weeklyRate = Number(body.pricing?.weekly) || 0;
    const monthlyRate = Number(body.pricing?.monthly) || 0;

    // Insert car with FTP image URLs
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
        ftp_single_image,
        ftp_gallery_images,
        image_storage_type,
        ftp_image_path,
        daily_rate,
        weekly_rate,
        monthly_rate,
        day_price,
        week_price,
        month_price
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        carId,
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
        'ftp',
        ftpService.getCarImagePath(carId),
        dailyRate,
        weeklyRate,
        monthlyRate,
        dailyRate,
        weeklyRate,
        monthlyRate,
      ]
    );

    const newCar = {
      id: carId,
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
      ftp_single_image: imageUrl,
      ftp_gallery_images: galleryUrls,
      image_storage_type: 'ftp',
      ftp_image_path: ftpService.getCarImagePath(carId),
      daily_rate: dailyRate,
      weekly_rate: weeklyRate,
      monthly_rate: monthlyRate,
    };

    res.status(201).json({
      success: true,
      code: 201,
      message: "Car Added successfully with FTP storage",
      data: formatCarFTP(newCar),
    });
  } catch (error) {
    console.error("Error in addCarFTP:", error);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to add car",
      error: error.message,
    });
  }
};

// Format car data for FTP storage
const formatCarFTP = (row) => ({
  categoryId: row.category_id || null,
  categoryName: row.category_name || null,
  name: row.name || null,
  carCategory: row.category_name || null,
  description: row.description || null,
  features: row.is_featured ? ['featured'] : null,
  doors: row.doors ?? null,
  seats: row.seats ?? null,
  luggage: row.luggage ?? null,
  engine: row.engine_capacity || null,
  fuelType: row.fuel_type || null,
  transmission: row.transmission || null,
  airConditioning: row.has_ac === 1,
  pricing: {
    daily: parseFloat(row.daily_rate) || null,
    weekly: parseFloat(row.weekly_rate) || null,
    monthly: parseFloat(row.monthly_rate) || null,
  },
  locations: null,
  image: row.ftp_single_image || null,
  gallery: row.ftp_gallery_images ? safeJsonParse(row.ftp_gallery_images, []) : null,
  carId: row.id || null,
  imageStorageType: row.image_storage_type || 'ftp',
  imagePath: row.ftp_image_path || null,
});

// UPDATE CAR WITH FTP
const updateCarFTP = async (req, res) => {
  const { id } = req.params;

  try {
    const body = req.body || {};
    const updates = {
      ...body,
      features: safeJsonParse(body.features, []),
      pricing: safeJsonParse(body.pricing, {}),
      locations: safeJsonParse(body.locations, []),
    };

    // Get existing car data
    const [existingCarRows] = await pool.query(
      "SELECT ftp_single_image, ftp_gallery_images, ftp_image_path FROM cars WHERE id = ? LIMIT 1",
      [id]
    );
    const existingCar = existingCarRows?.[0];

    if (!existingCar) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Car not found",
      });
    }

    let imageUrl = updates.image;
    let galleryUrls = updates.gallery;

    // Handle new image uploads
    if (req.files?.image?.[0]) {
      try {
        const imagePath = ftpService.getCarImagePath(id, 'main');
        const filename = ftpService.generateFilename(req.files.image[0].originalname, id, 'main');
        imageUrl = await ftpService.uploadFile(req.files.image[0].buffer, imagePath, filename);
      } catch (uploadError) {
        console.error("FTP image upload error:", uploadError);
        return res.status(500).json({
          success: false,
          code: 500,
          message: "Failed to upload main image to FTP",
          error: uploadError.message,
        });
      }
    } else if (updates.keepExistingImage === "true") {
      imageUrl = existingCar.ftp_single_image;
    }

    if (req.files?.gallery?.length) {
      try {
        const galleryPath = ftpService.getCarImagePath(id, 'gallery');
        galleryUrls = await Promise.all(
          req.files.gallery.map(async (file) => {
            const filename = ftpService.generateFilename(file.originalname, id, 'gallery');
            return await ftpService.uploadFile(file.buffer, galleryPath, filename);
          })
        );
      } catch (uploadError) {
        console.error("FTP gallery upload error:", uploadError);
        return res.status(500).json({
          success: false,
          code: 500,
          message: "Failed to upload gallery images to FTP",
          error: uploadError.message,
        });
      }
    } else if (updates.keepExistingGallery === "true") {
      galleryUrls = safeJsonParse(existingCar.ftp_gallery_images, []);
    }

    // Build update query
    const fields = [];
    const values = [];

    if (typeof imageUrl !== "undefined") {
      fields.push("ftp_single_image = ?");
      values.push(imageUrl || null);
    }
    if (typeof galleryUrls !== "undefined") {
      fields.push("ftp_gallery_images = ?");
      values.push(JSON.stringify(galleryUrls || []));
    }
    if (updates.name !== undefined && updates.name !== null && updates.name.trim() !== "") {
      fields.push("name = ?");
      values.push(updates.name.trim());
    }
    if (typeof updates.description !== "undefined") {
      fields.push("description = ?");
      values.push(updates.description || null);
    }
    if (updates.pricing?.daily !== undefined) {
      const dailyRate = Number(updates.pricing.daily);
      fields.push("daily_rate = ?", "day_price = ?");
      values.push(dailyRate, dailyRate);
    }
    if (updates.pricing?.weekly !== undefined) {
      const weeklyRate = Number(updates.pricing.weekly);
      fields.push("weekly_rate = ?", "week_price = ?");
      values.push(weeklyRate, weeklyRate);
    }
    if (updates.pricing?.monthly !== undefined) {
      const monthlyRate = Number(updates.pricing.monthly);
      fields.push("monthly_rate = ?", "month_price = ?");
      values.push(monthlyRate, monthlyRate);
    }

    if (!fields.length) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "No valid fields to update",
      });
    }

    values.push(id);

    const [result] = await pool.query(
      `UPDATE cars SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Car not found",
      });
    }

    const [rows] = await pool.query("SELECT * FROM cars WHERE id = ? LIMIT 1", [id]);
    const updatedCar = rows[0];

    res.status(200).json({
      success: true,
      code: 200,
      message: "Car updated successfully with FTP storage",
      data: formatCarFTP(updatedCar),
    });
  } catch (error) {
    console.error("Update car FTP error:", error);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to update car",
      error: error.message,
    });
  }
};

// DELETE CAR WITH FTP CLEANUP
const deleteCarFTP = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query("SELECT * FROM cars WHERE id = ? LIMIT 1", [id]);
    const car = rows[0];

    if (!car) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Car not found",
      });
    }

    // Delete FTP images if they exist
    if (car.ftp_single_image) {
      try {
        const filename = car.ftp_single_image.split('/').pop();
        await ftpService.deleteFile(`${car.ftp_image_path}/main/${filename}`);
      } catch (error) {
        console.error("Failed to delete FTP main image:", error.message);
      }
    }

    const gallery = car.ftp_gallery_images 
      ? safeJsonParse(car.ftp_gallery_images, [])
      : [];

    if (Array.isArray(gallery)) {
      for (const url of gallery) {
        try {
          const filename = url.split('/').pop();
          await ftpService.deleteFile(`${car.ftp_image_path}/gallery/${filename}`);
        } catch (error) {
          console.error("Failed to delete FTP gallery image:", error.message);
        }
      }
    }

    const [result] = await pool.query("DELETE FROM cars WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Car not found",
      });
    }

    res.status(200).json({
      success: true,
      code: 200,
      message: "Car deleted successfully with FTP cleanup",
    });
  } catch (error) {
    console.error("Delete car FTP error:", error);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to delete car",
      error: error.message,
    });
  }
};

module.exports = {
  addCarFTP,
  updateCarFTP,
  deleteCarFTP,
  formatCarFTP,
};
