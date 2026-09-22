import { Router } from "express";
import { authController } from "./auth.controller";
import { authenticateJWT, requireRole } from "../../middleware/jwt";
const route: Router = Router();

route.post("/register", authController.createUser);
route.post("/login", authController.login);
route.post("/logout", authenticateJWT, authController.logout);
route.post("/forgot-password", authController.forgotPassword);
route.post("/reset-password", authController.resetPassword);
route.patch("/profile", authenticateJWT, authController.updateProfile);
route.patch("/password", authenticateJWT, authController.changePassword);
route.get(
  "/users",
  authenticateJWT,
  requireRole("admin"),
  authController.getAllUsers,
);
route.get(
  "/providers",
  authenticateJWT,
  requireRole("admin"),
  authController.getAllProviders,
);
route.get(
  "/customers",
  authenticateJWT,
  requireRole("admin"),
  authController.getAllCustomers,
);

export const authRoute = route;
