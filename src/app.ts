import express, { Express, Request, Response, NextFunction } from "express";
// FIX 1: Import kiểu lỗi cụ thể thay vì cả namespace Prisma
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import cors from "cors";
import driveItemRoutes from "./api/driveItem.routes";
import sharingRoutes from "./api/sharing.routes";
import searchRoutes from "./api/search.routes";
import adminRoutes from "./api/admin.routes";

const app: Express = express();

app.use(cors());
app.use(express.json());

// API Routes
// NOTE: Authentication endpoints (register, login) are handled by a separate auth service
app.use("/api/v1/items", driveItemRoutes);
app.use("/api/v1/items", sharingRoutes); // Chú ý: Cả sharing và driveItem dùng /items
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/admin", adminRoutes);

// Xử lý BigInt khi trả về JSON
app.set("json replacer", (key: string, value: any) =>
  typeof value === "bigint" ? value.toString() : value,
);

// Middleware xử lý 404 (Không tìm thấy URL)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    error: {
      code: "URL_NOT_FOUND",
      message: `The requested URL ${req.originalUrl} was not found on this server.`,
    },
  });
});

// Middleware xử lý lỗi chung (500 và các lỗi khác)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // FIX 2: Kiểm tra err có phải là PrismaClientKnownRequestError trước khi truy cập code
  if (err instanceof PrismaClientKnownRequestError) {
    // Kiểm tra mã lỗi P2025 (Record not found)
    if (err.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "The requested resource was not found.",
          // Bạn có thể thêm chi tiết lỗi nếu muốn: details: err.message
        },
      });
    }
    // Bạn có thể thêm xử lý cho các mã lỗi Prisma khác ở đây nếu cần
    // Ví dụ: Lỗi unique constraint P2002
    // if (err.code === "P2002") { ... }
  }

  // Đối với các lỗi khác hoặc lỗi Prisma không xác định cụ thể
  console.error(err.stack); // Log lỗi ra console server để debug
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred on the server.",
      // Không nên gửi chi tiết lỗi nhạy cảm ra client trong production
      // details: process.env.NODE_ENV === 'development' ? err.message : undefined
    },
  });
});

export default app;
