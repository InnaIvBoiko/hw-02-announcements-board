import { Router } from "express";

import { login, refresh, register } from "../controllers/auth.controller.ts";
import { validateBody } from "../middleware/validate.ts";
import { loginSchema, refreshSchema, registerSchema } from "../validators/auth.validator.ts";

const router = Router();

// Public routes: validate the body first, then run the controller
router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.post("/refresh", validateBody(refreshSchema), refresh);

export default router;
