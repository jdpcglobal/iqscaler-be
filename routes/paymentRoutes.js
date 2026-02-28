// // server/routes/paymentRoutes.js

// import express from 'express';
// import { protect, admin } from '../middleware/authMiddleware.js';
// import { 
//   createOrder, 
//   verifyPayment, 
//   updatePaymentToFailed, 
//   getPaymentHistory 
// } from '../controllers/paymentController.js';

// const router = express.Router();

// router.route('/create-order').post(protect, createOrder);
// router.route('/verify').post(protect, verifyPayment);
// router.route('/fail').put(protect, updatePaymentToFailed); // User-level fail
// router.route('/history').get(protect, admin, getPaymentHistory); // Admin-only history

// export default router;

// server/routes/paymentRoutes.js

import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { 
  createOrder, 
  verifyPayment, 
  updatePaymentToFailed, 
  getPaymentHistory,
  getCertificatePrice // <-- 1. Added the new controller function here
} from '../controllers/paymentController.js';

const router = express.Router();

// --- NEW ROUTE ---
// @route   GET /api/payments/price
// @desc    Get the price of the certificate
// @access  Private
router.route('/price').get(protect, getCertificatePrice); // <-- 2. Added the route here

// --- EXISTING ROUTES ---
router.route('/create-order').post(protect, createOrder);
router.route('/verify').post(protect, verifyPayment);
router.route('/fail').put(protect, updatePaymentToFailed); // User-level fail
router.route('/history').get(protect, admin, getPaymentHistory); // Admin-only history

export default router;