const storageConfig = require('../config/storage');

function detectMediaType(mimetype, filename) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (
    mimetype === 'application/pdf' ||
    mimetype.includes('word') ||
    mimetype.includes('excel') ||
    mimetype.includes('spreadsheet') ||
    mimetype.includes('presentation') ||
    mimetype.includes('powerpoint') ||
    mimetype === 'text/plain' ||
    mimetype === 'text/csv'
  ) return 'document';
  return 'file';
}

const mediaService = {
  processUpload(file, req) {
    if (!file) {
      throw new Error('No media file uploaded');
    }

    const publicUrl = storageConfig.getPublicUrl(file.filename, req);
    const mediaType = detectMediaType(file.mimetype, file.originalname);

    return {
      filename: file.filename,
      originalName: file.originalname,
      mediaUrl: publicUrl,
      url: publicUrl,
      mediaType,
      type: mediaType,
      mimeType: file.mimetype,
      size: file.size
    };
  }
};

module.exports = mediaService;
