const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists for local file storage
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Flexible storage configuration
const storageConfig = {
  uploadDir,
  getPublicUrl: (filename, req) => {
    if (!filename) return null;
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      return filename;
    }
    const host = req ? `${req.protocol}://${req.get('host')}` : '';
    return `${host}/uploads/${filename}`;
  }
};

module.exports = storageConfig;
