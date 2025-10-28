import { Router } from "express";
import {
    getDashboardStatsHandler,
    getUsersHandler,
    getItemsHandler,
    deleteUserHandler,
    updateUserRoleHandler,
    getUsersSchema,
    getItemsSchema,
    updateUserRoleSchema,
} from "../controllers/admin.controller";
import { validate } from "../middlewares/validate";
import { authenticate, requireAdmin } from "../middlewares/auth";

const router: Router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Dashboard stats
router.get("/dashboard", getDashboardStatsHandler);

// User management
router.get("/users", validate(getUsersSchema), getUsersHandler);
router.delete("/users/:userId", deleteUserHandler);
router.put("/users/:userId/role", validate(updateUserRoleSchema), updateUserRoleHandler);

// Item management
router.get("/items", validate(getItemsSchema), getItemsHandler);

export default router;




