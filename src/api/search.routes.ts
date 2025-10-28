import { Router } from "express";
import {
    searchItemsHandler,
    searchByContentHandler,
    getRecentItemsHandler,
    searchSchema,
} from "../controllers/search.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

// Search items with filters
router.get("/", validate(searchSchema), searchItemsHandler);

// Search by content (full-text search)
router.get("/content", searchByContentHandler);

// Get recent items
router.get("/recent", getRecentItemsHandler);

export default router;

