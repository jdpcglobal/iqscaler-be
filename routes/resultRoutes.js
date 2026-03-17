import express from 'express';
const router = express.Router();

import { 
  getResultById, 
  getMyResults, 
  getAllResults, 
  getLeaderboardResults,
  getMyLeaderboardRank
} from '../controllers/resultController.js'; 
import { protect, admin } from '../middleware/authMiddleware.js';

// Public Leaderboard
router.get('/leaderboard', getLeaderboardResults);

// --- NEW ROUTE: Get logged-in user's rank ---
router.route('/my-rank').get(protect, getMyLeaderboardRank); 
// --------------------------------------------

router.route('/')
  .get(protect, admin, getAllResults); 

router.route('/myresults')
  .get(protect, getMyResults); 

router.route('/:id')
  .get(protect, getResultById); 

export default router;