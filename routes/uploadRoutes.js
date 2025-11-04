import express from 'express';
import { uploadImage } from '../config/cloudinaryConfig.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// The route will be POST /api/upload
// The middleware will handle the upload and attach the file info to req.file
router.post(
  '/',
  protect, // Must be logged in
  admin, // Must be an admin
  uploadImage('image'), // 'image' is the field name expected in the form data
  (req, res) => {
    // If the upload is successful, Cloudinary returns the full path (secure_url)
    if (req.file && req.file.path) {
      res.json({ imageUrl: req.file.path });
    } else {
      res.status(400).send('Image upload failed.');
    }
  }
);

export default router;