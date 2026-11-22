import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// Re-export the extended z so schemas always have .openapi() available
export { z };

export const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Access token from /auth/register, /auth/login or /auth/refresh",
});

// Add to protected routes: shows the lock icon in Swagger UI and sends the Bearer token
export const protectedRoute = [{ [bearerAuth.name]: [] }];

// Shortcut for a JSON request/response body in registerPath()
export function jsonContent(schema: z.ZodType, description: string) {
  return {
    description,
    content: { "application/json": { schema } },
  };
}

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Announcements Board API",
      version: "1.0.0",
      description:
        "JSON REST API for an announcements board with JWT authentication (access + refresh tokens with rotation). " +
        "Anyone can browse announcements; registered users can create them and edit or delete only their own.",
    },
    servers: [{ url: "http://localhost:3000" }],
    tags: [
      { name: "Auth", description: "Registration, login, token refresh, logout and profile" },
      { name: "Announcements", description: "Public listing and owner-only management of announcements" },
    ],
  });
}
