import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

type RequestPart = "body" | "params" | "query";

// Turns Zod issues into readable messages, e.g. "title: Too small: expected string to have >=5 characters"
function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) =>
    issue.path.length > 0
      ? `${issue.path.join(".")}: ${issue.message}`
      : issue.message,
  );
}

// Factory: builds a middleware that validates one part of the request against a Zod schema
function createValidator(part: RequestPart) {
  return (schema: z.ZodType) =>
    (req: Request, res: Response, next: NextFunction) => {
      // safeParse does not throw: it returns { success, data } or { success, error }
      const result = schema.safeParse(req[part]);

      if (!result.success) {
        // Same response shape as the JSON parse error in app.ts
        return res.status(400).json({
          error: "Validation failed",
          details: { [part]: formatIssues(result.error) },
        });
      }

      // Replace raw input with parsed data (coerced types, defaults, stripped unknown keys).
      // In Express 5 req.query is a read-only getter, so it must be redefined instead of assigned.
      Object.defineProperty(req, part, {
        value: result.data,
        writable: true,
        enumerable: true,
        configurable: true,
      });

      next();
    };
}

export const validateBody = createValidator("body");
export const validateParams = createValidator("params");
export const validateQuery = createValidator("query");
