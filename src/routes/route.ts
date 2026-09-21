import { Router, type Request, type Response } from "express";
import { sendResponse } from "../utils/send-response";
import { authRoute } from "../modules/auth/auth.route";

const router: Router = Router();

router.get("/", (req: Request, res: Response) => {
  sendResponse(res, 200, "surver is running fine");
});

router.use("/auth", authRoute);

export const appRouter = router;
