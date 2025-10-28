import { prisma } from "../lib/prisma";
import { UserRole, ItemType, ShareLevel, Prisma } from "@prisma/client"; // Import Prisma

export interface SearchFilters {
    q?: string;
    itemType?: ItemType; // Sử dụng ItemType từ Prisma
    mimeType?: string;
    ownerId?: string;
    parentId?: string | null; // Cho phép null cho thư mục gốc
    limit?: number;
    offset?: number;
}

// Giữ nguyên interface SearchResult
export interface SearchResult {
    itemId: string;
    name: string;
    itemType: ItemType; // Sử dụng ItemType từ Prisma
    ownerId: string;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
    owner: {
        userId: string;
        username: string;
        email: string;
    };
    fileMetadata: {
        mimeType: string;
        size: bigint;
        version: number;
    } | undefined;
    isShared: boolean;
    sharePermission: ShareLevel | undefined;
}

export async function searchItems(
    filters: SearchFilters,
    userId: string,
    userRole: UserRole
): Promise<{ items: SearchResult[]; total: number }> {
    const {
        q,
        itemType,
        mimeType,
        ownerId,
        parentId,
        limit = 20,
        offset = 0
    } = filters;

    // --- Build where clause ---
    const whereClause: Prisma.DriveItemWhereInput = { // Sử dụng kiểu Prisma
        isTrashed: false,
    };

    if (userRole !== UserRole.ADMIN) {
        whereClause.OR = [
            { ownerId: userId },
            { sharePermissions: { some: { sharedWithUserId: userId } } }
        ];
    }

    if (q) {
        whereClause.name = { contains: q, mode: 'insensitive' };
    }
    if (itemType) {
        whereClause.itemType = itemType;
    }
    if (ownerId) {
        whereClause.ownerId = ownerId;
    }
    // Xử lý parentId: null cho thư mục gốc, string cho thư mục con
    if (parentId !== undefined) {
        whereClause.parentId = parentId; // Prisma xử lý null/string đúng cách
    }
    if (mimeType) {
        whereClause.fileMetadata = { mimeType: { contains: mimeType, mode: 'insensitive' } };
    }

    // --- Build include clause (Đã sửa) ---
    const includeClause: Prisma.DriveItemInclude = { // Sử dụng kiểu Prisma
        owner: {
            select: { // Chỉ chọn các trường cần thiết
                userId: true,
                username: true,
                email: true
            }
        },
        // Chỉ include fileMetadata nếu cần hoặc nếu là file
        fileMetadata: true, // Include metadata để map sau
        // Include sharePermissions *chỉ* cho user hiện tại
        sharePermissions: {
            where: { sharedWithUserId: userId },
            select: { permissionLevel: true } // Chỉ lấy permission level
        }
    };

    // --- Execute search ---
    const [items, total] = await Promise.all([
        prisma.driveItem.findMany({
            where: whereClause,
            include: includeClause,
            orderBy: { updatedAt: 'desc' },
            take: limit,
            skip: offset
        }),
        prisma.driveItem.count({ where: whereClause })
    ]);

    // --- Transform results (Đã sửa logic map) ---
    const searchResults: SearchResult[] = items.map(item => {
        // Lấy share permission (nếu có)
        const sharePerm = item.sharePermissions && item.sharePermissions.length > 0
            ? item.sharePermissions[0]?.permissionLevel
            : undefined;

        return {
            itemId: item.itemId,
            name: item.name,
            itemType: item.itemType,
            ownerId: item.ownerId,
            parentId: item.parentId,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            // Owner chắc chắn tồn tại vì là quan hệ bắt buộc
            owner: {
                userId: item.owner.userId,
                username: item.owner.username,
                email: item.owner.email,
            },
            // FileMetadata có thể null/undefined nếu là FOLDER
            fileMetadata: item.fileMetadata ? {
                mimeType: item.fileMetadata.mimeType,
                size: item.fileMetadata.size,
                version: item.fileMetadata.version
            } : undefined, // Trả về undefined nếu không có metadata
            isShared: item.ownerId !== userId, // Đúng logic
            sharePermission: sharePerm
        };
    });


    return {
        items: searchResults,
        total
    };
}

// Hàm này giữ nguyên logic cơ bản, chỉ sửa phần mapping
export async function searchByContent(
    query: string,
    userId: string,
    userRole: UserRole,
    limit: number = 20,
    offset: number = 0
): Promise<{ items: SearchResult[]; total: number }> {
    // Tạm thời vẫn dùng searchItems
    return searchItems(
        { q: query, itemType: ItemType.FILE, limit, offset }, // Chỉ tìm file khi search content
        userId,
        userRole
    );
}

// Hàm này giữ nguyên logic cơ bản, chỉ sửa phần mapping
export async function getRecentItems(
    userId: string,
    userRole: UserRole,
    limit: number = 10
): Promise<SearchResult[]> {
    // --- Where clause (Giữ nguyên) ---
    const whereClause: Prisma.DriveItemWhereInput = {
        isTrashed: false,
    };
    if (userRole !== UserRole.ADMIN) {
        whereClause.OR = [
            { ownerId: userId },
            { sharePermissions: { some: { sharedWithUserId: userId } } }
        ];
    }

    // --- Include clause (Giữ nguyên) ---
    const includeClause: Prisma.DriveItemInclude = {
        owner: { select: { userId: true, username: true, email: true } },
        fileMetadata: true,
        sharePermissions: {
            where: { sharedWithUserId: userId },
            select: { permissionLevel: true }
        }
    };

    // --- Query (Giữ nguyên) ---
    const items = await prisma.driveItem.findMany({
        where: whereClause,
        include: includeClause,
        orderBy: { updatedAt: 'desc' },
        take: limit
    });

    // --- Transform results (Sử dụng logic map giống searchItems) ---
    return items.map(item => {
        const sharePerm = item.sharePermissions && item.sharePermissions.length > 0
            ? item.sharePermissions[0]?.permissionLevel
            : undefined;

        return {
            itemId: item.itemId,
            name: item.name,
            itemType: item.itemType,
            ownerId: item.ownerId,
            parentId: item.parentId,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            owner: {
                userId: item.owner.userId,
                username: item.owner.username,
                email: item.owner.email,
            },
            fileMetadata: item.fileMetadata ? {
                mimeType: item.fileMetadata.mimeType,
                size: item.fileMetadata.size,
                version: item.fileMetadata.version
            } : undefined,
            isShared: item.ownerId !== userId,
            sharePermission: sharePerm
        };
    });
}
