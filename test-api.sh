#!/bin/bash

echo "================================================"
echo "HPC Drive API Test Script"
echo "================================================"
echo ""

BASE_URL="http://localhost:8001/api/v1"

# Test 1: Đăng ký user mới
echo "📝 Test 1: Đăng ký user..."
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123456"
  }' | jq '.' || echo ""
echo ""

# Test 2: Đăng nhập
echo "🔐 Test 2: Đăng nhập..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test123456"
  }')

echo "$LOGIN_RESPONSE" | jq '.' || echo "$LOGIN_RESPONSE"
echo ""

# Extract token từ response
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token' 2>/dev/null)

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "✅ Token nhận được: ${TOKEN:0:30}..."
  echo ""

  # Test 3: Lấy profile
  echo "👤 Test 3: Lấy profile (Protected route)..."
  curl -s -X GET "$BASE_URL/auth/profile" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" | jq '.' || echo ""
else
  echo "❌ Không lấy được token, bỏ qua test 3"
fi

echo ""
echo "================================================"
echo "Test xong!"
echo "================================================"


