import { Router, type Request, type Response } from "express";

const router: Router = Router();

router.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "200",
    message: "surver is running fine",
  });
});

export const appRouter = router;
