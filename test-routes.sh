#!/bin/bash

# Test script for Maia API routes
BASE_URL="http://localhost:3000"

echo "Testing Maia API Routes"
echo "======================="
echo ""

# Test health endpoint (should work)
echo "1. Testing GET /health (should return 200)"
curl -X GET "$BASE_URL/health" -w "\nStatus: %{http_code}\n" 2>/dev/null
echo ""
echo ""

# Test auth/me without auth (should return 401)
echo "2. Testing GET /auth/me without auth (should return 401)"
curl -X GET "$BASE_URL/auth/me" -w "\nStatus: %{http_code}\n" 2>/dev/null
echo ""
echo ""

# Test auth/callback without body (should return 400/404)
echo "3. Testing POST /auth/callback without body (should return 400)"
curl -X POST "$BASE_URL/auth/callback" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" 2>/dev/null
echo ""
echo ""

# Test auth/device-token without body (should return 400)
echo "4. Testing POST /auth/device-token without body (should return 400)"
curl -X POST "$BASE_URL/auth/device-token" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" 2>/dev/null
echo ""
echo ""

# Test auth/refresh without body (should return 400)
echo "5. Testing POST /auth/refresh without body (should return 400)"
curl -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" 2>/dev/null
echo ""
echo ""

echo "Done! Check the status codes above."
echo ""
echo "Expected results:"
echo "- /health: 200"
echo "- /auth/me: 401 (needs Authorization header)"
echo "- POST routes: 400 (validation errors) or 404 (if wrong method)"
