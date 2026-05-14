const cloudinary = require("../config/cloudinary");
const ftpService = require("./ftpService");

class ImageStorageService {
  constructor() {
    this.storageTypes = {
      CLOUDINARY: 'cloudinary',
      FTP: 'ftp',
      BOTH: 'both'
    };
  }

  // Determine which storage to use based on configuration or request
  getStorageType(preferredType = null) {
    const defaultType = process.env.DEFAULT_IMAGE_STORAGE || 'cloudinary';
    return preferredType || defaultType;
  }

  // Upload image to specified storage(s)
  async uploadImage(buffer, filename, carId, storageType = null, imageType = 'main') {
    const type = this.getStorageType(storageType);
    const results = {};

    try {
      if (type === this.storageTypes.CLOUDINARY || type === this.storageTypes.BOTH) {
        results.cloudinary = await this.uploadToCloudinary(buffer, filename);
      }

      if (type === this.storageTypes.FTP || type === this.storageTypes.BOTH) {
        const ftpPath = ftpService.getCarImagePath(carId, imageType);
        const ftpFilename = ftpService.generateFilename(filename, carId, imageType);
        results.ftp = await ftpService.uploadFile(buffer, ftpPath, ftpFilename);
      }

      return {
        success: true,
        storageType: type,
        urls: results
      };
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  }

  // Upload to Cloudinary
  async uploadToCloudinary(buffer, filename) {
    try {
      const result = await cloudinary.uploader.upload_stream_promise(buffer);
      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  // Upload multiple images (gallery)
  async uploadGallery(files, carId, storageType = null) {
    const type = this.getStorageType(storageType);
    const uploadPromises = files.map(async (file, index) => {
      return await this.uploadImage(
        file.buffer, 
        file.originalname, 
        carId, 
        type, 
        'gallery'
      );
    });

    try {
      const results = await Promise.all(uploadPromises);
      
      // Extract URLs by storage type
      const cloudinaryUrls = results
        .filter(r => r.urls.cloudinary)
        .map(r => r.urls.cloudinary);
      
      const ftpUrls = results
        .filter(r => r.urls.ftp)
        .map(r => r.urls.ftp);

      return {
        success: true,
        storageType: type,
        cloudinary: cloudinaryUrls,
        ftp: ftpUrls,
        all: type === this.storageTypes.BOTH 
          ? [...cloudinaryUrls, ...ftpUrls]
          : cloudinaryUrls.length > 0 
            ? cloudinaryUrls 
            : ftpUrls
      };
    } catch (error) {
      console.error('Gallery upload error:', error);
      throw error;
    }
  }

  // Delete image from storage
  async deleteImage(imageUrl, storageType = null) {
    const type = this.getStorageType(storageType);
    const results = {};

    try {
      if (type === this.storageTypes.CLOUDINARY || type === this.storageTypes.BOTH) {
        if (imageUrl && imageUrl.includes('cloudinary')) {
          const publicId = imageUrl.split("/").pop().split(".")[0];
          results.cloudinary = await cloudinary.uploader.destroy(publicId);
        }
      }

      if (type === this.storageTypes.FTP || type === this.storageTypes.BOTH) {
        if (imageUrl && imageUrl.includes(process.env.FTP_BASE_URL)) {
          const relativePath = imageUrl.replace(process.env.FTP_BASE_URL, '');
          results.ftp = await ftpService.deleteFile(relativePath);
        }
      }

      return {
        success: true,
        storageType: type,
        results
      };
    } catch (error) {
      console.error('Image delete error:', error);
      throw error;
    }
  }

  // Delete multiple images
  async deleteGallery(imageUrls, storageType = null) {
    const type = this.getStorageType(storageType);
    const deletePromises = imageUrls.map(url => 
      this.deleteImage(url, type)
    );

    try {
      const results = await Promise.all(deletePromises);
      return {
        success: true,
        storageType: type,
        results
      };
    } catch (error) {
      console.error('Gallery delete error:', error);
      throw error;
    }
  }

  // Get image URL based on storage preference
  getImageUrl(carData, imageType = 'main', preferredStorage = null) {
    const storage = preferredStorage || carData.image_storage_type || 'cloudinary';

    if (imageType === 'main') {
      if (storage === 'ftp' || (storage === 'both' && carData.ftp_single_image)) {
        return carData.ftp_single_image || carData.single_image;
      }
      return carData.single_image;
    } else {
      // Gallery images
      const ftpGallery = carData.ftp_gallery_images 
        ? (typeof carData.ftp_gallery_images === 'string' 
            ? JSON.parse(carData.ftp_gallery_images) 
            : carData.ftp_gallery_images)
        : [];

      const cloudinaryGallery = carData.gallery_images 
        ? (typeof carData.gallery_images === 'string' 
            ? JSON.parse(carData.gallery_images) 
            : carData.gallery_images)
        : [];

      if (storage === 'ftp' || (storage === 'both' && ftpGallery.length > 0)) {
        return ftpGallery.length > 0 ? ftpGallery : cloudinaryGallery;
      }
      return cloudinaryGallery;
    }
  }

  // Format car data with appropriate image URLs
  formatCarWithImages(carData, preferredStorage = null) {
    return {
      ...carData,
      image: this.getImageUrl(carData, 'main', preferredStorage),
      gallery: this.getImageUrl(carData, 'gallery', preferredStorage),
      imageStorageType: carData.image_storage_type || 'cloudinary'
    };
  }
}

module.exports = new ImageStorageService();
