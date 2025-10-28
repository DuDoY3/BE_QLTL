# 🔐 FLOW PHÂN QUYỀN - HPC Drive

## ⚠️ LƯU Ý QUAN TRỌNG

**Backend này KHÔNG có login endpoint!** 
- Authentication được xử lý bởi một service khác
- Backend này CHỈ verify JWT token để biết role

---

## 🔄 Flow hoạt động

### 1️⃣ Login ở Authentication Service (backend khác)

```
POST /auth/login (ở auth service)
{
  "username": "admin_user",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "uuid",
    "role": "ADMIN"  ← Đây là role quan trọng!
  }
}
```

### 2️⃣ Frontend lưu token

```javascript
// Frontend lưu token vào localStorage hoặc state
localStorage.setItem('token', response.token);
```

### 3️⃣ Gọi API Document Management

#### ✅ Nếu là ADMIN:

```javascript
// Có thể gọi ADMIN endpoints
GET http://localhost:8001/api/v1/admin/dashboard
Authorization: Bearer <admin_token>

// Response: OK 200
{
  "success": true,
  "data": {
    "users": { ... },
    "storage": { ... },
    "system": { ... }
  }
}
```

#### ❌ Nếu là TEACHER/STUDENT:

```javascript
// GỌI ADMIN endpoint → BỊ CHẶN
GET http://localhost:8001/api/v1/admin/dashboard
Authorization: Bearer <teacher_token>

// Response: FORBIDDEN 403
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

✅ **Nhưng vẫn gọi được regular endpoints:**

```javascript
// Teacher/Student gọi được
GET http://localhost:8001/api/v1/items
Authorization: Bearer <teacher_token>

// Response: OK 200
// (Chỉ thấy tài liệu của mình + được chia sẻ)
{
  "success": true,
  "data": [...]
}
```

---

## 🛡️ Logic bảo vệ ADMIN endpoints

### Code hiện tại:

```typescript:src/api/admin.routes.ts
import { authenticate, requireAdmin } from "../middlewares/auth";

const router: Router = Router();

// ⬇️ ĐÂY LÀ GIẢI PHÁP PHÂN QUYỀN
router.use(authenticate);     // 1. Verify token
router.use(requireAdmin);     // 2. CHỈ ADMIN mới qua được

// Tất cả routes dưới đây CHỈ ADMIN mới gọi được
router.get("/dashboard", getDashboardStatsHandler);
router.get("/users", getUsersHandler);
router.get("/items", getItemsHandler);
router.delete("/users/:userId", deleteUserHandler);
router.put("/users/:userId/role", updateUserRoleHandler);
```

### Middleware `requireAdmin`:

```typescript:src/middlewares/auth.ts
export const requireAdmin = requireRole([UserRole.ADMIN]);

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    // ⬇️ CHECK ROLE
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        },
      });
    }

    next();
  };
};
```

---

## 📊 So sánh kết quả theo role

### ADMIN token

| Endpoint | Method | Kết quả |
|----------|--------|---------|
| `/api/v1/admin/dashboard` | GET | ✅ OK - Thấy thống kê |
| `/api/v1/admin/users` | GET | ✅ OK - Thấy tất cả users |
| `/api/v1/admin/items` | GET | ✅ OK - Thấy tất cả items |
| `/api/v1/items` | GET | ✅ OK - Thấy tất cả items |
| `/api/v1/items/{id}` | GET | ✅ OK - Xem được bất kỳ item |

### TEACHER token

| Endpoint | Method | Kết quả |
|----------|--------|---------|
| `/api/v1/admin/dashboard` | GET | ❌ 403 FORBIDDEN |
| `/api/v1/admin/users` | GET | ❌ 403 FORBIDDEN |
| `/api/v1/admin/items` | GET | ❌ 403 FORBIDDEN |
| `/api/v1/items` | GET | ✅ OK - Chỉ thấy của mình + được share |
| `/api/v1/items/{id}` | GET | ✅ OK - Nếu là của mình hoặc được share |

### STUDENT token

| Endpoint | Method | Kết quả |
|----------|--------|---------|
| `/api/v1/admin/dashboard` | GET | ❌ 403 FORBIDDEN |
| `/api/v1/admin/users` | GET | ❌ 403 FORBIDDEN |
| `/api/v1/admin/items` | GET | ❌ 403 FORBIDDEN |
| `/api/v1/items` | GET | ✅ OK - Chỉ thấy của mình + được share |
| `/api/v1/items/{id}` | GET | ✅ OK - Nếu là của mình hoặc được share |

---

## 🧪 TEST phân quyền

### Test 1: Admin access

```bash
# 1. Get admin token từ auth service
curl -X POST http://auth-service:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Response: {"token": "eyJ..."}

# 2. Dùng admin token gọi admin endpoint
curl http://localhost:8001/api/v1/admin/dashboard \
  -H "Authorization: Bearer eyJ..."

# Response: 200 OK - Có data
```

### Test 2: Teacher bị chặn admin

```bash
# 1. Get teacher token từ auth service
curl -X POST http://auth-service:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "teacher", "password": "password"}'

# Response: {"token": "eyJ..."}

# 2. Teacher gọi admin endpoint
curl http://localhost:8001/api/v1/admin/dashboard \
  -H "Authorization: Bearer eyJ..."

# Response: 403 FORBIDDEN
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

---

## 📝 Tóm tắt

### ✅ PHÂN QUYỀN ĐÃ HOÀN THIỆN

1. **Admin endpoints** → Chỉ ADMIN access (middleware `requireAdmin`)
2. **Regular endpoints** → TEACHER/STUDENT được access (nhưng chỉ thấy data của mình)
3. **Data filtering** → TEACHER/STUDENT chỉ thấy items của mình + được share
4. **Admin bypass** → Admin thấy tất cả items (không filter)

### ❌ KHÔNG CÓ LOGIN Ở BACKEND NÀY

- Login ở service khác (authentication service)
- Backend này chỉ verify JWT token
- Role được extract từ JWT token
- Phân quyền dựa trên role trong token

---

## 🎯 Kết luận

**Flow hiện tại:**
```
User → Auth Service → Get JWT token (có role) 
     → Gọi Document API với token 
     → Backend verify token, check role 
     → Cho phép/Chặn theo role
```

**Kết quả:**
- ✅ Admin token → Vào được `/admin/*`
- ❌ Teacher/Student token → Bị chặn `/admin/*`, chỉ vào được regular endpoints

**ĐÃ HOÀN THIỆN PHÂN QUYỀN!** 🎉

