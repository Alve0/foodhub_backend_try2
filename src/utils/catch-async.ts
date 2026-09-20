import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
) => Promise<unknown>;

export const catchAsync = (handler: AsyncHandler): RequestHandler => {
  return (request, response, next) => {
    void Promise.resolve(handler(request, response, next)).catch(next);
  };
};
