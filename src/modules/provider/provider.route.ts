import { Router } from "express";
import { authenticateJWT, requireRole } from "../../middleware/jwt";
import { providerController } from "./provider.controller";

const route: Router = Router();
route.use(authenticateJWT, requireRole("provider"));
route.get("/profile", providerController.getProfile);
route.patch("/profile", providerController.updateProfile);
route.patch("/availability", providerController.setOpen);
route.get("/orders", providerController.getOrders);
route.patch("/orders/:id/status", providerController.updateOrderStatus);
export const providerRoute: Router = route;
