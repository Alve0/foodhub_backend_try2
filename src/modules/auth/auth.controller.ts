import type { RequestHandler } from "express";
import { catchAsync } from "../../utils/catch-async";
import { authService } from "./auth.service";
import { sendResponse } from "../../utils/send-response";
import { getAuthToken } from "../../middleware/jwt";

const setAuthCookie = (res: Parameters<RequestHandler>[1], token: string) => {
  res.cookie("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
};

const createUser: RequestHandler = catchAsync(async (req, res) => {
  const data = req.body;
  const createdUser = await authService.createUser(data);
  if (!createdUser) {
    sendResponse(res, 400, "User creation failed");
    return;
  }
  setAuthCookie(res, createdUser.token);
  sendResponse(res, 201, "User created successfully", createdUser);
});

const login: RequestHandler = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  setAuthCookie(res, result.token);
  sendResponse(res, 200, "Login successful", result);
});

const logout: RequestHandler = catchAsync(async (req, res) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  sendResponse(
    res,
    200,
    "Logged out successfully",
    await authService.logout(getAuthToken(req)),
  );
});

const changePassword: RequestHandler = catchAsync(async (req, res) => {
  sendResponse(
    res,
    200,
    "Password changed successfully",
    await authService.changePassword(req.user!.sub, req.body),
  );
});

const updateProfile: RequestHandler = catchAsync(async (req, res) => {
  sendResponse(
    res,
    200,
    "Profile updated successfully",
    await authService.updateProfile(req.user!.sub, req.body),
  );
});

const forgotPassword: RequestHandler = catchAsync(async (req, res) => {
  sendResponse(
    res,
    200,
    "If the account exists, a reset link has been requested.",
    await authService.forgotPassword(req.body),
  );
});

const resetPassword: RequestHandler = catchAsync(async (req, res) => {
  sendResponse(
    res,
    200,
    "Password reset successfully",
    await authService.resetPassword(req.body),
  );
});

const getAllUsers: RequestHandler = catchAsync(async (_req, res) => {
  sendResponse(
    res,
    200,
    "Users retrieved successfully",
    await authService.getAllUsers(),
  );
});

const getAllProviders: RequestHandler = catchAsync(async (_req, res) => {
  sendResponse(
    res,
    200,
    "Providers retrieved successfully",
    await authService.getAllProviders(),
  );
});

const getAllCustomers: RequestHandler = catchAsync(async (_req, res) => {
  sendResponse(
    res,
    200,
    "Customers retrieved successfully",
    await authService.getAllCustomers(),
  );
});

export const authController: {
  createUser: RequestHandler;
  login: RequestHandler;
  logout: RequestHandler;
  changePassword: RequestHandler;
  updateProfile: RequestHandler;
  forgotPassword: RequestHandler;
  resetPassword: RequestHandler;
  getAllUsers: RequestHandler;
  getAllProviders: RequestHandler;
  getAllCustomers: RequestHandler;
} = {
  createUser,
  login,
  logout,
  changePassword,
  updateProfile,
  forgotPassword,
  resetPassword,
  getAllUsers,
  getAllProviders,
  getAllCustomers,
};
