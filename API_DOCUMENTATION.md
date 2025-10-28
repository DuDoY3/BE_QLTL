# HPC Drive API Documentation

## 🚀 **Tổng quan**

**Microservice quản lý tài liệu** với phân quyền người dùng, chia sẻ tài liệu và tìm kiếm nâng cao.

> **Lưu ý quan trọng**: Backend này **KHÔNG** xử lý đăng ký và đăng nhập. Authentication được xử lý bởi một service riêng biệt. Backend này chỉ verify JWT token để xác định role của người dùng (ADMIN, TEACHER, STUDENT).

## 🔐 **Authentication**

**⚠️ QUAN TRỌNG**: Backend này không có endpoints đăng ký/đăng nhập. Các endpoints này được xử lý bởi authentication service riêng.

Backend này chỉ verify JWT token từ authentication service để xác định role người dùng:

```http
Authorization: Bearer <JWT_TOKEN>
```

Token được tạo bởi authentication service và backend này chỉ verify token để extract thông tin:
- `userId`: ID của user
- `username`: Tên đăng nhập  
- `email`: Email
- `role`: ADMIN, TEACHER, hoặc STUDENT
```

## 📁 **File Management**

### Upload File
```http
POST /api/v1/items
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
document: {
  "name": "document.pdf",
  "itemType": "FILE",
  "parentId": "folder_uuid" // optional
}
```

### Create Folder
```http
POST /api/v1/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Folder",
  "itemType": "FOLDER",
  "parentId": "parent_folder_uuid" // optional
}
```

### Get Items
```http
GET /api/v1/items?parentId=folder_uuid
Authorization: Bearer <token>
```

### Get Single Item
```http
GET /api/v1/items/{itemId}
Authorization: Bearer <token>
```

### Download File
```http
GET /api/v1/items/{itemId}/download
Authorization: Bearer <token>
```

### Update Item
```http
PUT /api/v1/items/{itemId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Name",
  "parentId": "new_parent_uuid"
}
```

### Delete Item
```http
DELETE /api/v1/items/{itemId}
Authorization: Bearer <token>
```

## 🔗 **Sharing System**

### Share Item
```http
POST /api/v1/items/{itemId}/shares
Authorization: Bearer <token>
Content-Type: application/json

{
  "sharedWithUserId": "user_uuid",
  "permissionLevel": "VIEWER" // or "EDITOR"
}
```

### Get Item Shares
```http
GET /api/v1/items/{itemId}/shares
Authorization: Bearer <token>
```

### Update Share Permission
```http
PUT /api/v1/items/{itemId}/shares/{shareId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "permissionLevel": "EDITOR"
}
```

### Remove Share
```http
DELETE /api/v1/items/{itemId}/shares/{shareId}
Authorization: Bearer <token>
```

### Get Shared With Me
```http
GET /api/v1/items/shared-with-me
Authorization: Bearer <token>
```

## 🔍 **Search**

### Search Items
```http
GET /api/v1/search?q=keyword&itemType=FILE&limit=20&offset=0
Authorization: Bearer <token>
```

### Search by Content
```http
GET /api/v1/search/content?q=keyword&limit=20&offset=0
Authorization: Bearer <token>
```

### Get Recent Items
```http
GET /api/v1/search/recent?limit=10
Authorization: Bearer <token>
```

## 👑 **Admin Features**

### Dashboard Stats
```http
GET /api/v1/admin/dashboard
Authorization: Bearer <admin_token>
```

### Get All Users
```http
GET /api/v1/admin/users?limit=20&offset=0&role=STUDENT
Authorization: Bearer <admin_token>
```

### Get All Items
```http
GET /api/v1/admin/items?limit=20&offset=0&ownerId=user_uuid
Authorization: Bearer <admin_token>
```

### Delete User
```http
DELETE /api/v1/admin/users/{userId}
Authorization: Bearer <admin_token>
```

### Update User Role
```http
PUT /api/v1/admin/users/{userId}/role
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role": "TEACHER"
}
```

## 🎯 **User Roles & Permissions**

### **ADMIN**
- ✅ Quản lý tất cả tài liệu của tất cả users
- ✅ Xem/Download/Delete bất kỳ tài liệu nào
- ✅ Quản lý users (CRUD, change roles)
- ✅ Xem thống kê hệ thống
- ✅ Access tất cả admin endpoints

### **TEACHER/STUDENT**
- ✅ Quản lý tài liệu cá nhân (CRUD)
- ✅ Chia sẻ tài liệu với users khác
- ✅ Xem tài liệu được chia sẻ
- ✅ Tìm kiếm trong tài liệu của mình + được chia sẻ
- ✅ Download tài liệu của mình và được chia sẻ

## 🔒 **Permission Levels**

### **VIEWER**
- ✅ Xem tài liệu
- ✅ Download tài liệu
- ❌ Không thể chỉnh sửa
- ❌ Không thể xóa

### **EDITOR**
- ✅ Xem tài liệu
- ✅ Download tài liệu
- ✅ Chỉnh sửa tài liệu
- ❌ Không thể xóa (chỉ owner hoặc admin)

## 📊 **Response Format**

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful" // optional
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

## 🚨 **Error Codes**

- `UNAUTHORIZED`: Token không hợp lệ hoặc thiếu
- `ACCESS_DENIED`: Không có quyền truy cập
- `FILE_NOT_FOUND`: File không tồn tại
- `USER_EXISTS`: Username/email đã tồn tại
- `INVALID_CREDENTIALS`: Sai username/password
- `VALIDATION_ERROR`: Dữ liệu đầu vào không hợp lệ

## 🛠️ **Setup Instructions**

1. **Install dependencies:**
```bash
pnpm install
```

2. **Setup environment variables:**
```bash
# Create .env file
DATABASE_URL="postgresql://postgres:password@localhost:5432/hpc_drive_dev"
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"
PORT=8001
```

3. **Run database migrations:**
```bash
npx prisma migrate dev
```

4. **Start development server:**
```bash
pnpm dev
```

## 🧪 **Testing**

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:run
```

## 📝 **Notes**

- Tất cả endpoints (trừ auth) đều yêu cầu Bearer token
- File upload sử dụng multipart/form-data
- Download trả về file stream
- Pagination: limit (default: 20, max: 100), offset (default: 0)
- Search hỗ trợ full-text search và filtering
- Admin có quyền truy cập tất cả tài liệu
- Regular users chỉ thấy tài liệu của mình + được chia sẻ

