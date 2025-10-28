import { prisma } from "../lib/prisma";
import { UserRole, ItemType, ShareLevel, Prisma } from "@prisma/client";

// ---------------------
// Kiểu dữ liệu tìm kiếm
// ---------------------
export interface SearchFilters {
  q?: string;
  itemType?: ItemType;
  mimeType?: string;
  ownerId?: string;
  parentId?: string | null;
  limit?: number;
  offset?: number;
}

// ---------------------
// Kết quả tìm kiếm (chuẩn hóa type)
// ---------------------
export interface SearchResult {
  itemId: string;
  name: string;
  itemType: ItemType;
  ownerId: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    userId: string;
    username: string;
    email: string;
  };
  fileMetadata?: {
    mimeType: string;
    size: bigint;
    version: number;
  } | undefined; // ✅ thêm rõ `| undefined` để khớp strict type
  isShared: boolean;
  sharePermission: ShareLevel | undefined;
}

// ---------------------
// Hàm map: Prisma → SearchResult
// ---------------------
function mapDriveItemToSearchResult(
  item: Prisma.DriveItemGetPayload<{
    include: {
      owner: { select: { userId: true; username: true; email: true } };
      fileMetadata: true;
      sharePermissions: {
        select: { permissionLevel: true };
        where: { sharedWithUserId: string };
      };
    };
  }>,
  currentUserId: string
): SearchResult {
  const sharePerm = item.sharePermissions?.[0]?.permissionLevel;

  const ownerData = {
    userId: item.owner.userId,
    username: item.owner.username,
    email: item.owner.email,
  };

  return {
    itemId: item.itemId,
    name: item.name,
    itemType: item.itemType,
    ownerId: item.ownerId,
    parentId: item.parentId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    owner: ownerData,
    // ✅ Đảm bảo kiểu đúng dù fileMetadata không tồn tại
    fileMetadata: item.fileMetadata
      ? {
          mimeType: item.fileMetadata.mimeType,
          size: item.fileMetadata.size,
          version: item.fileMetadata.version,
        }
      : undefined,
    isShared: item.ownerId !== currentUserId,
    sharePermission: sharePerm,
  };
}

// ---------------------
// Hàm searchItems()
// ---------------------
export async function searchItems(
  filters: SearchFilters,
  userId: string,
  userRole: UserRole
): Promise<{ items: SearchResult[]; total: number }> {
  const { q, itemType, mimeType, ownerId, parentId, limit = 20, offset = 0 } =
    filters;

  const whereClause: Prisma.DriveItemWhereInput = {
    isTrashed: false,
  };

  if (userRole !== UserRole.ADMIN) {
    whereClause.OR = [
      { ownerId: userId },
      { sharePermissions: { some: { sharedWithUserId: userId } } },
    ];
  }

  if (q) whereClause.name = { contains: q, mode: "insensitive" };
  if (itemType) whereClause.itemType = itemType;
  if (ownerId) whereClause.ownerId = ownerId;
  if (parentId !== undefined) whereClause.parentId = parentId;
  if (mimeType)
    whereClause.fileMetadata = {
      mimeType: { contains: mimeType, mode: "insensitive" },
    };

  const includeClause: Prisma.DriveItemInclude = {
    owner: { select: { userId: true, username: true, email: true } },
    fileMetadata: true,
    sharePermissions: {
      where: { sharedWithUserId: userId },
      select: { permissionLevel: true },
      take: 1,
    },
  };

  const [items, total] = await Promise.all([
    prisma.driveItem.findMany({
      where: whereClause,
      include: includeClause,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.driveItem.count({ where: whereClause }),
  ]);

  const searchResults = items.map((item) =>
    mapDriveItemToSearchResult(item, userId)
  );

  return { items: searchResults, total };
}

// ---------------------
// Tìm kiếm theo nội dung
// ---------------------
export async function searchByContent(
  query: string,
  userId: string,
  userRole: UserRole,
  limit = 20,
  offset = 0
): Promise<{ items: SearchResult[]; total: number }> {
  return searchItems(
    { q: query, itemType: ItemType.FILE, limit, offset },
    userId,
    userRole
  );
}

// ---------------------
// Lấy các item gần đây
// ---------------------
export async function getRecentItems(
  userId: string,
  userRole: UserRole,
  limit = 10
): Promise<SearchResult[]> {
  const whereClause: Prisma.DriveItemWhereInput = {
    isTrashed: false,
  };

  if (userRole !== UserRole.ADMIN) {
    whereClause.OR = [
      { ownerId: userId },
      { sharePermissions: { some: { sharedWithUserId: userId } } },
    ];
  }

  const includeClause: Prisma.DriveItemInclude = {
    owner: { select: { userId: true, username: true, email: true } },
    fileMetadata: true,
    sharePermissions: {
      where: { sharedWithUserId: userId },
      select: { permissionLevel: true },
      take: 1,
    },
  };

  const items = await prisma.driveItem.findMany({
    where: whereClause,
    include: includeClause,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return items.map((item) => mapDriveItemToSearchResult(item, userId));
}

// ---------------------
// Kiểm tra quyền truy cập
// ---------------------
export async function checkItemAccess(
  itemId: string,
  userId: string,
  userRole: UserRole,
  requiredLevel: ShareLevel = ShareLevel.VIEWER
): Promise<boolean> {
  if (userRole === UserRole.ADMIN) return true;

  const item = await prisma.driveItem.findUnique({
    where: { itemId },
    select: {
      ownerId: true,
      sharePermissions: {
        where: { sharedWithUserId: userId },
        select: { permissionLevel: true },
        take: 1,
      },
    },
  });

  if (!item) return false;
  if (item.ownerId === userId) return true;

  const share = item.sharePermissions?.[0];
  if (share) {
    if (requiredLevel === ShareLevel.VIEWER) return true;
    if (requiredLevel === ShareLevel.EDITOR)
      return share.permissionLevel === ShareLevel.EDITOR;
  }

  return false;
}

// ---------------------
// Kiểm tra quyền share
// ---------------------
export async function checkSharePermission(
  itemId: string,
  userId: string,
  userRole: UserRole
): Promise<boolean> {
  if (userRole === UserRole.ADMIN) return true;

  const item = await prisma.driveItem.findUnique({
    where: { itemId },
    select: { ownerId: true },
  });

  return item?.ownerId === userId;
}

// ---------------------
// Chia sẻ một mục
// ---------------------
export async function shareItem(
  itemId: string,
  sharedWithUserId: string,
  permissionLevel: ShareLevel,
  currentUserId: string,
  currentUserRole: UserRole
) {
  // 1. Kiểm tra quyền chia sẻ
  const canShare = await checkSharePermission(
    itemId,
    currentUserId,
    currentUserRole
  );
  if (!canShare) {
    throw new Error("User does not have permission to share this item");
  }

  // 2. Không thể chia sẻ cho chính mình
  if (sharedWithUserId === currentUserId) {
    throw new Error("You cannot share an item with yourself");
  }

  // 3. Kiểm tra xem mục và người dùng có tồn tại không
  const item = await prisma.driveItem.findUnique({ where: { itemId } });
  if (!item) {
    throw new Error("Item not found");
  }

  const userToShareWith = await prisma.user.findUnique({
    where: { userId: sharedWithUserId },
  });
  if (!userToShareWith) {
    throw new Error("User to share with not found");
  }

  // 4. Tạo hoặc cập nhật quyền chia sẻ
  const share = await prisma.sharePermission.upsert({
    where: {
      itemId_sharedWithUserId: {
        itemId,
        sharedWithUserId,
      },
    },
    update: { permissionLevel },
    create: {
      itemId,
      sharedWithUserId,
      permissionLevel,
    },
    include: {
      sharedWithUser: {
        select: {
          userId: true,
          username: true,
          email: true,
        },
      },
    },
  });

  return share;
}

// ---------------------
// Hủy chia sẻ một mục
// ---------------------
export async function unshareItem(
  itemId: string,
  sharedWithUserId: string,
  currentUserId: string,
  currentUserRole: UserRole
) {
  // 1. Kiểm tra quyền hủy chia sẻ
  const canShare = await checkSharePermission(
    itemId,
    currentUserId,
    currentUserRole
  );
  if (!canShare) {
    throw new Error("User does not have permission to unshare this item");
  }

  // 2. Xóa quyền chia sẻ
  return await prisma.sharePermission.delete({
    where: {
      itemId_sharedWithUserId: {
        itemId,
        sharedWithUserId,
      },
    },
  });
}

// ---------------------
// Lấy danh sách chia sẻ của một mục
// ---------------------
export async function getItemShares(
  itemId: string,
  currentUserId: string,
  currentUserRole: UserRole
) {
  // 1. Kiểm tra quyền xem danh sách chia sẻ
  const canShare = await checkSharePermission(
    itemId,
    currentUserId,
    currentUserRole
  );
  if (!canShare) {
    throw new Error("User does not have permission to view shares for this item");
  }

  // 2. Lấy danh sách chia sẻ
  return await prisma.sharePermission.findMany({
    where: { itemId },
    include: {
      sharedWithUser: {
        select: {
          userId: true,
          username: true,
          email: true,
        },
      },
    },
  });
}

// ---------------------
// Lấy các mục được chia sẻ với tôi
// ---------------------
export async function getSharedWithMe(userId: string): Promise<SearchResult[]> {
  const sharedPermissions = await prisma.sharePermission.findMany({
    where: { sharedWithUserId: userId },
    include: {
      item: {
        include: {
          owner: { select: { userId: true, username: true, email: true } },
          fileMetadata: true,
          // Lấy quyền của người dùng hiện tại để hiển thị
          sharePermissions: {
            where: { sharedWithUserId: userId },
            select: { permissionLevel: true },
            take: 1,
          },
        },
      },
    },
  });

  // Map kết quả về SearchResult
  return sharedPermissions.map((p) => mapDriveItemToSearchResult(p.item, userId));
}
