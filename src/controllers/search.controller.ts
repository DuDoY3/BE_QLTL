import { Request, Response, NextFunction } from "express";
import * as searchService from "../services/search.service";
import { z } from "zod";

const searchSchema = z.object({
    query: z.object({
        q: z.string().optional(),
        itemType: z.enum(["FILE", "FOLDER"]).optional(),
        mimeType: z.string().optional(),
        ownerId: z.string().uuid().optional(),
        parentId: z.string().uuid().optional(),
        limit: z.coerce.number().min(1).max(100).default(20),
        offset: z.coerce.number().min(0).default(0),
    }),
});

export async function searchItemsHandler(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const userId = req.user!.userId;
        const userRole = req.user!.role;
        const filters = req.query;

        const result = await searchService.searchItems(
            filters as any,
            userId,
            userRole
        );

        res.status(200).json({
            success: true,
            data: {
                items: result.items,
                pagination: {
                    total: result.total,
                    limit: parseInt(filters.limit as string) || 20,
                    offset: parseInt(filters.offset as string) || 0,
                    hasMore: result.total > (parseInt(filters.offset as string) || 0) + (parseInt(filters.limit as string) || 20)
                }
            }
        });
    } catch (error) {
        next(error);
    }
}

export async function searchByContentHandler(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const userId = req.user!.userId;
        const userRole = req.user!.role;
        const { q } = req.query;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({
                success: false,
                error: {
                    code: "MISSING_QUERY",
                    message: "Search query is required",
                },
            });
        }

        const result = await searchService.searchByContent(
            q,
            userId,
            userRole,
            limit,
            offset
        );

        res.status(200).json({
            success: true,
            data: {
                items: result.items,
                pagination: {
                    total: result.total,
                    limit,
                    offset,
                    hasMore: result.total > offset + limit
                }
            }
        });
    } catch (error) {
        next(error);
    }
}

export async function getRecentItemsHandler(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const userId = req.user!.userId;
        const userRole = req.user!.role;
        const limit = parseInt(req.query.limit as string) || 10;

        const items = await searchService.getRecentItems(
            userId,
            userRole,
            limit
        );

        res.status(200).json({
            success: true,
            data: items,
        });
    } catch (error) {
        next(error);
    }
}

export { searchSchema };

