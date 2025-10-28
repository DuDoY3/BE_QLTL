import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";

export interface AuthUser {
    userId: string;
    username: string;
    email: string;
    role: UserRole;
}

/**
 * Verify JWT token and extract user information
 * This backend receives tokens from a separate authentication service
 * and only verifies them to identify the user's role (ADMIN, TEACHER, STUDENT)
 */
export function verifyToken(token: string): AuthUser {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as any;
        return {
            userId: decoded.userId,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role,
        };
    } catch (error) {
        throw new Error("Invalid or expired token");
    }
}

