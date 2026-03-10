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

// // Main function to get the leaderboard results, commented for now and will be uncommented in future

// // @desc    Get top users by IQ Score (Purchased only)
// // @route   GET /api/results/leaderboard
// // @access  Public
// const getLeaderboardResults = asyncHandler(async (req, res) => {
//   const limit = parseInt(req.query.limit) || 100;

//   const leaderboard = await Result.aggregate([
//     // 1. MUST be purchased and have a valid IQ
//     { $match: { certificatePurchased: true, iqScore: { $ne: null } } },
//     // 2. Sort by highest IQ first, then oldest date
//     { $sort: { iqScore: -1, createdAt: 1 } },
//     // 3. Group by user to only get their single best score
//     {
//       $group: {
//         _id: '$user',
//         iqScore: { $first: '$iqScore' },
//         testDate: { $first: '$createdAt' }
//       }
//     },
//     // 4. Re-sort the unique users WITH THE TIE-BREAKER
//     { $sort: { iqScore: -1, testDate: 1 } }, 
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


// // @desc    Get logged in user's virtual or actual rank
// // @route   GET /api/results/my-rank
// // @access  Private
// const getMyLeaderboardRank = asyncHandler(async (req, res) => {
//   const userId = req.user._id;

//   // 1. Find this user's absolute best result
//   const bestResult = await Result.findOne({ user: userId, iqScore: { $ne: null } })
//     .sort({ iqScore: -1 });

//   if (!bestResult) {
//     return res.json({ hasTakenTest: false });
//   }

//   const { iqScore, certificatePurchased, createdAt } = bestResult;

//   // 2. Get the unique, grouped list of ONLY purchased scores
//   const purchasedLeaderboard = await Result.aggregate([
//     { $match: { certificatePurchased: true, iqScore: { $ne: null } } },
//     { $sort: { iqScore: -1, createdAt: 1 } },
//     {
//       $group: {
//         _id: '$user',
//         iqScore: { $first: '$iqScore' },
//         testDate: { $first: '$createdAt' }
//       }
//     }
//   ]);

//   // 3. Calculate Virtual/Actual Rank with Tie-Breaker Logic
//   let rank = 1;
//   for (const entry of purchasedLeaderboard) {
//     // Don't compare the user against their own purchased record
//     if (entry._id.toString() === userId.toString()) continue;

//     // Rank drops by 1 if someone has a higher IQ
//     if (entry.iqScore > iqScore) {
//       rank++;
//     } 
//     // Rank also drops by 1 if someone has the SAME IQ, but took the test EARLIER (Tie-breaker)
//     else if (entry.iqScore === iqScore && new Date(entry.testDate) < new Date(createdAt)) {
//       rank++;
//     }
//   }

//   res.json({
//     hasTakenTest: true,
//     certificatePurchased,
//     rank, // This acts as actual rank if purchased, or virtual rank if not!
    
//     // SECURITY: Mask IQ if they haven't purchased it!
//     bestIqScore: certificatePurchased ? iqScore : null 
//   });
// });



// TEMPORARY LEADERBOARD: Shows everyone with valid IQs, regardless of purchase. This is for testing and will be removed in Phase 2 when we enforce the purchase requirement again.

// @desc    Get top users by IQ Score (TEMPORARY: Shows everyone)
// @route   GET /api/results/leaderboard
// @access  Public
const getLeaderboardResults = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;

  const leaderboard = await Result.aggregate([
    { $match: { iqScore: { $ne: null } } },
    { $sort: { iqScore: -1, createdAt: 1 } },
    {
      $group: {
        _id: '$user',
        iqScore: { $first: '$iqScore' },
        testDate: { $first: '$createdAt' }
      }
    },
    // FIX (Bug 2): Added testDate: 1 as a tie-breaker! 
    // If IQ is the same, whoever took the test earliest wins the tie.
    { $sort: { iqScore: -1, testDate: 1 } }, 
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

  // 1. Check if the user has a valid result
  const bestResult = await Result.findOne({ user: userId, iqScore: { $ne: null } })
    .sort({ iqScore: -1 });

  if (!bestResult) {
    return res.json({ hasTakenTest: false });
  }

  const { iqScore, certificatePurchased } = bestResult;

  // 2. Generate the exact same sorted list as the Global Leaderboard
  // (This ensures tie-breakers are handled identically)
  const leaderboard = await Result.aggregate([
    { $match: { iqScore: { $ne: null } } },
    { $sort: { iqScore: -1, createdAt: 1 } },
    {
      $group: {
        _id: '$user',
        iqScore: { $first: '$iqScore' },
        testDate: { $first: '$createdAt' }
      }
    },
    // The all-important tie-breaker!
    { $sort: { iqScore: -1, testDate: 1 } } 
  ]);

  // 3. Find the exact position of the logged-in user in the official sorted list
  const rankIndex = leaderboard.findIndex(
    (entry) => entry._id.toString() === userId.toString()
  );

  const rank = rankIndex !== -1 ? rankIndex + 1 : null;

  res.json({
    hasTakenTest: true,
    certificatePurchased,
    rank, 
    bestIqScore: iqScore 
  });
});

export { 
  getResultById, 
  getMyResults, 
  getAllResults, 
  getLeaderboardResults,
  getMyLeaderboardRank
};