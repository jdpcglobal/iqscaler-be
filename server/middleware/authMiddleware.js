import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

// Middleware to protect routes (ensure user is logged in)
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Check if the token exists in the Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header (it looks like: 'Bearer [token]')
      token = req.headers.authorization.split(' ')[1];

      // 2. Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Find the user by ID and attach the user object to the request (excluding password)
      // We use select('-password') to ensure we don't return the hash
      req.user = await User.findById(decoded.id).select('-password');

      // 4. Move to the next middleware or route handler
      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  // If no token is found in the header
  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

// Middleware to ensure user is an Admin
const admin = (req, res, next) => {
  // Check if the user object (attached by the 'protect' middleware) exists and isAdmin is true
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401);
    throw new Error('Not authorized as an admin');
  }
};

export { protect, admin };