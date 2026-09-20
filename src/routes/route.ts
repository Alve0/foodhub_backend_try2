import { Router, type Request, type Response } from "express";
import { sendResponse } from "../utils/send-response";

const router: Router = Router();

router.get("/", (req: Request, res: Response) => {
  sendResponse(res, 200, "surver is running fine");
});

export const appRouter = router;
