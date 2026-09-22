import jwt, { type SignOptions } from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/env.config";
import { AppError } from "../utils/app-error";
import { prisma } from "../config/prisma";

export type AuthTokenPayload = {
  sub: string;
  role: string;
  token?: string;
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

export const getAuthToken = (request: Request): string | undefined => {
  const authorization = request.header("authorization");

  if (authorization) {
    const [scheme, token] = authorization.split(" ");
    if (scheme?.toLowerCase() === "bearer" && token && !token.includes(" ")) {
      return token;
    }
  }
  return getCookieToken(request);
};

const getCookieToken = (request: Request): string | undefined => {
  const cookies = request.header("cookie")?.split(";") ?? [];
  const authCookie = cookies.find((cookie) =>
    cookie.trim().startsWith("auth_token="),
  );
  return authCookie?.split("=").slice(1).join("=").trim();
};

export const authenticateJWT = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const token = getAuthToken(request);

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

    prisma.session
      .findUnique({ where: { token }, include: { user: true } })
      .then((session) => {
        if (
          !session ||
          session.user.id !== decoded.sub ||
          session.user.isActive === false
        ) {
          next(new AppError("Session expired or revoked", 401));
          return;
        }
        request.user = { sub: decoded.sub, role: decoded.role, token };
        next();
      })
      .catch(() =>
        next(new AppError("Authentication service unavailable", 503)),
      );
  } catch {
    next(new AppError("Invalid or expired authentication token", 401));
  }
};

export const requireRole =
  (...roles: string[]) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user || !roles.includes(request.user.role)) {
      next(new AppError("Forbidden", 403));
      return;
    }
    next();
  };
