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
import {
  createAnnouncementSchema,
  idParamSchema,
  listQuerySchema,
  updateAnnouncementSchema,
} from "../validators/announcements.validator.ts";

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
