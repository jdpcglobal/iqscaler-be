// server/routes/paymentRoutes.js

import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { 
  createOrder, 
  verifyPayment, 
  updatePaymentToFailed, 
  getPaymentHistory 
} from '../controllers/paymentController.js';

const router = express.Router();

router.route('/create-order').post(protect, createOrder);
router.route('/verify').post(protect, verifyPayment);
router.route('/fail').put(protect, updatePaymentToFailed); // User-level fail
router.route('/history').get(protect, admin, getPaymentHistory); // Admin-only history

export default router;






// import express from 'express';
// import { protect } from '../middleware/authMiddleware.js';
// import { createOrder, verifyPayment } from '../controllers/paymentController.js';

// const router = express.Router();

// router.route('/create-order').post(protect, createOrder);

// router.route('/verify').post(protect, verifyPayment);


// export default router;