import { Router } from "express";
import { authenticateJWT, requireRole } from "../../middleware/jwt";
import { foodController } from "./food.controller";

const route: Router = Router();
route.get("/categories", foodController.listCategories);
route.get("/", foodController.listFoods);
route.get("/:id", foodController.getFood);
route.post(
  "/",
  authenticateJWT,
  requireRole("provider"),
  foodController.createFood,
);
route.patch(
  "/:id",
  authenticateJWT,
  requireRole("provider"),
  foodController.updateFood,
);
route.delete(
  "/:id",
  authenticateJWT,
  requireRole("provider"),
  foodController.deleteFood,
);
route.post(
  "/categories",
  authenticateJWT,
  requireRole("admin"),
  foodController.createCategory,
);
route.patch(
  "/categories/:id",
  authenticateJWT,
  requireRole("admin"),
  foodController.updateCategory,
);
route.delete(
  "/categories/:id",
  authenticateJWT,
  requireRole("admin"),
  foodController.deleteCategory,
);

export const foodRoute: Router = route;
