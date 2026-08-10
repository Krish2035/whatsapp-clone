const mediaService = require('../services/mediaService');

const mediaController = {
  uploadMedia(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please attach an image or video file' });
      }

      const fileData = mediaService.processUpload(req.file, req);
      res.status(201).json({
        message: 'File uploaded successfully',
        ...fileData
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
};

module.exports = mediaController;
