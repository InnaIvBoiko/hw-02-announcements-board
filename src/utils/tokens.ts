import "dotenv/config";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

// Fail fast at startup instead of signing tokens with an undefined secret
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";

export type TokenType = "access" | "refresh";

// Data stored inside our JWTs; `sub` (subject) holds the user id as a string, per the JWT spec
export interface TokenPayload extends jwt.JwtPayload {
  sub: string;
  type: TokenType;
}

function signToken(userId: number, type: TokenType, expiresIn: string) {
  return jwt.sign({ type }, JWT_SECRET!, {
    subject: String(userId),
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
    // Random id makes every token unique, even if two are issued in the same second
    jwtid: randomUUID(),
  });
}

export function generateTokens(userId: number) {
  return {
    accessToken: signToken(userId, "access", ACCESS_TOKEN_TTL),
    refreshToken: signToken(userId, "refresh", REFRESH_TOKEN_TTL),
  };
}

// Verifies signature and expiration; returns null instead of throwing.
// Also checks the token type, so a refresh token cannot be used as an access token and vice versa.
export function verifyToken(token: string, expectedType: TokenType): TokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET!);

    if (typeof payload === "string" || payload.type !== expectedType || !payload.sub) {
      return null;
    }

    return payload as TokenPayload;
  } catch {
    // Invalid signature, malformed or expired token
    return null;
  }
}
