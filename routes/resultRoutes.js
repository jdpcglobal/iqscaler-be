import express from 'express';
const router = express.Router();
// Import the new controller function
import { getResultById, getMyResults, getAllResults, getLeaderboardResults } from '../controllers/resultController.js'; 
import { protect, admin } from '../middleware/authMiddleware.js';

// ==========================================================
// NEW FEATURE: LEADERBOARD ROUTE (PUBLIC)
// ==========================================================
// @route   GET /api/results/leaderboard
// @access  Public
router.get('/leaderboard', getLeaderboardResults);

// Public/Admin Routes
router.route('/')
  .get(protect, admin, getAllResults); // Admin: Get all results

// User Routes
router.route('/myresults')
  .get(protect, getMyResults); // User: Get own result history

// General Route (Protected for single result)
router.route('/:id')
  .get(protect, getResultById); // User/Admin: Get specific result

export default router;




// import express from 'express';
// const router = express.Router();
// import { getResultById, getMyResults, getAllResults } from '../controllers/resultController.js';
// import { protect, admin } from '../middleware/authMiddleware.js';

// // Public/Admin Routes
// router.route('/')
//   .get(protect, admin, getAllResults); // Admin: Get all results

// // User Routes
// router.route('/myresults')
//   .get(protect, getMyResults); // User: Get own result history

// // General Route (Protected for single result)
// router.route('/:id')
//   .get(protect, getResultById); // User/Admin: Get specific result

// export default router;