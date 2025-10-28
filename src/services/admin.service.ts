import { prisma } from "../lib/prisma";
import { UserRole } from "@prisma/client";

export interface UserStats {
    totalUsers: number;
    usersByRole: {
        ADMIN: number;
        TEACHER: number;
        STUDENT: number;
    };
    newUsersThisMonth: number;
}

export interface StorageStats {
    totalFiles: number;
    totalSize: bigint;
    filesByType: { [mimeType: string]: number };
    storageByUser: Array<{
        userId: string;
        username: string;
        fileCount: number;
        totalSize: bigint;
    }>;
}

export interface SystemStats {
    totalItems: number;
    totalShares: number;
    itemsByType: {
        FILE: number;
        FOLDER: number;
    };
    recentActivity: Array<{
        itemId: string;
        name: string;
        action: string;
        userId: string;
        username: string;
        timestamp: Date;
    }>;
}

export async function getUserStats(): Promise<UserStats> {
    const [totalUsers, usersByRole, newUsersThisMonth] = await Promise.all([
        prisma.user.count(),
        prisma.user.groupBy({
            by: ['role'],
            _count: { role: true }
        }),
        prisma.user.count({
            where: {
                createdAt: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            }
        })
    ]);

    const roleStats = {
        ADMIN: 0,
        TEACHER: 0,
        STUDENT: 0
    };

    usersByRole.forEach(role => {
        roleStats[role.role] = role._count.role;
    });

    return {
        totalUsers,
        usersByRole: roleStats,
        newUsersThisMonth
    };
}

export async function getStorageStats(): Promise<StorageStats> {
    const [totalFiles, fileMetadata, storageByUser] = await Promise.all([
        prisma.driveItem.count({
            where: { itemType: 'FILE' }
        }),
        prisma.fileMetadata.findMany({
            select: {
                mimeType: true,
                size: true,
                driveItem: {
                    select: {
                        ownerId: true,
                        owner: {
                            select: {
                                username: true
                            }
                        }
                    }
                }
            }
        }),
        prisma.driveItem.groupBy({
            by: ['ownerId'],
            where: { itemType: 'FILE' },
            _count: { itemId: true }
        })
    ]);

    const totalSize = fileMetadata.reduce((sum, file) => sum + file.size, BigInt(0));

    const filesByType: { [mimeType: string]: number } = {};
    fileMetadata.forEach(file => {
        filesByType[file.mimeType] = (filesByType[file.mimeType] || 0) + 1;
    });

    const storageByUserData = await Promise.all(
        storageByUser.map(async (user) => {
            const userInfo = await prisma.user.findUnique({
                where: { userId: user.ownerId },
                select: { username: true }
            });

            return {
                userId: user.ownerId,
                username: userInfo?.username || 'Unknown',
                fileCount: user._count.itemId,
                totalSize: BigInt(0) // Simplified for now
            };
        })
    );

    return {
        totalFiles,
        totalSize,
        filesByType,
        storageByUser: storageByUserData
    };
}

export async function getSystemStats(): Promise<SystemStats> {
    const [totalItems, totalShares, itemsByType] = await Promise.all([
        prisma.driveItem.count(),
        prisma.sharePermission.count(),
        prisma.driveItem.groupBy({
            by: ['itemType'],
            _count: { itemId: true }
        })
    ]);

    const typeStats = {
        FILE: 0,
        FOLDER: 0
    };

    itemsByType.forEach(type => {
        typeStats[type.itemType] = type._count.itemId;
    });

    // Get recent activity (last 10 items created/updated)
    const recentActivity = await prisma.driveItem.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' },
        include: {
            owner: {
                select: {
                    userId: true,
                    username: true
                }
            }
        }
    });

    const activityData = recentActivity.map(item => ({
        itemId: item.itemId,
        name: item.name,
        action: 'created',
        userId: item.owner.userId,
        username: item.owner.username,
        timestamp: item.createdAt
    }));

    return {
        totalItems,
        totalShares,
        itemsByType: typeStats,
        recentActivity: activityData
    };
}

export async function getAllUsers(
    limit: number = 20,
    offset: number = 0,
    role?: UserRole
) {
    const whereClause = role ? { role } : {};

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where: whereClause,
            select: {
                userId: true,
                username: true,
                email: true,
                role: true,
                createdAt: true,
                _count: {
                    select: {
                        ownedItems: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        }),
        prisma.user.count({ where: whereClause })
    ]);

    return {
        users,
        total,
        pagination: {
            limit,
            offset,
            hasMore: total > offset + limit
        }
    };
}

export async function getAllItems(
    limit: number = 20,
    offset: number = 0,
    ownerId?: string
) {
    const whereClause = ownerId ? { ownerId } : {};

    const [items, total] = await Promise.all([
        prisma.driveItem.findMany({
            where: whereClause,
            include: {
                owner: {
                    select: {
                        userId: true,
                        username: true,
                        email: true
                    }
                },
                fileMetadata: true,
                sharePermissions: {
                    include: {
                        sharedWithUser: {
                            select: {
                                userId: true,
                                username: true
                            }
                        }
                    }
                }
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            skip: offset
        }),
        prisma.driveItem.count({ where: whereClause })
    ]);

    return {
        items,
        total,
        pagination: {
            limit,
            offset,
            hasMore: total > offset + limit
        }
    };
}

export async function deleteUser(userId: string): Promise<void> {
    // Check if user exists
    const user = await prisma.user.findUnique({
        where: { userId }
    });

    if (!user) {
        throw new Error("User not found");
    }

    // Delete user (this will cascade delete their items and shares)
    await prisma.user.delete({
        where: { userId }
    });
}

export async function updateUserRole(userId: string, newRole: UserRole): Promise<void> {
    await prisma.user.update({
        where: { userId },
        data: { role: newRole }
    });
}
