import express, { type Application } from "express";
import cors from "cors";
import dotenv, { configDotenv } from "dotenv";
import { appRouter } from "./routes/route";

export const app: Application = express();

app.use(express.json());
app.use(cors());
dotenv.config();

app.use("/api/v1", appRouter);
