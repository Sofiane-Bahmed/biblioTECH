import bcrypt from "bcrypt"
import Jwt from "jsonwebtoken"
import crypto from "crypto"

import { User } from "../models/user.js"
import { sendWelcomeEmail } from "../utils/email-service/welcome.js";
import { sendPasswordResetEmail } from "../utils/email-service/reset-password.js";

import asyncHandler from "../utils/async-handler.js";

// register 
export const register = asyncHandler(async (req, res) => {
  const {
    fullName,
    password,
    email,
    confirmPassword
  } = req.body;

  // Check if this is the first user to register and assign admin role if so
  const isFirstUser = (await User.countDocuments()) === 0;
  const role = isFirstUser ? "admin" : "user";

  const newUser = await User.create({
    fullName,
    password,
    email,
    role
  })

  res.status(201).json(newUser);

  await sendWelcomeEmail(newUser);

});

// log in 
export const login = asyncHandler(async (req, res) => {

  const { sign } = Jwt
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  //check if user is suspended
  if (user.suspension_date && user.suspension_date > new Date()) {
    return res.status(403).json({
      message: "Your account is suspended",
      until: user.suspension_date.toString()
    });
  }

  //check if user is blocked
  if (user.isBlocked) {
    return res.status(403).json({
      message: "Your account is blocked. Please contact support for more information."
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const accessToken = sign(
    {
      _id: user._id,
      role: user.role
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' } // Short lived
  );

  const refreshToken = sign(
    {
      _id: user._id
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // Long lived
  );

  user.refreshToken = refreshToken;
  user.subscribed = true;
  await user.save();

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax'
  };

  res.cookie(
    'accessToken',
    accessToken,
    cookieOptions
  );

  res.cookie(
    'refreshToken',
    refreshToken,
    cookieOptions
  );

  res.status(200).json({
    message: 'Welcome back!',
    user
  });

});

// log out 
export const logout = asyncHandler(async (req, res) => {

  const { refreshToken } = req.cookies;

  // Remove refresh token from the database
  if (refreshToken) {
    await User.findOneAndUpdate(
      { refreshToken: refreshToken },
      { $set: { refreshToken: null } }
    );
  }

  // Clear all auth cookies
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.status(200).json({ message: 'User logged out successfully' });

});

// Refresh Access Token and Rotate it
export const refresh = asyncHandler(async (req, res) => {
  const { sign, verify } = Jwt;

  const { refreshToken } = req.cookies;
  if (!refreshToken) return res.status(401).json({ message: "No refresh token" });

  const decoded = verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const user = await User
    .findById(decoded._id)
    .select('+refreshToken');

  if (!user || user.refreshToken !== refreshToken) {
    if (user) {
      await User.findByIdAndUpdate(user._id, { refreshToken: null });
    }
    return res.status(403).json({ message: "Invalid refresh token / Potential theft detected" });
  }

  // Generate new Pair (Rotate refresh token)
  const newAccessToken = sign(
    {
      _id: user._id,
      role: user.role
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  const newRefreshToken = sign(
    {
      _id: user._id
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )

  await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  }

  res.cookie(
    'accessToken',
    newAccessToken,
    cookieOptions
  );

  res.cookie(
    'refreshToken',
    newRefreshToken,
    cookieOptions
  );

  res.status(200).json({ message: "Token refreshed and rotated successfully" });

});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Generate a password reset token and expiration
  const resetToken = crypto
    .randomBytes(32)
    .toString('hex');
  console.log("TESTING RESET TOKEN (PLAIN):", resetToken);
  //hash the token before saving to DB for security
  const hashedResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  const resetExpires = Date.now() + 3600000; // 1 hour

  user.passwordResetToken = hashedResetToken;
  user.passwordResetExpires = resetExpires;

  await user.save();

  // Send email with reset link 
  await sendPasswordResetEmail(user, resetToken);

  res.status(200).json({ message: "Password reset link sent to your email" });

});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  // Hash the token from the URL to match the DB version
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  // Find user with valid token that hasn't expired
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) return res.status(400).json({ message: "Token is invalid or has expired" });

  // Set new password 
  user.password = password;
  await user.save();

  res.status(200).json({ message: "Password reset successful!" });

});