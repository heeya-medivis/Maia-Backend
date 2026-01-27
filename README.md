# Maia-Backend

Backend API and Web Frontend for SurgicalAR / Maia AI Assistant.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS + TypeScript |
| **Database** | PostgreSQL + Drizzle ORM |
| **Auth** | WorkOS (OAuth 2.0 + PKCE, Enterprise SSO) |
| **Frontend** | Next.js 16 + Tailwind CSS |
| **Session** | httpOnly cookies with HMAC signing |

## Project Structure

```
maia-backend/
├── api/                    # NestJS Backend API
│   ├── src/
│   │   ├── common/         # Shared types, exceptions, filters
│   │   ├── config/         # Environment configuration
│   │   ├── database/       # Drizzle ORM schema & migrations
│   │   │   └── schema/     # Database table definitions
│   │   ├── modules/
│   │   │   ├── auth/       # Authentication (WorkOS OAuth)
│   │   │   ├── users/      # User management
│   │   │   ├── maia/       # AI assistant endpoints
│   │   │   ├── ai-providers/  # OpenAI, GCloud integrations
│   │   │   └── webhooks/   # WorkOS webhook handlers
│   │   └── utils/          # JWT utilities
│   └── drizzle.config.ts
│
├── web/                    # Next.js Frontend
│   ├── app/
│   │   ├── admin/          # Admin dashboard pages
│   │   ├── api/            # BFF API routes (auth, proxies)
│   │   ├── login/          # Login page
│   │   └── user/           # User dashboard
│   ├── components/         # React components
│   └── lib/                # Auth, API client utilities
│
├── docs/                   # Documentation
└── .env                    # Environment variables (root)
```

---

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts with profile data (email, name, isAdmin) |
| `devices` | Registered devices (XR headsets, desktop, mobile) |
| `sessions` | JWT sessions with refresh token rotation |
| `identities` | Links users to external auth providers (WorkOS) |

### Authentication Tables

| Table | Description |
|-------|-------------|
| `auth_connections` | Auth provider configurations (Google, Microsoft, SSO) |
| `sso_domains` | Email domain → SSO connection mapping (e.g., @nyu.edu → NYU SSO) |
| `oauth_authorization_codes` | PKCE authorization codes (short-lived) |

### Maia AI Tables

| Table | Description |
|-------|-------------|
| `maia_models` | AI model configurations (GPT-4o, Gemini, etc.) |
| `maia_hosts` | Self-hosted AI server endpoints |
| `maia_prompts` | System/analysis prompts per model |
| `user_maia_access` | User ↔ Model access permissions |

### Audit Table

| Table | Description |
|-------|-------------|
| `audit_logs` | Security & compliance event logging |

---

## API Modules

### Auth Module (`/v1/auth/*`, `/v1/oauth/*`, `/v1/sso/*`)

| Controller | Endpoints |
|------------|-----------|
| **OAuthController** | `GET /v1/oauth/authorize` - Start OAuth flow |
|                     | `POST /v1/oauth/token` - Exchange code for tokens |
|                     | `GET /v1/oauth/callback` - WorkOS callback |
| **AuthController**  | `GET /v1/auth/me` - Get current user |
|                     | `POST /v1/auth/refresh` - Refresh tokens |
|                     | `POST /v1/auth/logout` - Logout |
| **SsoController**   | `POST /v1/sso/lookup` - Lookup enterprise SSO by email |
|                     | Admin CRUD for connections & domains |
| **DevicesController** | Device registration & management |

### Maia Module (`/v1/maia/*`)

| Controller | Endpoints |
|------------|-----------|
| **MaiaApiController** | `POST /v1/maia/chat` - AI chat endpoint |
| **MaiaAdminController** | Admin CRUD for models, hosts, prompts |

### Webhooks Module (`/webhooks/*`)

| Controller | Endpoints |
|------------|-----------|
| **WorkOSWebhookController** | `POST /webhooks/workos` - Handle WorkOS events |

---

## Authentication Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Client    │      │  Maia API   │      │   WorkOS    │
│ (Web/Unity) │      │  (NestJS)   │      │             │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │ 1. GET /v1/oauth/authorize              │
       │ ─────────────────> │                    │
       │                    │ 2. Generate PKCE   │
       │ 3. Redirect to WorkOS ─────────────────>│
       │ <─────────────────────────────────────  │
       │                    │                    │
       │ 4. User authenticates with IdP          │
       │                    │ <──────────────────│
       │                    │ 5. Callback with   │
       │                    │    auth code       │
       │                    │                    │
       │ 6. POST /v1/oauth/token                 │
       │ ─────────────────> │                    │
       │                    │ 7. Verify PKCE     │
       │                    │ 8. Create session  │
       │ 9. JWT tokens      │                    │
       │ <───────────────── │                    │
```

**Supported Auth Methods:**
- Google OAuth (via WorkOS)
- Microsoft OAuth (via WorkOS)
- Apple OAuth (via WorkOS)
- Enterprise SSO (SAML/OIDC via WorkOS)
- Magic Link (passwordless)

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- WorkOS account (for authentication)

### Installation

```bash
# Install all dependencies
npm run install:all
```

### Environment Setup

Create `.env` in the root directory:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/maia

# WorkOS
WORKOS_API_KEY=sk_xxx
WORKOS_CLIENT_ID=client_xxx
WORKOS_WEBHOOK_SECRET=whsec_xxx

# JWT
JWT_SECRET=your-256-bit-secret
JWT_AUDIENCE=maia-web

# Session (Frontend)
SESSION_SECRET=your-session-secret

# URLs
API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Development

```bash
# Run both API and Web concurrently
npm run dev

# Or run individually
npm run dev:api   # Backend on port 3000
npm run dev:web   # Frontend on port 3001
```

### Database Commands

```bash
npm run db:generate   # Generate migrations from schema changes
npm run db:migrate    # Apply migrations
npm run db:push       # Push schema directly (dev only)
npm run db:studio     # Open Drizzle Studio GUI
```

### Build

```bash
npm run build         # Build both API and Web
npm run build:api     # Build API only
npm run build:web     # Build Web only
```

---

## Admin Access

Admin users have `is_admin = true` in the `users` table. To grant admin access:

```sql
UPDATE users SET is_admin = true WHERE email = 'your@email.com';
```

Admin pages are available at `/admin/*`:
- `/admin` - Dashboard
- `/admin/users` - User management
- `/admin/sso` - SSO connections & domain mappings
- `/admin/maia-models` - AI model configuration
- `/admin/maia-hosts` - Self-hosted AI servers

---

## Security Features

- **PKCE** - Proof Key for Code Exchange for OAuth
- **Refresh Token Rotation** - Family-based theft detection
- **HMAC Session Signing** - Tamper-proof cookies
- **Admin Guard** - Role-based access control
- **Audit Logging** - Security event tracking
