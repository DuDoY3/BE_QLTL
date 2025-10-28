import { Router } from "express";
import {
  createItemHandler,
  getItemByIdHandler,
  getItemsHandler,
  updateItemHandler,
  deleteItemHandler,
  downloadItemHandler,
} from "../controllers/driveItem.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";
import {
  createDriveItemSchema,
  getItemSchema,
  getItemsSchema,
  updateItemSchema,
  deleteItemSchema,
} from "../validations/driveItem.validation";
import upload from "../middlewares/upload";

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

// Create item (file upload or folder)
router.post("/", upload.single("file"), createItemHandler);

// Get items list
router.get("/", validate(getItemsSchema), getItemsHandler);

// Get single item
router.get("/:itemId", validate(getItemSchema), getItemByIdHandler);

// Download file
router.get("/:itemId/download", validate(getItemSchema), downloadItemHandler);

// Update item
router.put("/:itemId", validate(updateItemSchema), updateItemHandler);

// Delete item
router.delete("/:itemId", validate(deleteItemSchema), deleteItemHandler);

export default router;
