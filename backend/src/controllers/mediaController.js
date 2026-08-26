const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
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
  },

  async downloadFile(req, res) {
    try {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

      let { url, name } = req.query;
      if (!url) {
        return res.status(400).send('URL parameter is required');
      }

      // Upgrade http to https for remote domains to avoid insecure redirect drops
      if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
        url = url.replace('http://', 'https://');
      }

      let filename = name || 'photo.jpg';
      if (!filename.includes('.')) {
        filename += '.jpg';
      }

      // Handle Data URL
      if (url.startsWith('data:')) {
        const matches = url.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');

          res.setHeader('Content-Type', mimeType || 'image/jpeg');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          return res.send(buffer);
        }
      }

      // Handle local /uploads/ disk path
      const uploadsIndex = url.indexOf('/uploads/');
      if (uploadsIndex !== -1 || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        const relPath = url.includes('/uploads/') ? url.substring(url.indexOf('/uploads/')) : url;
        const localPath = path.join(__dirname, '../../', relPath.replace(/^\//, ''));
        if (fs.existsSync(localPath)) {
          return res.download(localPath, filename);
        }
      }

      // Handle Remote HTTP/HTTPS URL streaming with redirect support
      const fetchRemote = (targetUrl) => {
        const protocol = targetUrl.startsWith('https://') ? https : http;
        protocol.get(targetUrl, (remoteRes) => {
          // Follow redirects (301, 302, 307, 308)
          if (remoteRes.statusCode >= 300 && remoteRes.statusCode < 400 && remoteRes.headers.location) {
            let redirectUrl = remoteRes.headers.location;
            if (redirectUrl.startsWith('/')) {
              const parsed = new URL(targetUrl);
              redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
            }
            return fetchRemote(redirectUrl);
          }

          if (remoteRes.statusCode !== 200) {
            return res.status(remoteRes.statusCode).send('Remote file not found');
          }

          const contentType = remoteRes.headers['content-type'] || 'image/jpeg';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          remoteRes.pipe(res);
        }).on('error', (err) => {
          console.error('Remote stream fetch error:', err);
          res.status(500).send('Failed to stream remote file');
        });
      };

      if (url.startsWith('http://') || url.startsWith('https://')) {
        return fetchRemote(url);
      }

      res.status(404).send('File not found');
    } catch (err) {
      console.error('Download proxy error:', err);
      res.status(500).send('Download failed');
    }
  }
};

module.exports = mediaController;
