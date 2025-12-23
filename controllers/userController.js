// server/controllers/userController.js

import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import crypto from 'crypto';
import { sendEmail } from '../utils/emailUtils.js';

// Helper function to generate a JWT
const generateToken = (id) => {
  // NOTE: Your JWT_SECRET should be a long, random string stored in your .env file
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token expires in 30 days
  });
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // 1. Check if user already exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400); // Bad Request
    throw new Error('User already exists');
  }

  // 2. Create the user
  const user = await User.create({
    username,
    email,
    password, // Password hashing happens in the userModel.js pre-save hook
  });

  // 3. Respond with user data and token
  if (user) {
    res.status(201).json({ // 201 Created
      _id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 1. Find user by email
  const user = await User.findOne({ email });

  // 2. Check password and user existence
  if (user && (await user.matchPassword(password))) {
    // 3. Respond with user data and token
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } else {
    res.status(401); // 401 Unauthorized
    throw new Error('Invalid email or password');
  }
});

// @desc    Request Password Reset Token (Send Email)
// @route   POST /api/users/forgotpassword
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error('User not found with that email address.');
  }

  // 1. Generate the reset token and save the hashed version/expiry to the database
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false }); // Skip password hashing on this save

  // 2. Create the reset URL using the UNHASHED token
  // This URL will be sent to the user via email
  const resetURL = `${req.protocol}://${req.get('host')}/resetpassword/${resetToken}`;

  const message = `You are receiving this email because you (or someone else) requested the reset of a password. Please make a PUT request to: \n\n ${resetURL} \n\n If you did not request this, please ignore this email. This token is valid for 10 minutes.`;

  try {
    // 3. Send the email (using the utility we create next)
    await sendEmail({
      to: user.email,
      subject: 'IQ Test Platform Password Reset Token',
      text: message,
    });

    res.status(200).json({ success: true, message: 'Reset token sent to email.' });
  } catch (error) {
    console.error(error);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(500);
    throw new Error('Email could not be sent. Try again later.');
  }
});

// @desc    Reset Password using Token
// @route   PUT /api/users/resetpassword/:resettoken
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  // 1. Hash the incoming token from the URL params for comparison
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  // 2. Find user by the hashed token AND ensure it is not expired
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }, // $gt: greater than
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token.');
  }

  // 3. Set the new password, clear the token fields, and save
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  
  // Mongoose pre-save hook will hash the new password
  await user.save(); 

  // 4. Respond with success
  res.status(200).json({ success: true, message: 'Password reset successfully. You can now log in.' });
});

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  // Exclude the password and reset tokens from the response
  const users = await User.find({}).select('-password -resetPasswordToken -resetPasswordExpire');
  res.json(users);
});

// @desc    Delete a user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    if (user.isAdmin) {
      // Prevent deleting the main admin account for safety
      res.status(400);
      throw new Error('Cannot delete administrator accounts via this route.');
    }
    await User.deleteOne({ _id: user._id }); // Use deleteOne for clarity
    res.json({ message: 'User removed' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get user by ID (Admin only)
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -resetPasswordToken -resetPasswordExpire');

  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user details (Admin only, mostly for isAdmin status)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    // Only update fields relevant for admin control
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;
    // Safely update isAdmin status. We check if the field exists in the body.
    if (req.body.isAdmin !== undefined) {
      user.isAdmin = req.body.isAdmin;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

export { registerUser, authUser, forgotPassword, resetPassword, getUsers, deleteUser, getUserById, updateUser };