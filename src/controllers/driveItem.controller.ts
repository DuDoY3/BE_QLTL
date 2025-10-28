import { Request, Response, NextFunction } from "express";
import * as driveItemService from "../services/driveItem.service";
import { createDriveItemSchema } from "../validations/driveItem.validation";
import { ZodError } from "zod";
import fs from "fs";

export async function createItemHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.userId;

    let newItem;
    if (req.file) {
      const metadata = JSON.parse(req.body.document);
      const validatedMetadata = createDriveItemSchema.parse({
        body: metadata,
      }).body;
      newItem = await driveItemService.createFile(
        validatedMetadata,
        userId,
        req.file,
      );
    } else {
      const validatedBody = createDriveItemSchema.parse({
        body: req.body,
      }).body;
      newItem = await driveItemService.createItem(validatedBody, userId);
    }

    res.status(201).json({
      success: true,
      data: newItem,
      // message: "Item created successfully",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: error.issues,
        },
      });
    }
    // For all other errors, pass them to the 500 handler
    next(error);
  }
}

export async function getItemByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { itemId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const item = await driveItemService.findItemById(itemId!, userId, userRole);

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: {
          code: "ACCESS_DENIED",
          message: error.message,
        },
      });
    }
    next(error);
  }
}

export async function getItemsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const items = await driveItemService.findItems(req.query, userId, userRole);

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateItemHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { itemId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const updatedItem = await driveItemService.updateItem(itemId!, req.body, userId, userRole);

    res.status(200).json({
      success: true,
      data: updatedItem,
      message: "Item updated successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: {
          code: "ACCESS_DENIED",
          message: error.message,
        },
      });
    }
    next(error);
  }
}

export async function deleteItemHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { itemId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    await driveItemService.deleteItem(itemId!, userId, userRole);

    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: {
          code: "ACCESS_DENIED",
          message: error.message,
        },
      });
    }
    next(error);
  }
}

export async function downloadItemHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { itemId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const fileInfo = await driveItemService.downloadItem(itemId!, userId, userRole);

    // Set headers for file download
    res.setHeader('Content-Type', fileInfo.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.name}"`);
    res.setHeader('Content-Length', fileInfo.size.toString());

    // Stream the file
    const fileStream = fs.createReadStream(fileInfo.storagePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: "FILE_STREAM_ERROR",
            message: "Error reading file",
          },
        });
      }
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes("Access denied")) {
      return res.status(403).json({
        success: false,
        error: {
          code: "ACCESS_DENIED",
          message: error.message,
        },
      });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: {
          code: "FILE_NOT_FOUND",
          message: error.message,
        },
      });
    }
    next(error);
  }
}
