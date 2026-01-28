# Complete Auth Flow - Detailed

## Overview

- **Unity app** uses browser-based Clerk authentication via "device handoff" flow
- After handoff, Unity receives **our own JWT tokens** (not Clerk tokens)
- All Unity API calls use our JWT tokens validated by `JwtAuthGuard`

---

## 1. Unity Initiates Handoff

**Endpoint**: `POST /auth/handoff/initiate`  
**Request**: `{ deviceId: string }`  
**Response**: `{ authUrl, deviceId, pollToken }`

- Cleans up any existing unused handoff codes for this device
- Generates a random `pollToken` (32 chars) using nanoid
- Returns URL: `{API_URL}/auth/login?device_id=X&poll_token=Y`
- Unity stores `pollToken` locally

---

## 2. Unity Opens Browser

- Unity opens the `authUrl` in system browser
- Browser hits `GET /auth/login?device_id=X&poll_token=Y`
- Backend redirects to: `{WEB_URL}/sign-in?device_id=X&poll_token=Y&fresh=true`

---

## 3. Next.js Sign-In Page

**File**: `web/app/sign-in/[[...sign-in]]/page.tsx`

- Reads `device_id` and `poll_token` from URL params
- Stores both in `sessionStorage` (because Clerk redirects strip custom params)
- Renders Clerk's `<SignIn>` component with `forceRedirectUrl=/auth/complete`

---

## 4. User Authenticates with Clerk

- User signs in/up via Clerk UI (email, Google, etc.)
- Clerk handles authentication, creates Clerk session
- Clerk redirects to `/auth/complete`

---

## 5. Auth Complete Page

**File**: `web/app/auth/complete/page.tsx`

- Reads `device_id` and `poll_token` from `sessionStorage` (not URL - Clerk strips them)
- Calls `getToken()` from Clerk SDK to get Clerk session JWT
- Sends `POST /auth/callback` to backend:
  ```json
  {
    "deviceId": "...",
    "clerkSessionToken": "...",
    "pollToken": "..."
  }
  ```

---

## 6. Backend Callback

**Endpoint**: `POST /auth/callback`  
**File**: `api/src/modules/auth/controllers/auth.controller.ts`

- Verifies Clerk token using `@clerk/backend` `verifyToken()` - extracts `userId`
- Looks up user in database by Clerk ID
- If user doesn't exist: fetches from Clerk API, creates in database
- Cleans up existing unused handoff codes for device
- Creates new handoff code:
  - `code`: 21-character random string (~126 bits entropy)
  - `pollToken`: passed through from request
  - `expiresAt`: 5 minutes from now
  - Stored in `device_handoff_codes` table
- Returns: `{ success, code, deepLink, expiresAt }`
- Browser shows "Authentication successful" and tries to open deep link

---

## 7. Unity Polls for Handoff Code

**Endpoint**: `GET /auth/handoff/poll?device_id=X&poll_token=Y`

- Unity polls this repeatedly (e.g., every 2 seconds)
- Backend looks for unused handoff code matching BOTH `device_id` AND `poll_token`
- If not found or `pollToken` mismatch: returns `{ status: "pending" }`
- If found and valid: returns `{ status: "ready", code: "...", expiresAt: "..." }`

---

## 8. Unity Exchanges Code for Tokens

**Endpoint**: `POST /auth/device-token`  
**Headers**: `X-Device-ID: ...`  
**Request**: `{ code: string, deviceInfo?: {...} }`

- Validates handoff code: checks code matches, device matches, not expired, not used
- Marks handoff code as `usedAt = now`
- Upserts device in `devices` table
- Creates session via `SessionService.createSession()`:
  - Revokes any existing active session for this user+device
  - Generates `sessionId` (nanoid)
  - Generates `refreshToken` (64-char nanoid)
  - Hashes refresh token with SHA-256
  - Stores session in `sessions` table with:
    - `refreshToken` (legacy field, now stores hash)
    - `refreshTokenHash`
    - `expiresAt` (15 minutes)
    - `refreshExpiresAt` (30 days)
  - Generates JWT access token with claims: `{ sub: userId, sid: sessionId, did: deviceId }`
- Returns:
  ```json
  {
    "accessToken": "eyJ...",
    "refreshToken": "abc123...",
    "expiresAt": "...",
    "refreshExpiresAt": "...",
    "user": { "id", "email", "firstName", "lastName", "imageUrl" }
  }
  ```

---

## 9. Unity Uses Access Token

- Unity stores both tokens locally
- All API requests include: `Authorization: Bearer {accessToken}`
- Optionally includes: `X-Device-ID: {deviceId}` header

---

## 10. JwtAuthGuard Validation

**File**: `api/src/modules/auth/guards/jwt-auth.guard.ts`

For every protected endpoint:

1. Extracts token from `Authorization: Bearer X` header
2. Verifies JWT signature using `jose` library + `JWT_SECRET`
3. Extracts payload: `{ sub, sid, did }`
4. Calls `sessionService.validateSession(sid)` - checks session exists, not revoked
5. If `X-Device-ID` header present, verifies it matches token's `did`
6. Fetches full user from database
7. Attaches to request: `request.user = User`, `request.session = { sessionId, deviceId }`

---

## 11. Token Refresh

**Endpoint**: `POST /auth/refresh`  
**Request**: `{ refreshToken: string }`

1. Hashes the provided refresh token
2. Looks up session by `refreshTokenHash`
3. If not found, checks `previousRefreshTokenHash` (reuse detection)
   - If found in previous: **REVOKES ALL SESSIONS FOR DEVICE** (suspected theft)
4. If session is revoked or expired: error
5. Generates new tokens (access + refresh)
6. Updates session:
   - New `refreshTokenHash`
   - Old hash moved to `previousRefreshTokenHash`
   - New expiry times
7. Returns new tokens

---

## 12. Logout

**Endpoint**: `POST /auth/logout` (requires `JwtAuthGuard`)
- Marks session as `isRevoked = true` in database
- Token becomes invalid on next validation

**Endpoint**: `POST /auth/logout-all` (requires `JwtAuthGuard`)
- Revokes ALL sessions for the user

---

## Database Tables Involved

| Table | Purpose |
|-------|---------|
| `users` | User accounts (synced from Clerk) |
| `devices` | Device registry (id, userId, name, type, platform, etc.) |
| `sessions` | Active sessions (id, userId, deviceId, refreshTokenHash, previousRefreshTokenHash, isRevoked, expiresAt, refreshExpiresAt) |
| `device_handoff_codes` | Temporary handoff codes (code, deviceId, userId, pollToken, expiresAt, usedAt) |

---

## Guards Summary

| Guard | Validates | Used By |
|-------|-----------|---------|
| `JwtAuthGuard` | Our JWT (from SessionService) | `/auth/me`, `/auth/logout`, `/auth/logout-all`, `/devices/*`, `/api/maia/*`, `/api/OpenAI/*`, `/api/GCloud/*` |
| `ClerkAuthGuard` | Clerk session tokens | `/api/admin/maia/*`, `/users/*` (no frontend currently uses these) |

---

## Token Lifetimes

| Token | Lifetime | Configured In |
|-------|----------|---------------|
| Our Access Token (JWT) | 15 minutes | `session.service.ts` - `ACCESS_TOKEN_EXPIRY_MINUTES` |
| Our Refresh Token | 30 days | `session.service.ts` - `REFRESH_TOKEN_EXPIRY_DAYS` |
| Handoff Code | 5 minutes | `handoff.service.ts` - `HANDOFF_CODE_EXPIRY_MINUTES` |

---

## Security Features

- **Poll token**: Required for polling, prevents device ID enumeration attacks
- **Refresh token rotation**: New refresh token issued on each refresh
- **Reuse detection**: Old refresh token stored as `previousRefreshTokenHash`, if reused = revoke all device sessions
- **Hashed refresh tokens**: Only SHA-256 hash stored in database, not plaintext
- **Session revocation**: Immediate via `/auth/logout` or `/auth/logout-all`
- **Handoff code entropy**: 21 characters (~126 bits)

---

## Files Involved

### Backend (NestJS)

| File | Purpose |
|------|---------|
| `api/src/modules/auth/controllers/auth.controller.ts` | Main auth endpoints |
| `api/src/modules/auth/controllers/devices.controller.ts` | Device management |
| `api/src/modules/auth/services/session.service.ts` | JWT creation, refresh, revocation |
| `api/src/modules/auth/services/handoff.service.ts` | Handoff code management |
| `api/src/modules/auth/guards/jwt-auth.guard.ts` | Our JWT validation |
| `api/src/modules/auth/guards/clerk-auth.guard.ts` | Clerk token validation |
| `api/src/modules/auth/decorators/current-user.decorator.ts` | Extract user from request |
| `api/src/modules/auth/decorators/current-session.decorator.ts` | Extract session info from request |

### Web (Next.js)

| File | Purpose |
|------|---------|
| `web/app/sign-in/[[...sign-in]]/page.tsx` | Clerk sign-in wrapper |
| `web/app/sign-up/[[...sign-up]]/page.tsx` | Clerk sign-up wrapper |
| `web/app/auth/complete/page.tsx` | Post-auth callback to backend |

---

## Why Our Own JWT Instead of Clerk Tokens?

1. **Clerk's refresh is browser-centric** - relies on web SDK and cookies, not suitable for Unity
2. **Unified auth model** - same tokens work across web, Unity, future clients
3. **Server-side control** - device sessions, revocation, custom claims
4. **Simpler Unity integration** - one-time browser login → stable long-lived session
