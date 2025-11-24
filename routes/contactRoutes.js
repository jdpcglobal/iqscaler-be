import express from 'express';
import { sendContactMessage } from '../controllers/contactController.js';

const router = express.Router();

// Public route for contact submissions
router.route('/').post(sendContactMessage);

export default router;