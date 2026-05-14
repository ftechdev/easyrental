const Client = require('basic-ftp');

class FTPService {
  constructor() {
    this.client = new Client();
    this.config = {
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASS,
      port: parseInt(process.env.FTP_PORT) || 21,
      secure: false
    };
    this.baseUrl = process.env.FTP_BASE_URL || 'https://amirhost.in/easyrental/';
  }

  async connect() {
    try {
      await this.client.access(this.config);
      console.log('✅ FTP connected successfully');
      return true;
    } catch (error) {
      console.error('❌ FTP connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    try {
      this.client.close();
      console.log('✅ FTP disconnected');
    } catch (error) {
      console.error('❌ FTP disconnect error:', error.message);
    }
  }

  async uploadFile(buffer, remotePath, filename) {
    try {
      await this.connect();
      
      // Ensure directory exists
      const dirPath = remotePath.startsWith('/') ? remotePath.substring(1) : remotePath;
      if (dirPath) {
        try {
          await this.client.ensureDir(dirPath);
        } catch (error) {
          // Directory might already exist, continue
          console.log('Directory creation info:', error.message);
        }
      }

      // Upload file
      const fullPath = dirPath ? `${dirPath}/${filename}` : filename;
      await this.client.uploadFrom(buffer, fullPath);
      
      // Construct public URL
      const publicUrl = `${this.baseUrl}${fullPath}`;
      
      await this.disconnect();
      
      console.log(`✅ File uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      await this.disconnect();
      console.error('❌ FTP upload failed:', error.message);
      throw error;
    }
  }

  async deleteFile(remotePath) {
    try {
      await this.connect();
      
      // Remove leading slash if present
      const filePath = remotePath.startsWith('/') ? remotePath.substring(1) : remotePath;
      
      await this.client.remove(filePath);
      await this.disconnect();
      
      console.log(`✅ File deleted successfully: ${filePath}`);
      return true;
    } catch (error) {
      await this.disconnect();
      console.error('❌ FTP delete failed:', error.message);
      throw error;
    }
  }

  async listFiles(remotePath = '/') {
    try {
      await this.connect();
      
      const files = await this.client.list(remotePath);
      await this.disconnect();
      
      return files;
    } catch (error) {
      await this.disconnect();
      console.error('❌ FTP list failed:', error.message);
      throw error;
    }
  }

  // Generate unique filename for uploaded images
  generateFilename(originalName, carId, type = 'image') {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    const randomString = Math.random().toString(36).substring(2, 8);
    
    return `${type}_${carId}_${timestamp}_${randomString}.${extension}`;
  }

  // Construct FTP path for car images
  getCarImagePath(carId, imageType = 'images') {
    return `cars/${carId}/${imageType}`;
  }
}

module.exports = new FTPService();
