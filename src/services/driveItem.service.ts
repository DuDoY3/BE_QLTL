import { prisma } from "../lib/prisma";
// FIX 1: Import enums và types đúng cách
import { ItemType, Permission, UserRole, ShareLevel, DocumentType, Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";
// FIX 2: Import hàm đã được export từ sharing.service
import { checkItemAccess } from "./sharing.service";

import { z } from "zod";
import { createDriveItemSchema } from "../validations/driveItem.validation";
export type CreateDriveItemInput = z.infer<
  typeof createDriveItemSchema
>["body"];

// Helper function to map mimeType to DocumentType
export function mapMimeTypeToDocumentType(mimeType: string): DocumentType {
  const mimeLower = mimeType.toLowerCase();

  if (mimeLower.includes('pdf')) {
    return DocumentType.PDF;
  } else if (mimeLower.includes('word') ||
    mimeLower.includes('msword') ||
    mimeLower.includes('document') ||
    mimeLower.includes('.doc')) {
    return DocumentType.WORD;
  } else if (mimeLower.includes('excel') ||
    mimeLower.includes('spreadsheet') ||
    mimeLower.includes('ms-excel') ||
    mimeLower.includes('.xls')) {
    return DocumentType.EXCEL;
  } else if (mimeLower.includes('powerpoint') ||
    mimeLower.includes('presentation') ||
    mimeLower.includes('ms-powerpoint') ||
    mimeLower.includes('.ppt')) {
    return DocumentType.POWERPOINT;
  }

  return DocumentType.OTHER;
}

export async function createItem(data: CreateDriveItemInput, ownerId: string) {
  // Sử dụng Prisma.DriveItemCreateInput thay vì any
  const createPayload: Prisma.DriveItemCreateInput = {
    name: data.name,
    itemType: data.itemType, // Đã có kiểu ItemType
    owner: { connect: { userId: ownerId } },
    permission: Permission.PRIVATE, // Đã có kiểu Permission
  };

  if (data.parentId) {
    // Đảm bảo parentId là string | null | undefined
    createPayload.parent = { connect: { itemId: data.parentId } };
  }

  const newItem = await prisma.driveItem.create({
    data: createPayload,
  });

  return newItem;
}

export async function findItemById(itemId: string, userId: string, userRole: UserRole) {
  // Check if user has access to this item (ShareLevel.VIEWER là mặc định)
  const hasAccess = await checkItemAccess(itemId, userId, userRole);
  if (!hasAccess) {
    throw new Error("Access denied");
  }

  // Không cần OrThrow vì checkItemAccess đã kiểm tra item tồn tại gián tiếp
  const item = await prisma.driveItem.findUnique({
    where: { itemId },
    include: {
      fileMetadata: true,
      children: true, // Có thể bỏ nếu không cần thiết ngay
      owner: {
        select: {
          userId: true,
          username: true,
          email: true
        }
      }
    },
  });

  // Xử lý trường hợp item không tìm thấy (mặc dù không nên xảy ra sau checkItemAccess)
  if (!item) {
    throw new Error("Item not found");
  }

  return item;
}

// Kiểu dữ liệu query nên rõ ràng hơn
interface FindItemsQuery {
  parentId?: string | null; // Cho phép null hoặc undefined
}

export async function findItems(query: FindItemsQuery, userId: string, userRole: UserRole) {
  const { parentId } = query;

  const whereClause: Prisma.DriveItemWhereInput = {
    // Xử lý parentId: null cho root, string cho thư mục con
    parentId: parentId === undefined ? null : parentId,
    isTrashed: false,
  };

  // Chỉ áp dụng filter owner/share nếu không phải ADMIN
  if (userRole !== UserRole.ADMIN) {
    whereClause.OR = [
      { ownerId: userId },
      { sharePermissions: { some: { sharedWithUserId: userId } } }
    ];
  }

  const items = await prisma.driveItem.findMany({
    where: whereClause,
    include: {
      owner: {
        select: {
          userId: true,
          username: true,
          email: true
        }
      },
      fileMetadata: true // Include metadata để hiển thị thông tin file
    }
  });
  return items;
}

export type UpdateDriveItemInput = {
  name?: string;
  parentId?: string | null; // Cho phép cả null để di chuyển về root
};

export async function updateItem(itemId: string, data: UpdateDriveItemInput, userId: string, userRole: UserRole) {
  // Check if user has edit access to this item
  const hasEditAccess = await checkItemAccess(itemId, userId, userRole, ShareLevel.EDITOR);
  if (!hasEditAccess) {
    // Nên throw lỗi cụ thể hơn
    throw new Error("ACCESS_DENIED: You need editor permission to update this item");
  }

  // Xây dựng data payload cẩn thận
  const updateData: Prisma.DriveItemUpdateInput = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  // Xử lý việc thay đổi parentId:
  // - Nếu parentId là string: connect với parent mới
  // - Nếu parentId là null: disconnect khỏi parent cũ (chuyển về root)
  // - Nếu parentId là undefined: không thay đổi parent
  if (data.parentId !== undefined) {
    if (data.parentId === null) {
      // Ngắt kết nối với parent hiện tại
      updateData.parent = { disconnect: true };
    } else {
      // Kết nối với parent mới
      updateData.parent = { connect: { itemId: data.parentId } };
    }
  }


  // Chỉ update nếu có dữ liệu cần update
  if (Object.keys(updateData).length === 0) {
    // Có thể throw lỗi hoặc trả về item hiện tại tùy logic mong muốn
    // throw new Error("VALIDATION_ERROR: Update body cannot be empty or contain only undefined fields");
    return prisma.driveItem.findUnique({ // Trả về item hiện tại nếu không có gì thay đổi
      where: { itemId },
      include: { owner: { select: { userId: true, username: true, email: true } } }
    });
  }


  const updatedItem = await prisma.driveItem.update({
    where: { itemId },
    data: updateData,
    include: {
      owner: {
        select: {
          userId: true,
          username: true,
          email: true
        }
      },
      fileMetadata: true // Include metadata sau khi update
    }
  });
  return updatedItem;
}

export async function deleteItem(itemId: string, userId: string, userRole: UserRole) {
  const item = await prisma.driveItem.findUnique({
    where: { itemId },
    select: { ownerId: true } // Chỉ cần lấy ownerId để kiểm tra quyền
  });

  if (!item) {
    throw new Error("NOT_FOUND: Item not found");
  }

  // Chỉ owner hoặc admin có quyền xóa
  if (item.ownerId !== userId && userRole !== UserRole.ADMIN) {
    throw new Error("ACCESS_DENIED: Only the owner or an admin can delete this item");
  }

  // Lấy thông tin file để xóa file vật lý (nếu là file)
  const fileMeta = await prisma.fileMetadata.findUnique({
    where: { itemId }
  });

  // Thực hiện xóa item trong database (sẽ tự động xóa metadata nhờ onDelete: Cascade)
  const deletedItem = await prisma.driveItem.delete({
    where: { itemId },
  });

  // Xóa file vật lý sau khi xóa trong DB thành công
  if (fileMeta && fileMeta.storagePath) {
    try {
      // Kiểm tra file tồn tại trước khi xóa
      if (fs.existsSync(fileMeta.storagePath)) {
        fs.unlinkSync(fileMeta.storagePath);
        console.log(`Deleted physical file: ${fileMeta.storagePath}`);
      } else {
        console.warn(`Physical file not found, skipping delete: ${fileMeta.storagePath}`);
      }
    } catch (unlinkError) {
      console.error(`Error deleting physical file ${fileMeta.storagePath}:`, unlinkError);
      // Có thể log lỗi này nhưng không nên throw lại để không làm hỏng response API
    }
  }


  // Trả về item đã xóa (tùy chọn, vì nó không còn trong DB)
  // Thường thì chỉ cần trả về status 204 No Content là đủ
  return deletedItem; // Hoặc có thể không return gì cả
}

// Kiểu dữ liệu cho file từ multer
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}


export async function createFile(
  data: CreateDriveItemInput, // Sử dụng kiểu đã validate
  ownerId: string,
  file: MulterFile, // Sử dụng kiểu rõ ràng
) {
  // Đảm bảo itemType là FILE
  if (data.itemType !== ItemType.FILE) {
    throw new Error("INVALID_REQUEST: itemType must be FILE for createFile function");
  }

  const uploadDir = path.join(process.cwd(), `uploads/${ownerId}`);

  // Tạo thư mục nếu chưa có
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (mkdirError) {
    console.error(`Error creating upload directory ${uploadDir}:`, mkdirError);
    throw new Error("INTERNAL_SERVER_ERROR: Could not create upload directory");
  }


  // Tạo storagePath an toàn hơn
  const timestamp = Date.now();
  const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'); // Loại bỏ ký tự không an toàn
  const storagePath = path.join(
    uploadDir,
    `${timestamp}-${safeOriginalName}`,
  );

  // Ghi file vật lý
  try {
    fs.writeFileSync(storagePath, file.buffer);
    console.log(`Saved file to: ${storagePath}`);
  } catch (writeFileError) {
    console.error(`Error writing file to ${storagePath}:`, writeFileError);
    throw new Error("INTERNAL_SERVER_ERROR: Could not save uploaded file");
  }


  // Determine documentType: use provided or auto-detect from mimeType
  const documentType = data.documentType || mapMimeTypeToDocumentType(file.mimetype);

  const createPayload: Prisma.DriveItemCreateInput = {
    name: data.name, // Lấy tên từ data đã validate
    owner: { connect: { userId: ownerId } },
    itemType: ItemType.FILE, // Đảm bảo là FILE
    permission: Permission.PRIVATE,
    fileMetadata: {
      create: {
        mimeType: file.mimetype,
        size: BigInt(file.size), // Prisma yêu cầu BigInt
        storagePath: storagePath, // Lưu đường dẫn tương đối hoặc tuyệt đối tùy cấu hình
        documentType: documentType, // Add document type
      },
    },
  };

  if (data.parentId) {
    createPayload.parent = { connect: { itemId: data.parentId } };
  }

  // Tạo item trong DB
  const newItem = await prisma.driveItem.create({
    data: createPayload,
    include: { fileMetadata: true }, // Include metadata để trả về
  });

  return newItem;
}

// Interface cho kết quả download
interface DownloadFileInfo {
  itemId: string;
  name: string;
  mimeType: string;
  size: bigint;
  storagePath: string;
  version: number;
}

export async function downloadItem(itemId: string, userId: string, userRole: UserRole): Promise<DownloadFileInfo> {
  // Check if user has access to download this item
  const hasAccess = await checkItemAccess(itemId, userId, userRole, ShareLevel.VIEWER); // Cần ít nhất quyền VIEWER
  if (!hasAccess) {
    throw new Error("ACCESS_DENIED: You don't have permission to download this file");
  }

  const item = await prisma.driveItem.findUnique({
    where: { itemId },
    include: { fileMetadata: true }
  });

  // Kiểm tra kỹ hơn
  if (!item) {
    throw new Error("NOT_FOUND: Item not found");
  }
  if (item.itemType !== ItemType.FILE) {
    throw new Error("INVALID_REQUEST: Cannot download a folder");
  }
  if (!item.fileMetadata) {
    // Trường hợp này không nên xảy ra nếu logic đúng, nhưng kiểm tra cho chắc
    console.error(`Inconsistency: File item ${itemId} is missing fileMetadata.`);
    throw new Error("INTERNAL_SERVER_ERROR: File metadata not found for this item");
  }
  // Kiểm tra file vật lý tồn tại
  if (!fs.existsSync(item.fileMetadata.storagePath)) {
    console.error(`Physical file not found for item ${itemId} at path: ${item.fileMetadata.storagePath}`);
    throw new Error("INTERNAL_SERVER_ERROR: The physical file is missing or inaccessible");
  }


  // Trả về thông tin cần thiết để controller stream file
  return {
    itemId: item.itemId,
    name: item.name,
    mimeType: item.fileMetadata.mimeType,
    size: item.fileMetadata.size,
    storagePath: item.fileMetadata.storagePath,
    version: item.fileMetadata.version
  };
}