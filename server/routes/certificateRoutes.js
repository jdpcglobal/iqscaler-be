import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { generateCertificate } from '../controllers/certificateController.js';

const router = express.Router();

router.route('/:id').get(protect, generateCertificate);

export default router;