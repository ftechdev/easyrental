const express = require('express');
const router = express.Router();
const multer = require('multer');
const { addCarFTP, updateCarFTP, deleteCarFTP } = require('../controller/carsControllerFTP');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Routes for FTP-based car management
router.post('/cars', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }
]), addCarFTP);

router.put('/cars/:id', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }
]), updateCarFTP);

router.delete('/cars/:id', deleteCarFTP);

module.exports = router;
