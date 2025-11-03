import express from 'express';
const router = express.Router();
import { getTestConfig, updateTestConfig } from '../controllers/configController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

// Public access to fetch the current config details (e.g., to show time/total questions on homepage)
router.route('/test').get(getTestConfig); 

// Admin access to update the config
router.route('/test').put(protect, admin, updateTestConfig);

export default router;