import type { RequestHandler } from "express";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { providerService } from "./provider.service";

const param = (value: string | string[] | undefined): string => {
  if (typeof value !== "string" || !value)
    throw new Error("Order id is required");
  return value;
};
const getProfile: RequestHandler = catchAsync(async (req, res) =>
  sendResponse(
    res,
    200,
    "Provider profile retrieved successfully",
    await providerService.getProfile(req.user!.sub),
  ),
);
const updateProfile: RequestHandler = catchAsync(async (req, res) =>
  sendResponse(
    res,
    200,
    "Provider profile updated successfully",
    await providerService.updateProfile(req.user!.sub, req.body),
  ),
);
const setOpen: RequestHandler = catchAsync(async (req, res) =>
  sendResponse(
    res,
    200,
    "Provider availability updated successfully",
    await providerService.setOpen(req.user!.sub, req.body.isOpen),
  ),
);
const getOrders: RequestHandler = catchAsync(async (req, res) =>
  sendResponse(
    res,
    200,
    "Provider orders retrieved successfully",
    await providerService.getOrders(req.user!.sub),
  ),
);
const updateOrderStatus: RequestHandler = catchAsync(async (req, res) =>
  sendResponse(
    res,
    200,
    "Order status updated successfully",
    await providerService.updateOrderStatus(
      req.user!.sub,
      param(req.params.id),
      req.body.status,
    ),
  ),
);

export const providerController: {
  getProfile: RequestHandler;
  updateProfile: RequestHandler;
  setOpen: RequestHandler;
  getOrders: RequestHandler;
  updateOrderStatus: RequestHandler;
} = { getProfile, updateProfile, setOpen, getOrders, updateOrderStatus };
