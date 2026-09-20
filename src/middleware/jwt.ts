import jwt, { type SignOptions } from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/env.config";
import { AppError } from "../utils/app-error";

export type AuthTokenPayload = {
  sub: string;
  role: string;
};

export type AuthenticatedRequest = Request & {
  user: AuthTokenPayload;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

const tokenOptions: SignOptions = {
  expiresIn: JWT_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]>,
  algorithm: "HS256",
};

export const createAccessToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, tokenOptions);
};

const getBearerToken = (request: Request): string | undefined => {
  const authorization = request.header("authorization");

  if (!authorization) {
    return undefined;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token || token.includes(" ")) {
    return undefined;
  }

  return token;
};

export const authenticateJWT = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const token = getBearerToken(request);

  if (!token) {
    next(new AppError("Authentication required", 401));
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      typeof decoded.role !== "string"
    ) {
      next(new AppError("Invalid authentication token", 401));
      return;
    }

    request.user = {
      sub: decoded.sub,
      role: decoded.role,
    };
    next();
  } catch {
    next(new AppError("Invalid or expired authentication token", 401));
  }
};
