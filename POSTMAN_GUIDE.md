# 📮 HPC Drive API - Postman Testing Guide

## 🔗 Base URL
```
http://localhost:8001
```

---

## ⚠️ **QUAN TRỌNG: Authentication**

**Backend này KHÔNG có endpoints đăng ký/đăng nhập!**

Backend này chỉ verify JWT token từ một authentication service riêng biệt. 

**Để test, bạn cần:**
1. Đăng ký/đăng nhập ở authentication service khác
2. Nhận JWT token từ đó
3. Sử dụng token đó trong header `Authorization: Bearer <token>`

---

## 📋 Các Endpoint để test

### ⚠️ Authentication Endpoints KHÔNG CÓ

Backend này **KHÔNG** cung cấp:
- `POST /api/v1/auth/register` - Đăng ký (do auth service khác xử lý)
- `POST /api/v1/auth/login` - Đăng nhập (do auth service khác xử lý)  
- `GET /api/v1/auth/profile` - Profile (do auth service khác xử lý)

Để có JWT token, bạn cần sử dụng authentication service riêng.

---

### 2. Drive Items Endpoints

#### 📁 Lấy danh sách Items
```
Method: GET
URL: http://localhost:8001/api/v1/items?parentId=null&limit=10&offset=0
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

#### 👁️ Lấy Item theo ID
```
Method: GET
URL: http://localhost:8001/api/v1/items/ITEM_ID_HERE
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

#### 📁 Tạo Folder mới
```
Method: POST
URL: http://localhost:8001/api/v1/items
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
  Content-Type: application/json
Body:
{
  "name": "My New Folder",
  "itemType": "FOLDER",
  "parentId": null
}
```

#### 📄 Upload File
```
Method: POST
URL: http://localhost:8001/api/v1/items
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
  Content-Type: multipart/form-data
Body (form-data):
  - file: [Choose File]
  - name: "My File"
  - itemType: "FILE"
  - parentId: null (hoặc folder ID)
```

#### 📥 Download File
```
Method: GET
URL: http://localhost:8001/api/v1/items/ITEM_ID/download
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

#### ✏️ Cập nhật Item
```
Method: PUT
URL: http://localhost:8001/api/v1/items/ITEM_ID
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
  Content-Type: application/json
Body:
{
  "name": "Updated Name"
}
```

#### 🗑️ Xóa Item
```
Method: DELETE
URL: http://localhost:8001/api/v1/items/ITEM_ID
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

---

### 3. Search Endpoints

#### 🔍 Search Items
```
Method: GET
URL: http://localhost:8001/api/v1/search?q=keyword&itemType=FILE&limit=10&offset=0
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

---

### 4. Sharing Endpoints

#### 📤 Share Item
```
Method: POST
URL: http://localhost:8001/api/v1/items/ITEM_ID/share
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
  Content-Type: application/json
Body:
{
  "sharedWithUserId": "USER_ID",
  "permissionLevel": "VIEWER" // hoặc "EDITOR"
}
```

#### 🔗 Lấy Shared Items
```
Method: GET
URL: http://localhost:8001/api/v1/items/shared
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

---

### 5. Admin Endpoints (Cần role ADMIN)

#### 📊 Dashboard Stats
```
Method: GET
URL: http://localhost:8001/api/v1/admin/dashboard
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

#### 👥 Lấy danh sách Users
```
Method: GET
URL: http://localhost:8001/api/v1/admin/users?limit=10&offset=0
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

#### 🗑️ Xóa User
```
Method: DELETE
URL: http://localhost:8001/api/v1/admin/users/USER_ID
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

#### ⚙️ Cập nhật Role User
```
Method: PUT
URL: http://localhost:8001/api/v1/admin/users/USER_ID/role
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
  Content-Type: application/json
Body:
{
  "role": "TEACHER" // hoặc "STUDENT", "ADMIN"
}
```

---

## 🎯 Workflow Test khuyến nghị:

1. **Login ở Auth Service** → Lấy JWT token từ authentication service riêng
2. **Create Folder** → Tạo folder mới
3. **Get Items** → Xem danh sách items
4. **Upload File** → Upload file vào folder
5. **Search** → Tìm kiếm file
6. **Share** → Chia sẻ item với user khác

---

## 💡 Tips:
- **Không có login endpoint ở đây!** Token phải lấy từ authentication service khác
- Nhớ thêm `Authorization: Bearer TOKEN` vào Headers cho tất cả request cần auth
- Token có thời hạn 7 ngày (được config ở auth service)
- Nếu 401 Unauthorized → Token hết hạn hoặc không hợp lệ, cần lấy token mới từ auth service
- Dùng Postman Variables để lưu token: `{{token}}`

