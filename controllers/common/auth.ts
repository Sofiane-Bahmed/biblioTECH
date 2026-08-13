import { Request, Response } from "express";

import asyncHandler from "../../utils/async-handler.js";
import {
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
  ResetPasswordParams
} from "../../validations/common/auth/auth-types.js";
import {
  forgotPasswordService,
  loginUserService,
  logoutUserService,
  refreshTokensService,
  registerUserService,
  resetPasswordService
} from "../../services/commun/auth.js";

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

export const forgotPassword = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body as ForgotPasswordBody;

  const result = await forgotPasswordService({ email });

  res.status(result.code).json(result);
});

export const resetPassword = asyncHandler(async (
  req: Request,
  res: Response
): Promise<void> => {
  const { token } = req.params as ResetPasswordParams;
  const { password } = req.body as ResetPasswordBody;

  const result = await resetPasswordService({ token, password });

  res.status(result.code).json(result);
});