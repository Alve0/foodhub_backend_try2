import { Router, type Request, type Response } from "express";
import { sendResponse } from "../utils/send-response";
import { authRoute } from "../modules/auth/auth.route";
import { customerRoute } from "../modules/customers/customer.route";
import { foodRoute } from "../modules/food/food.route";
import { providerRoute } from "../modules/provider/provider.route";

const router: Router = Router();

router.get("/", (req: Request, res: Response) => {
  sendResponse(res, 200, "surver is running fine");
});

router.use("/auth", authRoute);
router.use("/food", foodRoute);
router.use("/provider", providerRoute);
router.use("/customer", customerRoute);

export const appRouter = router;
