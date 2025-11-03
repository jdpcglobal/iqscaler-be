import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import multer from 'multer';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer to use Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'iq-platform-questions', // A folder name in your Cloudinary account
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    // Use the public_id for easy identification
    public_id: (req, file) => file.originalname.split('.')[0] + '-' + Date.now(),
  },
});

// Multer middleware configured for single image upload
const uploadImage = (imageFieldName) => multer({ storage: storage }).single(imageFieldName);

export { cloudinary, uploadImage };