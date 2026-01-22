# Maia

Backend API and Web Frontend for SurgicalAR.

## Project Structure

```
maia/
├── api/          # Hono backend API
│   ├── src/      # Backend source code
│   └── .env      # Backend environment variables
│
└── web/          # Next.js frontend
    ├── app/      # Next.js app router
    └── .env.local # Frontend environment variables
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Clerk account (for authentication)

### Installation

```bash
# Install root dependencies
npm install

# Install all package dependencies
npm run install:all
```

### Environment Setup

1. Copy environment examples:
```bash
cp api/.env.example api/.env
```

2. Configure `api/.env` with your:
   - Database URL
   - Clerk keys
   - JWT secret

3. Create `web/.env.local`:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Development

```bash
# Run both API and Web concurrently
npm run dev

# Or run individually
npm run dev:api   # Backend on port 3000
npm run dev:web   # Frontend on port 3001
```

### Database

```bash
# Generate migrations
npm run db:generate

# Apply migrations
npm run db:migrate

# Open Drizzle Studio
npm run db:studio
```

## Architecture

- **API**: Hono + Drizzle ORM + PostgreSQL
- **Web**: Next.js 16 + Clerk + Tailwind CSS
- **Auth**: Clerk (web) + Custom JWT (device sessions)
