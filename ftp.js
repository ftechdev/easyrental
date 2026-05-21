const FtpSrv = require('ftp-srv');
const path = require('path');
require('dotenv').config();

const ftpServer = new FtpSrv({
  url: `ftp://${process.env.FTP_HOST}:${process.env.FTP_PORT}`,
  pasv_url: process.env.FTP_HOST,
  anonymous: false,
});

ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
  if (username === process.env.FTP_USER && password === process.env.FTP_PASS) {
    // For simplicity, root is the uploads folder
    resolve({ root: path.join(__dirname, 'uploads') });
  } else {
    reject(new Error('Invalid username or password'));
  }
});

ftpServer.listen().then(() => {
  console.log(`FTP Server running at ftp://${process.env.FTP_HOST}:${process.env.FTP_PORT}`);
});

module.exports = ftpServer;
