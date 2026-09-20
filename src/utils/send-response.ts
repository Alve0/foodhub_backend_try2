import type { Response } from "express";

export type ApiSuccessResponse<T> = {
  status: string;
  message: string;
  data?: T;
};

export const sendResponse = <T>(
  response: Response,
  statusCode: number,
  message: string,
  data?: T,
): Response<ApiSuccessResponse<T>> => {
  const body: ApiSuccessResponse<T> =
    data === undefined
      ? { status: String(statusCode), message }
      : { status: String(statusCode), message, data };

  return response.status(statusCode).json(body);
};
