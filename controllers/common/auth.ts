import { Request, Response } from "express";
import bcrypt from "bcrypt"
import Jwt from "jsonwebtoken"

import { User } from "../../models/user.js"
import { sendWelcomeEmail } from "../../utils/email/welcome.js";
import { sendPasswordResetEmail } from "../../utils/email/reset-password.js";

import asyncHandler from "../../utils/async-handler.js";
import {
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
  ResetPasswordParams
} from "../../validations/common/auth/auth-types.js";

const { sign, verify } = Jwt;

interface cookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
}

export const register = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const {
    fullName,
    password,
    email,
    phone,
    confirmPassword
  } = req.body as RegisterBody;

  // Check if this is the first user to register and assign admin role if so
  const isFirstUser = (await User.countDocuments()) === 0;
  const role = isFirstUser ? "admin" : "user";

  const newUser = await User.create({
    fullName,
    password,
    email,
    phone,
    role
  })

  res.status(201).json(newUser);

  await sendWelcomeEmail(newUser);

});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {

  const { email, password } = req.body as LoginBody;

  const user = await User.findOne({ email }).select('+password');

  let isMatch = false;
  if (user) {
    isMatch = await user.comparePassword(password);
  } else {
    // Fake comparison to mimic bcrypt computation time delay
    const dummyHash = "$2b$10$Nx7K.1l6QAnA7V83rGgM7.u8jF.uMlz/5S2d/zYwFfH3yWBy7p7O.";
    await bcrypt.compare(password, dummyHash);
  }

  if (!user || !isMatch) {
    res.status(401).json({ message: "Invalid email or password credentials." });
    return;
  }

  //check if user is suspended
  if (user.suspension_date && user.suspension_date > new Date()) {
    res.status(403).json({
      message: "Your account is suspended",
      until: user.suspension_date.toString()
    });
    return;
  }

  //check if user is blocked
  if (user.isBlocked) {
    res.status(403).json({
      message: "Your account is blocked. Please contact support for more information."
    });
    return;
  }

  //check outstanding_fines
  if (user.outstanding_fines > 10.00) {
    res.status(403).json({
      success: false,
      message: "`You have $${liveUser.outstanding_fines.toFixed(2)} in outstanding fines. Please settle your account balance.`"
    });
    return;
  };

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

  const baseCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const
  };

  res.cookie(
    'accessToken',
    accessToken,
    {
      ...baseCookieOptions,
      maxAge: 15 * 60 * 1000 // 15 minutes in milliseconds
    }
  );

  res.cookie(
    'refreshToken',
    refreshToken,
    {
      ...baseCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds   
    }
  );

  res.status(200).json({
    message: 'Welcome back!',
    user
  });

});

export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {

  const { refreshToken } = req.cookies;

  // Remove refresh token from the database
  if (refreshToken) {
    await User.findOneAndUpdate(
      { refreshToken: refreshToken },
      { $set: { refreshToken: null } }
    );
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.status(200).json({ message: 'User logged out successfully' });

});

export const refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {

  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    res.status(401).json({ message: "No refresh token" });
    return;
  }

  let decoded: any;
  try {
    decoded = verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired refresh token" });
    return;
  }

  const user = await User
    .findById(decoded._id)
    .select('+refreshToken');

  if (!user || user.refreshToken !== refreshToken) {
    if (user) {
      await User.findByIdAndUpdate(user._id, { refreshToken: null });
    }
    res.status(403).json({ message: "Invalid refresh token / Potential theft detected" });
    return;
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

  await User.findByIdAndUpdate(
    user._id,
    { refreshToken: newRefreshToken }
  );

  const cookieOptions: cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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

export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as ForgotPasswordBody;

  const successResponse = {
    message: "If an account with that email exists, a password reset link has been dispatched shortly."
  };

  const user = await User.findOne({ email });
  if (!user) {
    res.status(200).json(successResponse);
    return;
  }

  const resetToken = user.generatePasswordResetToken();
  console.log(`Generated reset token for ${email}: ${resetToken}`); // Log the token for testing purposes
  await user.save();

  try {
    await sendPasswordResetEmail(user, resetToken);
  } catch (emailError) {
    // Rollback DB states immediately if the transport layer fails 
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    console.error(`Password reset email delivery failed for ${email}:`, emailError);
    res.status(500).json({
      message: "An internal error occurred while dispatching recovery notifications. Please try again later."
    });
    return;
  }

  res.status(200).json(successResponse);

});

export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params as ResetPasswordParams;
  const { password } = req.body as ResetPasswordBody;

  const user = await User.findByResetToken(token);
  if (!user) {
    res.status(400).json({ message: "Token is invalid or has expired" });
    return;
  }

  user.password = password;
  await user.save();

  res.status(200).json({ message: "Password reset successful!" });

});