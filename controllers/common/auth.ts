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
import { loginUserService, logoutUserService, refreshTokensService, registerUserService } from "../../services/auth-service.js";

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
  const result = await registerUserService(req.body);

  res.status(result.code).json(result);
});

export const login = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, password } = req.body as LoginBody;

  const result = await loginUserService({ email, password });

  if (!result.status || !result.data) {
    res.status(result.code).json(result);
    return;
  }

  const { accessToken, refreshToken, user } = result.data;

  const baseCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };

  res.cookie("accessToken", accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", refreshToken, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Return standardized response envelope without raw tokens in response body
  res.status(result.code).json({
    status: result.status,
    code: result.code,
    message: result.message,
    data: { user },
  });
});

export const logout = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const { refreshToken } = req.cookies;

  const result = await logoutUserService({ refreshToken });

  const baseCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };

  res.clearCookie("accessToken", baseCookieOptions);
  res.clearCookie("refreshToken", baseCookieOptions);

  res.status(result.code).json(result);
});

export const refresh = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const { refreshToken } = req.cookies;

  const result = await refreshTokensService({ refreshToken });

  if (!result.status || !result.data) {
    // Clear cookies if token reuse or invalid token was detected
    if (result.code === 403 || result.code === 401) {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
    }
    res.status(result.code).json(result);
    return;
  }

  const {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  } = result.data;

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
  };

  res.cookie("accessToken", newAccessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", newRefreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Return standardized response envelope without exposing raw tokens in response body
  res.status(result.code).json({
    status: result.status,
    code: result.code,
    message: result.message,
  });
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