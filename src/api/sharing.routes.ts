import { Router } from "express";
import {
    shareItemHandler,
    unshareItemHandler,
    getItemSharesHandler,
    getSharedWithMeHandler,
    updateShareHandler,
    shareItemSchema,
    updateShareSchema,
} from "../controllers/sharing.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

// Share an item with a user
router.post("/:itemId/shares", validate(shareItemSchema), shareItemHandler);

// Get shares for an item
router.get("/:itemId/shares", getItemSharesHandler);

// Update a share
router.put("/:itemId/shares/:shareId", validate(updateShareSchema), updateShareHandler);

// Remove a share
router.delete("/:itemId/shares/:shareId", unshareItemHandler);

// Get items shared with me
router.get("/shared-with-me", getSharedWithMeHandler);

export default router;
