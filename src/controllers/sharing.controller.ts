import { Request, Response, NextFunction } from "express";
import * as sharingService from "../services/sharing.service";
import { ShareLevel } from "@prisma/client";
import { z } from "zod";

const shareItemSchema = z.object({
    body: z.object({
        sharedWithUserId: z.string().uuid("Invalid user ID"),
        permissionLevel: z.enum([ShareLevel.VIEWER, ShareLevel.EDITOR]),
    }),
});

const updateShareSchema = z.object({
    body: z.object({
        permissionLevel: z.enum([ShareLevel.VIEWER, ShareLevel.EDITOR]),
    }),
});

export async function shareItemHandler(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { itemId } = req.params;
        const { sharedWithUserId, permissionLevel } = req.body;
        // Đã có ! ở đây, không cần sửa
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        const share = await sharingService.shareItem(
            itemId!, // Thêm ! để đảm bảo itemId không undefined
            sharedWithUserId,
            permissionLevel,
            userId,
            userRole
        );

        res.status(201).json({
            success: true,
            data: share,
            message: "Item shared successfully",
        });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("permission")) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: "ACCESS_DENIED",
                        message: error.message,
                    },
                });
            }
            if (error.message.includes("yourself")) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "INVALID_REQUEST",
                        message: error.message,
                    },
                });
            }
            if (error.message.includes("not found")) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: "NOT_FOUND",
                        message: error.message,
                    },
                });
            }
        }
        next(error);
    }
}

export async function unshareItemHandler(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { itemId, shareId } = req.params;
        // Đã có ! ở đây, không cần sửa
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        // Get the share to find the sharedWithUserId
        const share = await sharingService.getItemShares(itemId!, userId, userRole); // Thêm !
        const targetShare = share.find((s: any) => s.shareId === shareId);

        if (!targetShare) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "SHARE_NOT_FOUND",
                    message: "Share not found",
                },
            });
        }

        await sharingService.unshareItem(
            itemId!, // Thêm !
            targetShare.sharedWithUserId,
            userId,
            userRole
        );

        res.status(200).json({
            success: true,
            message: "Item unshared successfully",
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes("permission")) {
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

export async function getItemSharesHandler(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { itemId } = req.params;
        // Đã có ! ở đây, không cần sửa
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        const shares = await sharingService.getItemShares(itemId!, userId, userRole); // Thêm !

        res.status(200).json({
            success: true,
            data: shares,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes("permission")) {
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

export async function getSharedWithMeHandler(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        // Đã có ! ở đây, không cần sửa
        const userId = req.user!.userId;
        const sharedItems = await sharingService.getSharedWithMe(userId);

        res.status(200).json({
            success: true,
            data: sharedItems,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateShareHandler(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { itemId, shareId } = req.params;
        const { permissionLevel } = req.body;
        // Đã có ! ở đây, không cần sửa
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        // Get the share to find the sharedWithUserId
        const shares = await sharingService.getItemShares(itemId!, userId, userRole); // Thêm !
        const targetShare = shares.find((s: any) => s.shareId === shareId);

        if (!targetShare) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "SHARE_NOT_FOUND",
                    message: "Share not found",
                },
            });
        }

        const updatedShare = await sharingService.shareItem(
            itemId!, // Thêm !
            targetShare.sharedWithUserId,
            permissionLevel,
            userId,
            userRole
        );

        res.status(200).json({
            success: true,
            data: updatedShare,
            message: "Share updated successfully",
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes("permission")) {
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

export { shareItemSchema, updateShareSchema };