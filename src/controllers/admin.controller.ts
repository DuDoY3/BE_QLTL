import { Request, Response, NextFunction } from "express";
import * as adminService from "../services/admin.service";
import { UserRole } from "@prisma/client";
import { z } from "zod";

// --- Schemas ---
const getUsersSchema = z.object({
  query: z.object({
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0),
    role: z
      .enum([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT])
      .optional(),
  }),
});

const getItemsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0),
    ownerId: z.string().uuid().optional(),
  }),
});

const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.enum([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT]),
  }),
});

// --- Handlers ---

export async function getDashboardStatsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const [userStats, storageStats, systemStats] = await Promise.all([
      adminService.getUserStats(),
      adminService.getStorageStats(),
      adminService.getSystemStats(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: userStats,
        storage: storageStats,
        system: systemStats,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // FIX: Use zod.parse for safe validation and type inference.
    // This replaces the unsafe type assertion `as ...`
    const { query } = getUsersSchema.parse({ query: req.query });

    const result = await adminService.getAllUsers(
      query.limit,
      query.offset,
      query.role,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getItemsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // FIX: Use zod.parse for safe validation and type inference.
    const { query } = getItemsSchema.parse({ query: req.query });

    const result = await adminService.getAllItems(
      query.limit,
      query.offset,
      query.ownerId,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { userId } = req.params;

    // FIX: Add explicit check for userId to satisfy TypeScript
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "User ID is required" },
      });
    }

    // Check req.user existence for type safety
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    // Prevent admin from deleting themselves
    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Cannot delete your own account",
        },
      });
    }

    await adminService.deleteUser(userId);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: error.message,
        },
      });
    }
    next(error);
  }
}

export async function updateUserRoleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { userId } = req.params;
    // FIX: Use zod.parse for safe validation and type inference on the body
    const { body } = updateUserRoleSchema.parse({ body: req.body });

    // FIX: Add explicit check for userId to satisfy TypeScript
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "User ID is required" },
      });
    }

    // Check req.user existence for type safety
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    // Prevent admin from changing their own role
    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Cannot change your own role",
        },
      });
    }

    await adminService.updateUserRole(userId, body.role);

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: error.message,
        },
      });
    }
    next(error);
  }
}

// Export schemas for use in routes
export { getUsersSchema, getItemsSchema, updateUserRoleSchema };
