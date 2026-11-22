import { Router } from "express";

import { login, logout, me, refresh, register } from "../controllers/auth.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validateBody } from "../middleware/validate.ts";
import { jsonContent, protectedRoute, registry } from "../openapi.ts";
import {
  authResponseSchema,
  errorSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  tokensSchema,
  userProfileSchema,
  validationErrorSchema,
} from "../validators/auth.validator.ts";

const router = Router();

// Public routes: validate the body first, then run the controller
router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.post("/refresh", validateBody(refreshSchema), refresh);

// Protected routes: require a valid access token
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;

// ---------- OpenAPI documentation ----------

const validationError = jsonContent(validationErrorSchema, "Validation failed");
const unauthorized = jsonContent(errorSchema, "Missing, invalid or expired access token");

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  description:
    "Creates a user with a bcrypt-hashed password and returns the user with a new token pair. " +
    "Access token lives 15 minutes, refresh token 7 days.",
  request: { body: jsonContent(registerSchema, "New user data") },
  responses: {
    201: jsonContent(authResponseSchema, "User created"),
    400: validationError,
    409: jsonContent(errorSchema, "Username or email already taken"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Log in",
  description: "Checks credentials and returns a new token pair. The previous refresh token is replaced.",
  request: { body: jsonContent(loginSchema, "User credentials") },
  responses: {
    200: jsonContent(authResponseSchema, "Logged in"),
    400: validationError,
    401: jsonContent(errorSchema, "Invalid credentials"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Refresh the token pair",
  description:
    "Verifies the refresh token and returns a new token pair. " +
    "Token rotation: the old refresh token is deleted and cannot be used again.",
  request: { body: jsonContent(refreshSchema, "Current refresh token") },
  responses: {
    200: jsonContent(tokensSchema, "New token pair"),
    400: validationError,
    401: jsonContent(errorSchema, "Invalid, expired or already used refresh token"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Log out",
  description: "Invalidates the refresh token of the current user. Always returns 204.",
  security: protectedRoute,
  responses: {
    204: { description: "Logged out (no content)" },
    401: unauthorized,
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Get current user profile",
  security: protectedRoute,
  responses: {
    200: jsonContent(userProfileSchema, "Current user (without password)"),
    401: unauthorized,
    404: jsonContent(errorSchema, "User not found"),
  },
});
