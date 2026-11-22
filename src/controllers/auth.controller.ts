import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import createHttpError from "http-errors";

import prisma from "../../prisma/client.ts";
import { generateTokens, verifyToken } from "../utils/tokens.ts";
import type { LoginInput, RefreshInput, RegisterInput } from "../validators/auth.validator.ts";

const SALT_ROUNDS = 10;

// Public user fields: password is never selected, so it can never leak into a response
export const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
} as const;

// Issues a new token pair and replaces any previous refresh token of the user.
// Runs in a transaction so the old token is never deleted without the new one being saved.
async function issueTokens(userId: number) {
  const tokens = generateTokens(userId);

  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId } }),
    prisma.refreshToken.create({ data: { token: tokens.refreshToken, userId } }),
  ]);

  return tokens;
}

// POST /auth/register
export async function register(req: Request, res: Response) {
  const { username, email, password, name } = req.body as RegisterInput;

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { id: true },
  });

  if (existingUser) {
    throw createHttpError(409, "Username or email already taken");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { username, email, password: hashedPassword, name },
    select: publicUserSelect,
  });

  const tokens = await issueTokens(user.id);

  res.status(201).json({ user, ...tokens });
}

// POST /auth/login
export async function login(req: Request, res: Response) {
  const { username, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { username } });

  // Same message for unknown user and wrong password, so attackers can't tell which one failed
  const isPasswordValid = user ? await bcrypt.compare(password, user.password) : false;

  if (!user || !isPasswordValid) {
    throw createHttpError(401, "Invalid credentials");
  }

  const tokens = await issueTokens(user.id);

  res.json({
    user: { id: user.id, username: user.username, email: user.email, name: user.name },
    ...tokens,
  });
}

// POST /auth/refresh
export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body as RefreshInput;

  // 1. Check signature, expiration and token type
  const payload = verifyToken(refreshToken, "refresh");

  if (!payload) {
    throw createHttpError(401, "Invalid refresh token");
  }

  const userId = Number(payload.sub);
  const tokens = generateTokens(userId);

  // 2. Token rotation: delete the old token and save the new one atomically.
  // deleteMany + count check means a token missing from the DB (already used or logged out) is rejected,
  // and two parallel requests with the same token can't both succeed.
  const rotated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.refreshToken.deleteMany({
      where: { token: refreshToken, userId },
    });

    if (count === 0) {
      return false;
    }

    await tx.refreshToken.create({ data: { token: tokens.refreshToken, userId } });
    return true;
  });

  if (!rotated) {
    throw createHttpError(401, "Invalid refresh token");
  }

  res.json(tokens);
}

// POST /auth/logout (protected)
export async function logout(req: Request, res: Response) {
  // deleteMany does not throw when nothing matches (delete would throw P2025),
  // so we always return 204 whether the token was in the DB or not
  await prisma.refreshToken.deleteMany({ where: { userId: req.user!.sub } });

  // 204 must not have a body, so end the response without sending any data
  res.status(204).end();
}

// GET /auth/me (protected)
export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { ...publicUserSelect, createdAt: true },
  });

  // Token can still be valid for a user that has been deleted in the meantime
  if (!user) {
    throw createHttpError(404, "User not found");
  }

  res.json(user);
}
