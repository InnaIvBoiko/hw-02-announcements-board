import { Router } from "express";

import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementById,
  getAnnouncements,
  updateAnnouncement,
} from "../controllers/announcements.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.ts";
import { jsonContent, protectedRoute, registry } from "../openapi.ts";
import {
  announcementListSchema,
  announcementSchema,
  createAnnouncementSchema,
  idParamSchema,
  listQuerySchema,
  updateAnnouncementSchema,
} from "../validators/announcements.validator.ts";
import { errorSchema, validationErrorSchema } from "../validators/auth.validator.ts";

const router = Router();

// Public routes
router.get("/", validateQuery(listQuerySchema), getAnnouncements);
router.get("/:id", validateParams(idParamSchema), getAnnouncementById);

// Protected routes: authenticate first (401), then validate input (400)
router.post("/", authenticate, validateBody(createAnnouncementSchema), createAnnouncement);
router.patch(
  "/:id",
  authenticate,
  validateParams(idParamSchema),
  validateBody(updateAnnouncementSchema),
  updateAnnouncement,
);
router.delete("/:id", authenticate, validateParams(idParamSchema), deleteAnnouncement);

export default router;

// ---------- OpenAPI documentation ----------

const validationError = jsonContent(validationErrorSchema, "Validation failed");
const unauthorized = jsonContent(errorSchema, "Missing, invalid or expired access token");
const forbidden = jsonContent(errorSchema, "Access denied: the announcement belongs to another user");
const notFound = jsonContent(errorSchema, "Announcement not found");

registry.registerPath({
  method: "get",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "List announcements",
  description:
    "Public. 10 announcements per page, optional case-insensitive search in title, " +
    "sorted by creation date (newest first by default).",
  request: { query: listQuerySchema },
  responses: {
    200: jsonContent(announcementListSchema, "Page of announcements with pagination info"),
    400: validationError,
  },
});

registry.registerPath({
  method: "get",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Get an announcement by id",
  description: "Public. Returns the announcement with its author.",
  request: { params: idParamSchema },
  responses: {
    200: jsonContent(announcementSchema, "Announcement"),
    400: validationError,
    404: notFound,
  },
});

registry.registerPath({
  method: "post",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "Create an announcement",
  description: "The author is taken from the access token, not from the request body.",
  security: protectedRoute,
  request: { body: jsonContent(createAnnouncementSchema, "New announcement") },
  responses: {
    201: jsonContent(announcementSchema, "Announcement created"),
    400: validationError,
    401: unauthorized,
  },
});

registry.registerPath({
  method: "patch",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Update own announcement",
  description:
    "Partial update: send at least one field. Only the author can update. updatedAt is set automatically.",
  security: protectedRoute,
  request: {
    params: idParamSchema,
    body: jsonContent(updateAnnouncementSchema, "Fields to update (at least one)"),
  },
  responses: {
    200: jsonContent(announcementSchema, "Updated announcement"),
    400: validationError,
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

registry.registerPath({
  method: "delete",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Delete own announcement",
  description: "Only the author can delete.",
  security: protectedRoute,
  request: { params: idParamSchema },
  responses: {
    204: { description: "Deleted (no content)" },
    400: validationError,
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});
