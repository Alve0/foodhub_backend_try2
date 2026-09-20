import express, { type Application } from "express";
import cors from "cors";
import { appRouter } from "./routes/route";
import { errorHandler } from "./middleware/error-handler";

export const app: Application = express();

app.use(express.json());
app.use(cors());

app.use("/api/v1", appRouter);
app.use(errorHandler);
