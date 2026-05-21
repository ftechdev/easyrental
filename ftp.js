const FtpSrv = require('ftp-srv');
const path = require('path');

// Ensure env is loaded (redundant but safe)
require('dotenv').config();

const ftpHost = process.env.FTP_HOST || '127.0.0.1';
const ftpPort = process.env.FTP_PORT || 2121;

const ftpServer = new FtpSrv({
  url: `ftp://${ftpHost}:${ftpPort}`,
  pasv_url: ftpHost,
  anonymous: false,
});

ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
  if (username === process.env.FTP_USER && password === process.env.FTP_PASS) {
    resolve({ root: path.join(__dirname, 'uploads') });
  } else {
    reject(new Error('Invalid username or password'));
  }
});

ftpServer.listen().then(() => {
  console.log(`Local FTP Server running at ftp://${ftpHost}:${ftpPort}`);
}).catch(err => {
  console.error('Local FTP Server failed to start:', err.message);
});

module.exports = ftpServer;
