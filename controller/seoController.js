const pool = require("../config/DB");

// GET SEO for a specific page path
const getSeoByPath = async (req, res) => {
  try {
    const { path } = req.query;
    if (!path) {
      return res.status(400).json({
        success: false,
        message: "Path is required",
      });
    }

    const [rows] = await pool.query(
      "SELECT * FROM seo_metadata WHERE page_path = ?",
      [path]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Error in getSeoByPath:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// GET all SEO metadata
const getAllSeo = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM seo_metadata ORDER BY page_path ASC");
    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Error in getAllSeo:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// UPSERT SEO metadata
const upsertSeo = async (req, res) => {
  try {
    const { page_path, title, description, keywords, og_image, og_type } = req.body;

    if (!page_path) {
      return res.status(400).json({
        success: false,
        message: "page_path is required",
      });
    }

    // Check if it exists
    const [existing] = await pool.query(
      "SELECT id FROM seo_metadata WHERE page_path = ?",
      [page_path]
    );

    if (existing.length > 0) {
      // Update
      await pool.query(
        `UPDATE seo_metadata 
         SET title = ?, description = ?, keywords = ?, og_image = ?, og_type = ? 
         WHERE page_path = ?`,
        [title, description, keywords, og_image, og_type || 'website', page_path]
      );
    } else {
      // Insert
      await pool.query(
        `INSERT INTO seo_metadata (page_path, title, description, keywords, og_image, og_type) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [page_path, title, description, keywords, og_image, og_type || 'website']
      );
    }

    return res.status(200).json({
      success: true,
      message: "SEO metadata saved successfully",
    });
  } catch (error) {
    console.error("Error in upsertSeo:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// DELETE SEO metadata
const deleteSeo = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM seo_metadata WHERE id = ?", [id]);
    return res.status(200).json({
      success: true,
      message: "SEO metadata deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteSeo:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getSeoByPath,
  getAllSeo,
  upsertSeo,
  deleteSeo,
};
