import { Router } from "express";

import { getAnnouncementById, getAnnouncements } from "../controllers/announcements.controller.ts";
import { validateParams, validateQuery } from "../middleware/validate.ts";
import { idParamSchema, listQuerySchema } from "../validators/announcements.validator.ts";

const router = Router();

// Public routes
router.get("/", validateQuery(listQuerySchema), getAnnouncements);
router.get("/:id", validateParams(idParamSchema), getAnnouncementById);

export default router;
