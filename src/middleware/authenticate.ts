import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";

import { verifyToken } from "../utils/tokens.ts";

// Data about the authenticated user, available as req.user in protected routes
export interface AuthUser {
  // User id; converted from the JWT string `sub` to a number so it can be compared with DB ids
  sub: number;
}

// Module augmentation: tell TypeScript that Express Request has an optional `user` field
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  // Expected format: "Authorization: Bearer <accessToken>"
  if (!header || !header.startsWith("Bearer ")) {
    return next(createHttpError(401, "Missing or invalid Authorization header"));
  }

  const token = header.slice("Bearer ".length).trim();

  // Checks signature, expiration and that it is an access token (not a refresh token)
  const payload = verifyToken(token, "access");

  if (!payload) {
    return next(createHttpError(401, "Invalid or expired token"));
  }

  req.user = { sub: Number(payload.sub) };
  next();
}
