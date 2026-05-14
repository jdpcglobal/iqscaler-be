// server/routes/resultRoutes.js

import express from 'express';
const router = express.Router();

import { 
  getResultById, 
  getMyResults, 
  getAllResults, 
  getUserResultsByAdmin,
  getLeaderboardResults,
  getMyLeaderboardRank
} from '../controllers/resultController.js'; 
import { protect, admin } from '../middleware/authMiddleware.js';

// Public leaderboard
router.get('/leaderboard', getLeaderboardResults);

// Logged-in user's rank
router.route('/my-rank').get(protect, getMyLeaderboardRank); 

// All results — admin only
router.route('/').get(protect, admin, getAllResults); 

// Logged-in user's own results
router.route('/myresults').get(protect, getMyResults); 

// Admin: get all results for a specific user  ← NEW
router.route('/user/:userId').get(protect, admin, getUserResultsByAdmin);

// Single result by ID — must stay last to avoid swallowing the routes above
router.route('/:id').get(protect, getResultById); 

export default router;

// import express from 'express';
// const router = express.Router();

// import { 
//   getResultById, 
//   getMyResults, 
//   getAllResults, 
//   getLeaderboardResults,
//   getMyLeaderboardRank
// } from '../controllers/resultController.js'; 
// import { protect, admin } from '../middleware/authMiddleware.js';

// // Public Leaderboard
// router.get('/leaderboard', getLeaderboardResults);

// // --- NEW ROUTE: Get logged-in user's rank ---
// router.route('/my-rank').get(protect, getMyLeaderboardRank); 
// // --------------------------------------------

// router.route('/')
//   .get(protect, admin, getAllResults); 

// router.route('/myresults')
//   .get(protect, getMyResults); 

// router.route('/:id')
//   .get(protect, getResultById); 

// export default router;