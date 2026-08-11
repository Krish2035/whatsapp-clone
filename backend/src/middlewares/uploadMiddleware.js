const multer = require('multer');
const path = require('path');
const storageConfig = require('../config/storage');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageConfig.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// Allow all file types
const fileFilter = (req, file, cb) => {
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max limit
  }
});

module.exports = upload;
