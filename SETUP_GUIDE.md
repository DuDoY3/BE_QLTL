# 🚀 HPC Drive - Setup Guide

## 📋 **Yêu cầu hệ thống**

- Node.js 18+ 
- PostgreSQL 12+
- pnpm (hoặc npm)

## 🛠️ **Setup Instructions**

### 1. **Cài đặt Dependencies**
```bash
pnpm install
```

### 2. **Cấu hình Database**

Tạo file `.env` trong root directory:
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/hpc_drive_dev"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=8001
NODE_ENV=development
```

### 3. **Setup Database**

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name "init"

# (Optional) Seed database
npx prisma db seed
```

### 4. **Chạy Server**

```bash
# Development mode
pnpm dev

# Production mode
pnpm build
pnpm start
```

## 🧪 **Testing API**

### 1. **Register User**
```bash
curl -X POST http://localhost:8001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com", 
    "password": "password123",
    "role": "ADMIN"
  }'
```

### 2. **Login**
```bash
curl -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'
```

### 3. **Test File Upload**
```bash
curl -X POST http://localhost:8001/api/v1/items \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test.pdf" \
  -F 'document={"name":"test.pdf","itemType":"FILE"}'
```

## 📁 **API Endpoints**

### **Authentication**
- `POST /api/v1/auth/register` - Đăng ký user
- `POST /api/v1/auth/login` - Đăng nhập
- `GET /api/v1/auth/profile` - Lấy thông tin profile
- `PUT /api/v1/auth/profile` - Cập nhật profile
- `PUT /api/v1/auth/change-password` - Đổi mật khẩu

### **File Management**
- `GET /api/v1/items` - Lấy danh sách items
- `POST /api/v1/items` - Tạo folder/upload file
- `GET /api/v1/items/:id` - Chi tiết item
- `GET /api/v1/items/:id/download` - Download file
- `PUT /api/v1/items/:id` - Cập nhật item
- `DELETE /api/v1/items/:id` - Xóa item

### **Sharing**
- `POST /api/v1/items/:id/shares` - Chia sẻ item
- `GET /api/v1/items/:id/shares` - Xem danh sách chia sẻ
- `PUT /api/v1/items/:id/shares/:shareId` - Cập nhật quyền chia sẻ
- `DELETE /api/v1/items/:id/shares/:shareId` - Hủy chia sẻ
- `GET /api/v1/items/shared-with-me` - Tài liệu được chia sẻ với tôi

### **Search**
- `GET /api/v1/search` - Tìm kiếm items
- `GET /api/v1/search/content` - Tìm kiếm theo nội dung
- `GET /api/v1/search/recent` - Items gần đây

### **Admin**
- `GET /api/v1/admin/dashboard` - Dashboard stats
- `GET /api/v1/admin/users` - Quản lý users
- `GET /api/v1/admin/items` - Quản lý items
- `DELETE /api/v1/admin/users/:id` - Xóa user
- `PUT /api/v1/admin/users/:id/role` - Cập nhật role

## 🔐 **User Roles**

### **ADMIN**
- ✅ Quản lý tất cả tài liệu
- ✅ Xem/Download/Delete bất kỳ tài liệu nào
- ✅ Quản lý users (CRUD, change roles)
- ✅ Xem thống kê hệ thống

### **TEACHER/STUDENT**
- ✅ Quản lý tài liệu cá nhân (CRUD)
- ✅ Chia sẻ tài liệu với users khác
- ✅ Xem tài liệu được chia sẻ
- ✅ Download tài liệu của mình và được chia sẻ
- ✅ Tìm kiếm trong tài liệu của mình + được chia sẻ

## 🚨 **Troubleshooting**

### **Lỗi Database Connection**
```bash
# Kiểm tra PostgreSQL đang chạy
pg_ctl status

# Restart PostgreSQL
pg_ctl restart
```

### **Lỗi Prisma**
```bash
# Reset database
npx prisma migrate reset

# Regenerate client
npx prisma generate
```

### **Lỗi Port đã được sử dụng**
```bash
# Tìm process sử dụng port 8001
netstat -ano | findstr :8001

# Kill process
taskkill /PID <PID_NUMBER> /F
```

## 📝 **Notes**

- Tất cả endpoints (trừ auth) đều yêu cầu Bearer token
- File upload sử dụng multipart/form-data
- Download trả về file stream
- Admin có quyền truy cập tất cả tài liệu
- Regular users chỉ thấy tài liệu của mình + được chia sẻ

## 🎯 **Next Steps**

1. Setup PostgreSQL database
2. Tạo file .env với cấu hình database
3. Chạy migrations
4. Test API với Postman hoặc curl
5. Tạo admin user đầu tiên
6. Test các tính năng file management và sharing




