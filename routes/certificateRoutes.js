// server/routes/certificateRoutes.js

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
// Import the new public controller function
import { generateCertificate, verifyCertificatePublic } from '../controllers/certificateController.js'; 

const router = express.Router();

// 1. SECURE ROUTE: For logged-in users (Download/Preview button)
router.route('/:id').get(protect, generateCertificate);

// 2. PUBLIC ROUTE: For QR code scanning (Verification) - NO protect middleware!
router.route('/verify/:resultId').get(verifyCertificatePublic); // <-- NEW

export default router;