const storageConfig = require('../config/storage');

const mediaService = {
  processUpload(file, req) {
    if (!file) {
      throw new Error('No media file uploaded');
    }

    const publicUrl = storageConfig.getPublicUrl(file.filename, req);
    const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';

    return {
      filename: file.filename,
      originalName: file.originalname,
      mediaUrl: publicUrl,
      mediaType,
      mimeType: file.mimetype,
      size: file.size
    };
  }
};

module.exports = mediaService;
