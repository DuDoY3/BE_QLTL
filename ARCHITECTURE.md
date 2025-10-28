# 🏗️ HPC Drive - Architecture Overview

## Microservice Architecture

Hệ thống HPC Drive được thiết kế theo kiến trúc **microservices**, trong đó:

### 1. **Document Management Service** (backend này)
Backend này chịu trách nhiệm quản lý tài liệu:
- ✅ Quản lý files và folders (CRUD operations)
- ✅ Chia sẻ tài liệu với phân quyền (VIEWER, EDITOR)
- ✅ Tìm kiếm trong nội dung và metadata
- ✅ Admin dashboard và statistics
- ✅ Verify JWT token để xác định role người dùng (ADMIN, TEACHER, STUDENT)

### 2. **Authentication Service** (backend riêng biệt)
Backend này **KHÔNG** xử lý:
- ❌ Đăng ký tài khoản (register)
- ❌ Đăng nhập (login)
- ❌ Quản lý mật khẩu
- ❌ Tạo JWT token

Các chức năng trên được xử lý bởi một **authentication service** riêng biệt.

## Authentication Flow

```
┌─────────────────┐
│   Frontend App  │
└────────┬────────┘
         │
         │ 1. Request auth
         ▼
┌─────────────────┐
│  Auth Service   │  ← Đăng ký, đăng nhập, tạo token
└────────┬────────┘
         │
         │ 2. Return JWT token
         ▼
┌─────────────────┐
│  Document Mgmt  │  ← Verify token, enforce permissions
│   Service       │
└─────────────────┘
```

### Chi tiết Flow:

1. **User đăng nhập ở Auth Service**
   - Frontend gọi API: `POST /auth/login` ở Auth Service
   - Auth Service trả về JWT token với thông tin: `userId`, `username`, `email`, `role`

2. **User gọi API Document Management**
   - Frontend gửi request đến: `POST /api/v1/items`
   - Header: `Authorization: Bearer <jwt_token>`
   - Backend này **CHỈ verify token** để extract:
     - `userId`: Ai là chủ sở hữu
     - `role`: ADMIN, TEACHER, hoặc STUDENT
     - `username`, `email`: Thông tin người dùng

3. **Enforcement**
   - ADMIN: Full access, quản lý tất cả tài liệu
   - TEACHER/STUDENT: Chỉ thấy tài liệu của mình + được chia sẻ
   - VIEWER: Chỉ xem/download
   - EDITOR: Xem/download/sửa metadata

## JWT Token Structure

Token được tạo bởi Auth Service và có format:

```json
{
  "userId": "uuid-string",
  "username": "john_doe",
  "email": "john@example.com",
  "role": "STUDENT",  // hoặc "TEACHER", "ADMIN"
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Database Schema

Backend này vẫn sử dụng Prisma với User model vì cần:
- Quan hệ `ownerId` trong DriveItem (file thuộc ai)
- Quan hệ `sharedWithUserId` trong SharePermission (chia sẻ với ai)

**Lưu ý**: User data được **sync từ Auth Service**, backend này không tự tạo user.

## Shared JWT Secret

Backend này và Auth Service **phải dùng cùng JWT_SECRET** để verify token.

```env
# .env - PHẢI giống với Auth Service
JWT_SECRET="same-secret-key-for-both-services"
```

## API Endpoints

### Document Management (this service)
- `GET /api/v1/items` - List files/folders
- `POST /api/v1/items` - Upload file/Create folder
- `GET /api/v1/items/:id` - Get item details
- `GET /api/v1/items/:id/download` - Download file
- `PUT /api/v1/items/:id` - Update item
- `DELETE /api/v1/items/:id` - Delete item

### Sharing
- `POST /api/v1/items/:id/shares` - Share item
- `GET /api/v1/items/:id/shares` - Get shares
- `PUT /api/v1/items/:id/shares/:shareId` - Update permission
- `DELETE /api/v1/items/:id/shares/:shareId` - Remove share
- `GET /api/v1/items/shared-with-me` - Get shared with me

### Search
- `GET /api/v1/search?q=keyword` - Search by name
- `GET /api/v1/search/content?q=keyword` - Full-text search
- `GET /api/v1/search/recent` - Recent items

### Admin
- `GET /api/v1/admin/dashboard` - Dashboard stats
- `GET /api/v1/admin/users` - List users
- `DELETE /api/v1/admin/users/:id` - Delete user
- `PUT /api/v1/admin/users/:id/role` - Update user role

### Authentication Endpoints
**KHÔNG CÓ** - Được xử lý bởi Auth Service riêng

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/hpc_drive_dev"

# JWT - PHẢI giống với Auth Service
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# Server
PORT=8001
NODE_ENV=development
```

## Deployment

Backend này có thể deploy độc lập:
- Lắng nghe trên port 8001
- Auth Service trên port khác (ví dụ: 8000)
- Cùng share JWT_SECRET
- Frontend gọi cả 2 services theo nhu cầu

