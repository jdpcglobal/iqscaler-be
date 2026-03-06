// server/routes/paymentRoutes.js

import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { 
  createOrder, 
  verifyPayment, 
  updatePaymentToFailed, 
  getPaymentHistory,
  getCertificatePrice,
  createStripeSession,  // <-- Imported new Stripe function
  verifyStripePayment   // <-- Imported new Stripe function
} from '../controllers/paymentController.js';

const router = express.Router();

// --- PRICING ROUTE ---
router.route('/price').get(protect, getCertificatePrice);

// --- RAZORPAY ROUTES (INR) ---
router.route('/create-order').post(protect, createOrder);
router.route('/verify').post(protect, verifyPayment);
router.route('/fail').put(protect, updatePaymentToFailed); 

// --- STRIPE ROUTES (USD) ---
router.route('/create-stripe-session').post(protect, createStripeSession);
router.route('/verify-stripe').post(protect, verifyStripePayment);

// --- ADMIN ROUTES ---
router.route('/history').get(protect, admin, getPaymentHistory); 

export default router;



// // server/routes/paymentRoutes.js

// import express from 'express';
// import { protect, admin } from '../middleware/authMiddleware.js';
// import { 
//   createOrder, 
//   verifyPayment, 
//   updatePaymentToFailed, 
//   getPaymentHistory,
//   getCertificatePrice // <-- 1. Added the new controller function here
// } from '../controllers/paymentController.js';

// const router = express.Router();

// // --- NEW ROUTE ---
// // @route   GET /api/payments/price
// // @desc    Get the price of the certificate
// // @access  Private
// router.route('/price').get(protect, getCertificatePrice); // <-- 2. Added the route here

// // --- EXISTING ROUTES ---
// router.route('/create-order').post(protect, createOrder);
// router.route('/verify').post(protect, verifyPayment);
// router.route('/fail').put(protect, updatePaymentToFailed); // User-level fail
// router.route('/history').get(protect, admin, getPaymentHistory); // Admin-only history

// export default router;