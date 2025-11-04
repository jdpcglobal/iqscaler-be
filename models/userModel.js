import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true, // This adds `createdAt` and `updatedAt` fields
  }
);

// Method to generate and hash the password reset token
userSchema.methods.getResetPasswordToken = function () {
  // Generate a random 20-byte token buffer and convert to a hex string
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash the token and set it to resetPasswordToken field (stored in DB)
  this.resetPasswordToken = crypto
    .createHash('sha256') // Use SHA256 for hashing the token before storing
    .update(resetToken)
    .digest('hex');

  // Set token expiration time (e.g., 10 minutes from now)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  // Return the UNHASHED token to be emailed to the user
  return resetToken;
};

// Middleware to hash password before saving
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;