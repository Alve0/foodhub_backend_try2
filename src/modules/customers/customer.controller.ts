import type { RequestHandler } from "express";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { customerService } from "./customer.service";

const requiredParam = (value: string | string[] | undefined, name: string): string => {
  if (typeof value !== "string" || !value) throw new Error(`${name} is required`);
  return value;
};
const getProfile: RequestHandler = catchAsync(async (req, res) => sendResponse(res, 200, "Customer profile retrieved successfully", await customerService.getCustomer(req.user!.sub)));
const updateProfile: RequestHandler = catchAsync(async (req, res) => sendResponse(res, 200, "Customer profile updated successfully", await customerService.updateProfile(req.user!.sub, req.body)));
const getCart: RequestHandler = catchAsync(async (req, res) => sendResponse(res, 200, "Cart retrieved successfully", await customerService.getCart(req.user!.sub)));
const addItem: RequestHandler = catchAsync(async (req, res) => sendResponse(res, 201, "Food added to cart successfully", await customerService.addItem(req.user!.sub, req.body.foodId, req.body.quantity)));
const updateItem: RequestHandler = catchAsync(async (req, res) => sendResponse(res, 200, "Cart item updated successfully", await customerService.updateItem(req.user!.sub, requiredParam(req.params.itemId, "Cart item id"), req.body.quantity)));
const removeItem: RequestHandler = catchAsync(async (req, res) => sendResponse(res, 200, "Cart item removed successfully", await customerService.removeItem(req.user!.sub, requiredParam(req.params.itemId, "Cart item id"))));
const clearCart: RequestHandler = catchAsync(async (req, res) => sendResponse(res, 200, "Cart cleared successfully", await customerService.clearCart(req.user!.sub)));
const checkout: RequestHandler = catchAsync(async (req, res) => sendResponse(res, 201, "Order created successfully", await customerService.checkout(req.user!.sub, req.body.address)));
const getOrders: RequestHandler = catchAsync(async (req, res) => sendResponse(res, 200, "Orders retrieved successfully", await customerService.getOrders(req.user!.sub)));
const getOrder: RequestHandler = catchAsync(async (req, res) => sendResponse(res, 200, "Order retrieved successfully", await customerService.getOrder(req.user!.sub, requiredParam(req.params.id, "Order id"))));
const cancelOrder: RequestHandler = catchAsync(async (req, res) => sendResponse(res, 200, "Order cancelled successfully", await customerService.cancelOrder(req.user!.sub, requiredParam(req.params.id, "Order id"))));
const createReview: RequestHandler = catchAsync(async (req, res) => sendResponse(res, 201, "Review created successfully", await customerService.createReview(req.user!.sub, requiredParam(req.params.id, "Order id"), req.body)));
const listReviews: RequestHandler = catchAsync(async (req, res) => sendResponse(res, 200, "Reviews retrieved successfully", await customerService.listReviews(typeof req.query.foodId === "string" ? req.query.foodId : undefined)));

export const customerController: { getProfile: RequestHandler; updateProfile: RequestHandler; getCart: RequestHandler; addItem: RequestHandler; updateItem: RequestHandler; removeItem: RequestHandler; clearCart: RequestHandler; checkout: RequestHandler; getOrders: RequestHandler; getOrder: RequestHandler; cancelOrder: RequestHandler; createReview: RequestHandler; listReviews: RequestHandler } = { getProfile, updateProfile, getCart, addItem, updateItem, removeItem, clearCart, checkout, getOrders, getOrder, cancelOrder, createReview, listReviews };
