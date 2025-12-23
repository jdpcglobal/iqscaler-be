// server/routes/questionRoutes.js

import express from 'express';
import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getTestQuestions,
  submitTest,
  getQuestionCategories, // <-- NEW IMPORT
} from '../controllers/questionController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route for fetching randomized public test questions
router.route('/test').get(getTestQuestions);

// Route for submitting user answers (User must be logged in/protected)
router.route('/submit').post(protect, submitTest);

// Route for fetching all unique categories (Admin only)
router.route('/categories').get(protect, admin, getQuestionCategories); // <-- NEW ROUTE: GET /api/questions/categories

// Route for fetching all questions and creating a new question (both Admin only)
// POST /api/questions handles creation
// GET /api/questions handles fetching all
router.route('/')
  .get(protect, admin, getQuestions) // Admin read all
  .post(protect, admin, createQuestion); // Admin create

// Routes for specific question by ID (Read, Update, Delete - all Admin only)
router.route('/:id')
  // .get(protect, getQuestionById) // Optional: Admin read single question
  .put(protect, admin, updateQuestion) // Admin update
  .delete(protect, admin, deleteQuestion); // Admin delete

export default router;


