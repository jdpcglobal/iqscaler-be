// server/controllers/resultController.js

import asyncHandler from 'express-async-handler';
import Result from '../models/resultModel.js';

// @desc    Get result details by ID
// @route   GET /api/results/:id
// @access  Private (Owner or Admin only)
const getResultById = asyncHandler(async (req, res) => {
  const result = await Result.findById(req.params.id).populate('user', 'username email');

  if (result) {
    if (result.user._id.toString() === req.user._id.toString() || req.user.isAdmin) {
      
      // PHASE 2 SECURITY: Mask the IQ score if not purchased (and not an admin)
      const responseData = result.toObject();
      if (!responseData.certificatePurchased && !req.user.isAdmin) {
        responseData.iqScore = null; 
      }

      res.json(responseData);
    } else {
      res.status(401);
      throw new Error('Not authorized to view this result.');
    }
  } else {
    res.status(404);
    throw new Error('Result not found.');
  }
});

// @desc    Get all results for the logged-in user
// @route   GET /api/results/myresults
// @access  Private
const getMyResults = asyncHandler(async (req, res) => {
  const results = await Result.find({ user: req.user._id }).sort({ createdAt: -1 });

  // PHASE 2 SECURITY: Mask the IQ scores in the history array
  const maskedResults = results.map(r => {
    const rObj = r.toObject();
    if (!rObj.certificatePurchased) {
      rObj.iqScore = null;
    }
    return rObj;
  });

  res.json(maskedResults);
});

// @desc    Get all results (Admin only)
// @route   GET /api/results
// @access  Private/Admin
const getAllResults = asyncHandler(async (req, res) => {
  const results = await Result.find({}).populate('user', 'id username email').sort({ createdAt: -1 });
  // Admins see everything unmasked
  res.json(results);
});

// // Main function to get the leaderboard results, commented for not will be uncommented in future
// // @desc    Get top users by IQ Score (Purchased only)
// // @route   GET /api/results/leaderboard
// // @access  Public
// const getLeaderboardResults = asyncHandler(async (req, res) => {
//   // Support dynamic limits (e.g., ?limit=5 for homepage, ?limit=100 for leaderboard page)
//   const limit = parseInt(req.query.limit) || 100;

//   const leaderboard = await Result.aggregate([
//     // 1. MUST be purchased and have a valid IQ
//     { $match: { certificatePurchased: false, iqScore: { $ne: null } } },
//     // 2. Sort by highest IQ first, then oldest date (tie-breaker)
//     { $sort: { iqScore: -1, createdAt: 1 } },
//     // 3. Group by user to only get their single best score
//     {
//       $group: {
//         _id: '$user',
//         iqScore: { $first: '$iqScore' },
//         testDate: { $first: '$createdAt' }
//       }
//     },
//     // 4. Re-sort the unique users
//     { $sort: { iqScore: -1 } },
//     { $limit: limit },
//     // 5. Join to get the username
//     {
//       $lookup: {
//         from: 'users',
//         localField: '_id',
//         foreignField: '_id',
//         as: 'userDetails'
//       }
//     },
//     { $unwind: '$userDetails' },
//     // 6. Clean up the output structure
//     {
//       $project: {
//         _id: 0,
//         userId: '$_id',
//         username: '$userDetails.username',
//         iqScore: 1,
//         testDate: 1
//       }
//     }
//   ]);

//   res.json(leaderboard);
// });

// TEMPORARY LEADERBOARD: Shows everyone with valid IQs, regardless of purchase. This is for testing and will be removed in Phase 2 when we enforce the purchase requirement again.
// @desc    Get top users by IQ Score (TEMPORARY: Shows everyone)
// @route   GET /api/results/leaderboard
// @access  Public
const getLeaderboardResults = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;

  const leaderboard = await Result.aggregate([
    // TEMPORARY: Removed certificatePurchased check. Just requires a valid IQ.
    { $match: { iqScore: { $ne: null } } },
    
    { $sort: { iqScore: -1, createdAt: 1 } },
    {
      $group: {
        _id: '$user',
        iqScore: { $first: '$iqScore' },
        testDate: { $first: '$createdAt' }
      }
    },
    { $sort: { iqScore: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userDetails'
      }
    },
    { $unwind: '$userDetails' },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        username: '$userDetails.username',
        iqScore: 1,
        testDate: 1
      }
    }
  ]);

  res.json(leaderboard);
});

// @desc    Get logged in user's virtual or actual rank
// @route   GET /api/results/my-rank
// @access  Private
const getMyLeaderboardRank = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Find this user's absolute best result
  const bestResult = await Result.findOne({ user: userId })
    .sort({ iqScore: -1 });

  if (!bestResult || !bestResult.iqScore) {
    return res.json({ hasTakenTest: false });
  }

  const { iqScore, certificatePurchased } = bestResult;

  // Calculate rank: How many unique purchased users have a HIGHER score than this user?
  const higherScores = await Result.aggregate([
    { $match: { certificatePurchased: true, iqScore: { $gt: iqScore } } },
    { $group: { _id: '$user' } } // Group ensures we count unique users, not duplicate tests
  ]);

  const rank = higherScores.length + 1;

  res.json({
    hasTakenTest: true,
    certificatePurchased,
    rank, // This acts as actual rank if purchased, or virtual rank if not!
    // Mask IQ if not purchased!
    bestIqScore: certificatePurchased ? iqScore : null 
  });
});

export { 
  getResultById, 
  getMyResults, 
  getAllResults, 
  getLeaderboardResults,
  getMyLeaderboardRank
};