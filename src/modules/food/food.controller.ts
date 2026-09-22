import type { RequestHandler } from "express";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { foodService } from "./food.service";

const routeParam = (
  value: string | string[] | undefined,
  name: string,
): string => {
  if (typeof value !== "string" || !value)
    throw new Error(`${name} is required`);
  return value;
};

const listFoods: RequestHandler = catchAsync(async (req, res) =>
  sendResponse(
    res,
    200,
    "Foods retrieved successfully",
    await foodService.getFoods(req.query),
  ),
);
const getFood: RequestHandler = catchAsync(async (req, res) =>
  sendResponse(
    res,
    200,
    "Food retrieved successfully",
    await foodService.getFood(routeParam(req.params.id, "Food id")),
  ),
);
const createFood: RequestHandler = catchAsync(async (req, res) =>
  sendResponse(
    res,
    201,
    "Food created successfully",
    await foodService.createFood(req.user!.sub, req.body),
  ),
);
const updateFood: RequestHandler = catchAsync(async (req, res) =>
  sendResponse(
    res,
    200,
    "Food updated successfully",
    await foodService.updateFood(
      req.user!.sub,
      routeParam(req.params.id, "Food id"),
      req.body,
    ),
  ),
);
const deleteFood: RequestHandler = catchAsync(async (req, res) =>
  sendResponse(
    res,
    200,
    "Food deleted successfully",
    await foodService.deleteFood(
      req.user!.sub,
      routeParam(req.params.id, "Food id"),
    ),
  ),
);
const listCategories: RequestHandler = catchAsync(async (_req, res) =>
  sendResponse(
    res,
    200,
    "Categories retrieved successfully",
    await foodService.getCategories(),
  ),
);
const createCategory: RequestHandler = catchAsync(async (req, res) =>
  sendResponse(
    res,
    201,
    "Category created successfully",
    await foodService.createCategory(req.body),
  ),
);
const updateCategory: RequestHandler = catchAsync(async (req, res) =>
  sendResponse(
    res,
    200,
    "Category updated successfully",
    await foodService.updateCategory(
      routeParam(req.params.id, "Category id"),
      req.body,
    ),
  ),
);
const deleteCategory: RequestHandler = catchAsync(async (req, res) =>
  sendResponse(
    res,
    200,
    "Category deleted successfully",
    await foodService.deleteCategory(routeParam(req.params.id, "Category id")),
  ),
);

export const foodController: {
  listFoods: RequestHandler;
  getFood: RequestHandler;
  createFood: RequestHandler;
  updateFood: RequestHandler;
  deleteFood: RequestHandler;
  listCategories: RequestHandler;
  createCategory: RequestHandler;
  updateCategory: RequestHandler;
  deleteCategory: RequestHandler;
} = {
  listFoods,
  getFood,
  createFood,
  updateFood,
  deleteFood,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
