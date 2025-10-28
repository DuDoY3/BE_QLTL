import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service";
import { UserRole } from "@prisma/client";

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                username: string;
                email: string;
                role: UserRole;
            };
        }
    }
}

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                error: {
                    code: "UNAUTHORIZED",
                    message: "Access token is required",
                },
            });
        }

        const token = authHeader.substring(7); // Remove "Bearer " prefix

        try {
            const user = verifyToken(token);
            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                error: {
                    code: "INVALID_TOKEN",
                    message: "Invalid or expired token",
                },
            });
        }
    } catch (error) {
        next(error);
    }
};

export const requireRole = (allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: "UNAUTHORIZED",
                    message: "Authentication required",
                },
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: {
                    code: "FORBIDDEN",
                    message: "Insufficient permissions",
                },
            });
        }

        next();
    };
};

export const requireAdmin = requireRole([UserRole.ADMIN]);
export const requireTeacherOrAdmin = requireRole([UserRole.TEACHER, UserRole.ADMIN]);
export const requireAnyRole = requireRole([UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT]);
