import asyncHandler from 'express-async-handler';
import Result from '../models/resultModel.js';

// @desc    Get result details by ID
// @route   GET /api/results/:id
// @access  Private (Owner or Admin only)
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

// @desc    Get all results for the logged-in user
// @route   GET /api/results/myresults
// @access  Private
const getMyResults = asyncHandler(async (req, res) => {
  const results = await Result.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(results);
});

// @desc    Get all results (Admin only)
// @route   GET /api/results
// @access  Private/Admin
const getAllResults = asyncHandler(async (req, res) => {
  const results = await Result.find({}).populate('user', 'username email').sort({ createdAt: -1 });
  res.json(results);
});

export { getResultById, getMyResults, getAllResults };