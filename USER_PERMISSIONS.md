# 👥 USER PERMISSIONS & ROLES - HPC Drive

## 📊 Tổng quan 3 Roles

Dự án hỗ trợ **3 loại người dùng** với quyền hạn khác nhau:

| Role | Mô tả | Quyền truy cập |
|------|-------|----------------|
| **ADMIN** | Quản trị viên | Toàn bộ hệ thống, quản lý tất cả tài liệu và users |
| **TEACHER** | Giáo viên | Quản lý tài liệu cá nhân, chia sẻ với students |
| **STUDENT** | Sinh viên | Quản lý tài liệu cá nhân, xem tài liệu được chia sẻ |

---

## 🔴 ADMIN - Quản trị viên

### ✅ **Chức năng:**
1. **Xem và quản lý TẤT CẢ tài liệu** trong hệ thống
2. **Download/xem bất kỳ tài liệu nào**
3. **Xóa bất kỳ tài liệu nào** (kể cả không phải của mình)
4. **Xem tất cả users** trong hệ thống
5. **Xóa users** (không thể xóa chính mình)
6. **Thay đổi role** của bất kỳ user nào
7. **Xem dashboard** thống kê hệ thống

### 📍 **Code Evidence:**

**Middleware kiểm tra Admin:**
```typescript:src/middlewares/auth.ts
export const requireAdmin = requireRole([UserRole.ADMIN]);
```

**Admin xem TẤT CẢ items (không bị filter):**
```typescript:src/services/driveItem.service.ts
export async function findItems(query, userId, userRole) {
  const whereClause = { parentId: parentId, isTrashed: false };
  
  // CHỈ áp dụng filter nếu KHÔNG phải ADMIN
  if (userRole !== UserRole.ADMIN) {
    whereClause.OR = [
      { ownerId: userId },  // Tài liệu của mình
      { sharePermissions: { some: { sharedWithUserId: userId } } }  // Được chia sẻ
    ];
  }
  
  // ADMIN không có filter → thấy tất cả
}
```

**Admin có full access:**
```typescript:src/services/sharing.service.ts
export async function checkItemAccess(itemId, userId, userRole, requiredLevel) {
  if (userRole === UserRole.ADMIN) return true;  // ← Bypass tất cả kiểm tra
  
  // Còn lại check quyền...
}
```

**Admin endpoints (chỉ ADMIN access):**
```typescript:src/api/admin.routes.ts
router.use(authenticate);
router.use(requireAdmin);  // ← Bắt buộc phải là ADMIN

router.get("/dashboard", getDashboardStatsHandler);  // Thống kê
router.get("/users", getUsersHandler);               // Xem tất cả users
router.get("/items", getItemsHandler);               // Xem tất cả tài liệu
router.delete("/users/:userId", deleteUserHandler); // Xóa user
router.put("/users/:userId/role", updateUserRoleHandler); // Đổi role
```

### 🚫 **Hạn chế:**
- KHÔNG thể xóa chính mình
- KHÔNG thể đổi role của chính mình

---

## 🟡 TEACHER - Giáo viên

### ✅ **Chức năng:**
1. **Upload/tạo** file và folder cho mình
2. **Xem/download** tài liệu của mình
3. **Chia sẻ** tài liệu với học sinh khác (VIEWER hoặc EDITOR)
4. **Chỉnh sửa** tài liệu của mình (đổi tên, di chuyển)
5. **Xóa** tài liệu của mình
6. **Xem** tài liệu được chia sẻ với mình
7. **Tìm kiếm** trong tài liệu của mình + được chia sẻ

### 📍 **Code Evidence:**

**Teacher chỉ thấy tài liệu của mình + được chia sẻ:**
```typescript:src/services/driveItem.service.ts
export async function findItems(query, userId, userRole) {
  // TEACHER/STUDENT: Chỉ thấy tài liệu của mình + được chia sẻ
  if (userRole !== UserRole.ADMIN) {
    whereClause.OR = [
      { ownerId: userId },  // Tài liệu của mình
      { sharePermissions: { some: { sharedWithUserId: userId } } }  // Được chia sẻ
    ];
  }
}
```

**Teacher/Student share tài liệu:**
```typescript:src/services/sharing.service.ts
export async function shareItem(itemId, sharedWithUserId, permissionLevel, userId, userRole) {
  // Check xem user có phải owner không
  const item = await prisma.driveItem.findUnique({ where: { itemId } });
  
  if (!item || item.ownerId !== userId) {
    throw new Error("Only the owner can share this item");
  }
  
  // Không được chia sẻ với chính mình
  if (sharedWithUserId === userId) {
    throw new Error("Cannot share with yourself");
  }
}
```

### 🚫 **Hạn chế:**
- KHÔNG thể xem tài liệu của người khác (trừ khi được chia sẻ)
- KHÔNG thể xóa tài liệu của người khác
- KHÔNG thể truy cập admin endpoints
- CHỈ có thể chia sẻ tài liệu CỦA MÌNH

### 🔑 **Chi tiết quyền:**
```typescript
// Check quyền truy cập item
const hasAccess = await checkItemAccess(itemId, userId, userRole);

// Logic check:
// 1. Là owner? → Full access
// 2. Được chia sẻ? → Check permission level
// 3. Không phải → Deny
```

---

## 🟢 STUDENT - Sinh viên

### ✅ **Chức năng:**
1. **Upload/tạo** file và folder cho mình
2. **Xem/download** tài liệu của mình
3. **Chia sẻ** tài liệu với người khác (VIEWER hoặc EDITOR)
4. **Chỉnh sửa** tài liệu của mình (đổi tên, di chuyển)
5. **Xóa** tài liệu của mình
6. **Xem** tài liệu được chia sẻ với mình (từ teacher hoặc student khác)
7. **Tìm kiếm** trong tài liệu của mình + được chia sẻ

### 📍 **Quyền tương đương TEACHER:**
Student có **CHÍNH XÁC** quyền như Teacher trong việc quản lý tài liệu.

**Khác biệt duy nhất:** Trong tương lai có thể phân biệt thêm (ví dụ: teacher chỉ được xem report, student không).

### 🚫 **Hạn chế:**
- KHÔNG thể xem tài liệu của người khác (trừ khi được chia sẻ)
- KHÔNG thể xóa tài liệu của người khác
- KHÔNG thể truy cập admin endpoints
- CHỈ có thể chia sẻ tài liệu CỦA MÌNH

---

## 🔐 Share Permission Levels (Khi chia sẻ tài liệu)

Cả **TEACHER** và **STUDENT** đều có thể chia sẻ với 2 cấp độ:

### 👁️ VIEWER (Chỉ xem)
```typescript
ShareLevel.VIEWER
```
**Quyền:**
- ✅ Xem tài liệu
- ✅ Download tài liệu
- ❌ KHÔNG thể sửa
- ❌ KHÔNG thể xóa

**Code:**
```typescript:src/services/driveItem.service.ts
export async function updateItem(itemId, data, userId, userRole) {
  // Check permission
  const hasEditAccess = await checkItemAccess(itemId, userId, userRole, ShareLevel.EDITOR);
  if (!hasEditAccess) {
    throw new Error("You need editor permission to update this item");
  }
}
```

### ✏️ EDITOR (Xem và sửa)
```typescript
ShareLevel.EDITOR
```
**Quyền:**
- ✅ Xem tài liệu
- ✅ Download tài liệu
- ✅ Chỉnh sửa metadata (đổi tên, di chuyển)
- ❌ KHÔNG thể xóa (chỉ owner hoặc admin)

**Code:**
```typescript:src/services/driveItem.service.ts
export async function deleteItem(itemId, userId, userRole) {
  const item = await prisma.driveItem.findUnique({ where: { itemId } });
  
  // CHỈ owner hoặc admin mới xóa được
  if (item.ownerId !== userId && userRole !== UserRole.ADMIN) {
    throw new Error("Only the owner or an admin can delete this item");
  }
}
```

---

## 📝 Tóm tắt so sánh

| Chức năng | ADMIN | TEACHER | STUDENT |
|-----------|-------|---------|---------|
| **Xem tài liệu** | Tất cả | Của mình + được chia sẻ | Của mình + được chia sẻ |
| **Tạo/Upload** | ✅ | ✅ | ✅ |
| **Chia sẻ tài liệu** | ✅ (nhưng ít dùng) | ✅ | ✅ |
| **Xóa tài liệu** | Tất cả | Chỉ của mình | Chỉ của mình |
| **Quản lý users** | ✅ | ❌ | ❌ |
| **Dashboard stats** | ✅ | ❌ | ❌ |
| **Đổi role users** | ✅ | ❌ | ❌ |
| **Xóa users** | ✅ | ❌ | ❌ |

---

## 🎯 Logic phân quyền

### Khi truy cập item:
```typescript
checkItemAccess(itemId, userId, userRole, requiredLevel)
```

**Flow:**
1. **Admin?** → ✅ True (bypass tất cả)
2. **Là owner?** → ✅ True
3. **Có được chia sẻ?** → Check permission level
   - Required: VIEWER → ✅ Luôn true
   - Required: EDITOR → Phải có EDITOR permission
4. **Không thỏa** → ❌ False

### Khi list items:
```typescript
// Admin: Không filter
// Teacher/Student: 
WHERE (ownerId = userId OR id IN shared_items)
```

### Khi share:
```typescript
// CHỈ owner mới share được
if (item.ownerId !== userId) throw new Error(...)
```

---

## 🔗 API Endpoints theo role

### Endpoints cho TẤT CẢ roles (authenticate):
- `GET /api/v1/items` - List tài liệu
- `POST /api/v1/items` - Tạo folder/upload file
- `GET /api/v1/items/:id` - Chi tiết item
- `GET /api/v1/items/:id/download` - Download
- `PUT /api/v1/items/:id` - Update
- `DELETE /api/v1/items/:id` - Delete
- `GET /api/v1/search` - Tìm kiếm
- `POST /api/v1/items/:id/shares` - Share
- `GET /api/v1/items/shared-with-me` - Xem được chia sẻ

### Endpoints CHỈ ADMIN:
- `GET /api/v1/admin/dashboard` - Dashboard
- `GET /api/v1/admin/users` - List users
- `GET /api/v1/admin/items` - List all items
- `DELETE /api/v1/admin/users/:id` - Xóa user
- `PUT /api/v1/admin/users/:id/role` - Đổi role

