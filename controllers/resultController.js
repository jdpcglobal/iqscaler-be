import asyncHandler from 'express-async-handler';
import Result from '../models/resultModel.js';

// @desc    Get result details by ID
// @route   GET /api/results/:id
// @access  Private (Owner or Admin only)
const getResultById = asyncHandler(async (req, res) => {
  const result = await Result.findById(req.params.id).populate('user', 'username email');

  if (result) {
    // Check if the logged-in user is the owner of the result OR is an admin
    if (result.user._id.toString() === req.user._id.toString() || req.user.isAdmin) {
      res.json(result);
    } else {
      res.status(401);
      throw new Error('Not authorized to view this result.');
    }
  } else {
    res.status(404);
    throw new Error('Result not found.');
  }
});

// @desc    Get all results for the logged-in user
// @route   GET /api/results/myresults
// @access  Private
const getMyResults = asyncHandler(async (req, res) => {
  const results = await Result.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(results);
});

// @desc    Get all results (Admin only)
// @route   GET /api/results
// @access  Private/Admin
const getAllResults = asyncHandler(async (req, res) => {
  const results = await Result.find({}).populate('user', 'username email').sort({ createdAt: -1 });
  res.json(results);
});

// ==========================================================
// UPDATED FEATURE: LEADERBOARD CONTROLLER
// Includes date/time of the best score
// ==========================================================
// @desc    Get top N unique users' best results for the leaderboard
// @route   GET /api/results/leaderboard
// @access  Public
const getLeaderboardResults = asyncHandler(async (req, res) => {
  // Define the limit for the leaderboard (e.g., top 5 or 10)
  const limit = 5; 

  try {
    const leaderboard = await Result.aggregate([
      // 1. Sort all results by score (desc) and then by creation date (desc).
      // This ensures the max score and its associated date are first when grouping.
      {
        $sort: { totalScore: -1, createdAt: -1 } 
      },
      // 2. Group by user and find the best (max) score and the date/time of that result.
      {
        $group: {
          _id: '$user', // Group by the user ID
          maxScore: { $first: '$totalScore' }, // Get the score from the top-sorted result
          testDate: { $first: '$createdAt' }, // Get the date from the top-sorted result
        }
      },
      // 3. Sort the unique best results by score in descending order
      {
        $sort: { maxScore: -1 } 
      },
      // 4. Limit to the top N users
      {
        $limit: limit 
      },
      // 5. Join with the User model to get username
      {
        $lookup: {
          from: 'users', // Collection name
          localField: '_id', // Field from the input documents ($group output)
          foreignField: '_id', // Field from the 'users' collection
          as: 'userDetails', // Name of the new array field to add
        }
      },
      // 6. Deconstruct the userDetails array field into a single object
      {
        $unwind: '$userDetails'
      },
      // 7. Project/Shape the final output for the client
      {
        $project: {
          _id: 0, 
          userId: '$_id', // Retain for React key
          username: '$userDetails.username',
          maxScore: 1,
          testDate: 1, // NEW: Include the date of the best test
        }
      }
    ]);

    res.json(leaderboard);
  } catch (error) {
    console.error(`Error fetching leaderboard: ${error.message}`);
    res.status(500);
    throw new Error('Could not fetch leaderboard data.');
  }
});

export { getResultById, getMyResults, getAllResults, getLeaderboardResults };



// import asyncHandler from 'express-async-handler';
// import Result from '../models/resultModel.js';

// // @desc    Get result details by ID
// // @route   GET /api/results/:id
// // @access  Private (Owner or Admin only)
// const getResultById = asyncHandler(async (req, res) => {
//   const result = await Result.findById(req.params.id).populate('user', 'username email');

//   if (result) {
//     // Check if the logged-in user is the owner of the result OR is an admin
//     if (result.user._id.toString() === req.user._id.toString() || req.user.isAdmin) {
//       res.json(result);
//     } else {
//       res.status(401);
//       throw new Error('Not authorized to view this result.');
//     }
//   } else {
//     res.status(404);
//     throw new Error('Result not found.');
//   }
// });

// // @desc    Get all results for the logged-in user
// // @route   GET /api/results/myresults
// // @access  Private
// const getMyResults = asyncHandler(async (req, res) => {
//   const results = await Result.find({ user: req.user._id }).sort({ createdAt: -1 });
//   res.json(results);
// });

// // @desc    Get all results (Admin only)
// // @route   GET /api/results
// // @access  Private/Admin
// const getAllResults = asyncHandler(async (req, res) => {
//   const results = await Result.find({}).populate('user', 'username email').sort({ createdAt: -1 });
//   res.json(results);
// });

// export { getResultById, getMyResults, getAllResults };