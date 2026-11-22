// Import z from openapi.ts so extendZodWithOpenApi() has already run and .openapi() exists
import { z } from "../openapi.ts";

// ---------- Request schemas (used by validateBody and in OpenAPI docs) ----------

export const registerSchema = z
  .object({
    username: z.string().trim().min(3).max(30).openapi({ example: "ivan_petrenko" }),
    // Normalized to lowercase so "Ivan@Example.com" and "ivan@example.com" are the same email.
    // trim/lowercase must run before the email check, hence string().pipe(email())
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email())
      // pipe() hides the email format from the docs, so declare it explicitly
      .openapi({ format: "email", example: "ivan@example.com" }),
    password: z.string().min(6).openapi({ example: "secret123" }),
    name: z.string().trim().min(2).openapi({ example: "Іван" }),
  })
  .openapi("RegisterRequest");

// No length rules here on purpose: wrong credentials must return 401 "Invalid credentials",
// not a 400 that hints which field is wrong
export const loginSchema = z
  .object({
    username: z.string().min(1).openapi({ example: "ivan_petrenko" }),
    password: z.string().min(1).openapi({ example: "secret123" }),
  })
  .openapi("LoginRequest");

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1).openapi({ example: "eyJhbGci..." }),
  })
  .openapi("RefreshRequest");

// ---------- Response schemas (used only in OpenAPI docs) ----------

// Public user data: password is never part of a response
export const userSchema = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    username: z.string().openapi({ example: "ivan_petrenko" }),
    email: z.string().openapi({ example: "ivan@example.com" }),
    name: z.string().openapi({ example: "Іван" }),
  })
  .openapi("User");

export const userProfileSchema = userSchema
  .extend({
    createdAt: z.string().openapi({ example: "2025-01-10T12:00:00.000Z" }),
  })
  .openapi("UserProfile");

export const tokensSchema = z
  .object({
    accessToken: z.string().openapi({ example: "eyJhbGci..." }),
    refreshToken: z.string().openapi({ example: "eyJhbGci..." }),
  })
  .openapi("Tokens");

export const authResponseSchema = tokensSchema
  .extend({ user: userSchema })
  .openapi("AuthResponse");

export const errorSchema = z
  .object({
    error: z.string().openapi({ example: "Invalid credentials" }),
  })
  .openapi("Error");

export const validationErrorSchema = z
  .object({
    error: z.string().openapi({ example: "Validation failed" }),
    details: z
      .record(z.string(), z.array(z.string()))
      .openapi({ example: { body: ["username: Too small: expected string to have >=3 characters"] } }),
  })
  .openapi("ValidationError");

// Types inferred from schemas, used in controllers
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
