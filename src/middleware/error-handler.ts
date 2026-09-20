import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/app-error";
import { sendResponse } from "../utils/send-response";

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (response.headersSent) {
    return;
  }

  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message =
    error instanceof AppError ? error.message : "Internal server error";

  sendResponse(response, statusCode, message);
};
