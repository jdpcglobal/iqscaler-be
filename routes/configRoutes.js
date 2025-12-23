// server/routes/configRoutes.js

import express from 'express';
import { getTestConfig, updateTestConfig } from '../controllers/configController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public access to fetch the current config details (e.g., to show time/total questions on homepage)
router.route('/test').get(getTestConfig); 

// Admin access to update the config
router.route('/test').put(protect, admin, updateTestConfig);

export default router;