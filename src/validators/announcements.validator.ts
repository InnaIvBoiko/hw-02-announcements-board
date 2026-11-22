// Import z from openapi.ts so extendZodWithOpenApi() has already run and .openapi() exists
import { z } from "../openapi.ts";
// Category enum generated from schema.prisma: one source of truth for allowed values
import { Category } from "../../generated/prisma/enums.ts";
import { userSchema } from "./auth.validator.ts";

export const PER_PAGE = 10;

// ---------- Params / query schemas ----------

// Route params are strings: coerce "5" -> 5 and reject "abc", "0", "-1", "1.5"
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive().openapi({ example: 5 }),
});

export const listQuerySchema = z.object({
  // Empty or missing search returns all announcements
  search: z.string().trim().optional().openapi({ example: "ноутбук" }),
  sort: z.enum(["newest", "oldest"]).default("newest"),
  page: z.coerce.number().int().positive().default(1).openapi({ example: 1 }),
});

// ---------- Body schemas ----------

export const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(5).max(50).openapi({ example: "Продам велосипед" }),
    description: z.string().trim().min(10).openapi({ example: "Гірський велосипед, 21 швидкість" }),
    price: z.number().positive().openapi({ example: 8000 }),
    category: z.enum(Category).openapi({ example: "sale" }),
  })
  .openapi("CreateAnnouncementRequest");

// Same rules, all fields optional, but an empty object {} is not a valid update
export const updateAnnouncementSchema = createAnnouncementSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })
  .openapi("UpdateAnnouncementRequest");

// ---------- Response schemas (used only in OpenAPI docs) ----------

export const announcementSchema = z
  .object({
    id: z.number().int().openapi({ example: 5 }),
    title: z.string().openapi({ example: "Продам ноутбук ASUS" }),
    description: z.string().openapi({ example: "Відмінний стан, 16GB RAM" }),
    price: z.number().openapi({ example: 18000 }),
    category: z.enum(Category).openapi({ example: "sale" }),
    createdAt: z.string().openapi({ example: "2025-01-10T12:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2025-01-10T12:00:00.000Z" }),
    user: userSchema,
  })
  .openapi("Announcement");

export const announcementListSchema = z
  .object({
    data: z.array(announcementSchema),
    pagination: z.object({
      total: z.number().int().openapi({ example: 23 }),
      page: z.number().int().openapi({ example: 2 }),
      totalPages: z.number().int().openapi({ example: 3 }),
      perPage: z.number().int().openapi({ example: PER_PAGE }),
    }),
  })
  .openapi("AnnouncementList");

// Types inferred from schemas, used in controllers
export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
