// server/routes/userRoutes.js

import express from 'express';
const router = express.Router();
import { authUser, registerUser, forgotPassword, resetPassword, getUsers, deleteUser, getUserById, updateUser } from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js'; // <-- NEW IMPORT

// Public Routes
router.route('/').post(registerUser);
router.post('/login', authUser);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// Protected Admin Routes for ALL users and specific user CRUD
router.route('/')
  .get(protect, admin, getUsers); // GET /api/users (Admin: fetch all)

router.route('/:id')
  .delete(protect, admin, deleteUser) // DELETE /api/users/:id (Admin: delete user)
  .get(protect, admin, getUserById)   // GET /api/users/:id (Admin: fetch by id)
  .put(protect, admin, updateUser);   // PUT /api/users/:id (Admin: update user)

// Protected Routes (must be logged in)
// Example route: Get user profile
router.route('/profile').get(protect, (req, res) => {
    // req.user is available here thanks to the 'protect' middleware
    res.json(req.user);
});

// Admin Route (must be logged in AND be an admin)
router.route('/admin-test').get(protect, admin, (req, res) => {
    res.send('Welcome to the Admin Dashboard!');
});

export default router;