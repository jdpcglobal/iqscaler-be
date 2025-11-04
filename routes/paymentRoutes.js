import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createOrder, verifyPayment } from '../controllers/paymentController.js';

const router = express.Router();

router.route('/create-order').post(protect, createOrder);

router.route('/verify').post(protect, verifyPayment);


export default router;