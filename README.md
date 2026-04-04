# Zorvyn Full-Stack Financial System

A secure and extensible full-stack financial records system with a Node.js backend and React frontend, role-based access control (RBAC), JWT authentication, Redis-backed performance features, and queue-driven audit processing.

## Description

This project provides a production-style Express + MongoDB backend plus Vite + React frontend for:
- User registration and login
- Financial records CRUD
- Role-aware data access
- Dashboard statistics endpoints
- Health endpoint for deployment checks
- API documentation via Swagger

It includes advanced reliability and scale-focused features like idempotent writes, Redis caching, BullMQ jobs, and graceful degraded mode when Redis is unavailable.

## Monorepo Structure

```
root/
  src/                  # Backend source (Express API)
  client/               # Frontend source (React + Vite)
  package.json          # Backend dependencies and orchestration scripts
  client/package.json   # Frontend dependencies and scripts
  README.md
```

## Tech Stack

- Runtime: Node.js (ES Modules)
- Framework: Express.js
- Database: MongoDB + Mongoose
- Authentication: JWT + bcrypt
- Validation: Joi
- Security: Helmet, CORS, express-rate-limit
- Caching: Redis (ioredis)
- Queue: BullMQ
- API Docs: swagger-jsdoc + swagger-ui-express
- Testing: Jest + Supertest + MongoMemoryServer

## Features

- JWT authentication (`/auth/register`, `/auth/login`)
- Role-based authorization (`Viewer`, `Analyst`, `Admin`)
- Financial records CRUD with soft delete
- Filtered and paginated records listing
- Dashboard stats (`summary`, `category`, `monthly`)
- Public health check endpoint (`/health`)
- Idempotent record creation (`Idempotency-Key`)
- Redis cache-aside stats optimization
- BullMQ-powered async audit logging
- Degraded mode fallbacks when Redis is down
- Swagger UI at `/api-docs`
- Demo data seeding via `npm run seed`

## Full-Stack Quick Start

Install backend dependencies at project root:

```bash
npm install
```

Install frontend dependencies:

```bash
npm --prefix client install
```

Run backend + frontend together:

```bash
npm run dev:all
```

Default local URLs:
- Backend API: `http://localhost:3000`
- Frontend app: `http://localhost:5173`

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- MongoDB running locally or remotely
- Redis running locally (recommended)

Redis is optional because degraded mode is supported, but recommended for full behavior (persistent idempotency/cache + queue processing).

### 2. Install dependencies

```bash
npm install
npm --prefix client install
```

### 3. Environment variables

Create a `.env` file in the project root:

```env
PORT=3000
JWT_SECRET=replace-with-a-strong-secret
DB_URL=mongodb://127.0.0.1:27017/zorvyn
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173

REDIS_URL=redis://127.0.0.1:6379
REDIS_CONNECT_TIMEOUT_MS=4000
REDIS_DEGRADED_MODE=true

STATS_CACHE_TTL_SECONDS=300
STATS_MONTHLY_CACHE_TTL_SECONDS=900
IDEMPOTENCY_TTL_SECONDS=86400
IDEMPOTENCY_LOCK_TTL_SECONDS=30
AUDIT_QUEUE_NAME=audit-log-jobs
```

Create a frontend env file at `client/.env.local` for local development:

```env
VITE_API_URL=http://localhost:3000
```

Production safety rules:
- Set `VITE_API_URL` explicitly in production builds.
- Use `https://` for production API URL values.
- `VITE_API_BASE_URL` is supported temporarily for compatibility, but `VITE_API_URL` is preferred.

### 4. Run server

Development mode:

```bash
npm run dev
```

Direct run:

```bash
node server.js
```

Useful scripts:

```bash
npm run dev
npm run seed
npm test
```

Frontend scripts:

```bash
npm --prefix client run dev
npm --prefix client run build
```

The server now fails fast on startup if required env vars are missing (`DB_URL`, `JWT_SECRET`).

## Deployment (Render + Vercel)

### Backend deployment on Render

1. Create a Web Service from this repository root.
2. Set build command: `npm install`.
3. Set start command: `node server.js`.
4. Configure backend environment variables from `.env.example`.
5. Set CORS allowlist for transition phase (local + deployed frontend), for example:

```env
CORS_ORIGIN=http://localhost:5173,https://your-frontend-domain.vercel.app
```

6. Render logs should show degraded-mode lifecycle events when Redis is unavailable.

### Frontend deployment on Vercel

1. Create a Vercel project from this repository.
2. Set **Root Directory** to `client`.
3. Configure environment variable:

```env
VITE_API_URL=https://your-backend-domain.onrender.com
```

4. Run deployment. Vercel will use the frontend build output from `client/dist`.
5. After first deploy, add the exact Vercel frontend origin to backend `CORS_ORIGIN` and redeploy backend.

### Integration checklist

1. Verify login works from deployed frontend.
2. Verify dashboard and records requests succeed with no CORS errors in browser console.
3. Verify API requests target the deployed backend URL, not localhost.

## GitHub First Push (F0)

Initialize and commit from repository root:

```bash
git init
git branch -M main
git add .
git commit -m "Initial commit: full-stack financial system with frontend + backend"
```

Create a GitHub repository, then connect and push:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## API Endpoints (Short Format)

### Auth (Public)

- `POST /auth/register`
- `POST /auth/login`

### Records (Bearer Token Required)

- `POST /records` (create)
- `GET /records` (list)
- `GET /records/:id` (single)
- `PUT /records/:id` (update)
- `DELETE /records/:id` (soft delete)

### Stats (Bearer Token Required)

- `GET /stats/summary`
- `GET /stats/category`
- `GET /stats/monthly`

### Health (Public)

- `GET /health` (rate-limit exempt, useful for deployment probes)

### Documentation

- `GET /api-docs` (Swagger UI)
- Postman collection: `postman/Zorvyn.postman_collection.json`

## Demo Data Seeding

Seed demo users and records:

```bash
npm run seed
```

The seed script is idempotent and will skip existing demo entries to avoid duplicates.

Default seeded demo users:
- Admin: `admin.demo@example.com` / `AdminDemo123!`
- Analyst: `analyst.demo@example.com` / `AnalystDemo123!`
- Viewer: `viewer.demo@example.com` / `ViewerDemo123!`

For production databases (for example, Render free tier without shell access), run seed from your machine by pointing `DB_URL` to the production MongoDB URI:

```powershell
$env:DB_URL = "<your-production-mongodb-uri>"
$env:NODE_ENV = "production"
npm run seed
Remove-Item Env:DB_URL
Remove-Item Env:NODE_ENV
```

If you seed production with demo credentials, rotate/remove these accounts afterward.

## Role-Based Access Matrix

| Action | Viewer | Analyst | Admin |
|---|---|---|---|
| Register/Login | Yes | Yes | Yes |
| Create record (`POST /records`) | No | Yes | Yes |
| List records (`GET /records`) | Yes (own only) | Yes (all) | Yes (all) |
| Get single record (`GET /records/:id`) | Own only | Any | Any |
| Update record (`PUT /records/:id`) | No | Own only | Any |
| Delete record (`DELETE /records/:id`) | No | No | Yes |
| Stats endpoints (`/stats/*`) | Yes (own scope) | Yes (own scope) | Yes (global scope) |

## Authentication Flow

1. Register user via `POST /auth/register`.
2. Login via `POST /auth/login`.
3. Receive JWT token in response.
4. Send token in protected requests:

```http
Authorization: Bearer <token>
```

5. Token expiry is 15 minutes.
6. Common auth failures:
- `401 Missing token`
- `401 Invalid token format`
- `401 Invalid token`
- `401 Token expired`
- `403 Insufficient permissions` (role mismatch)

## Advanced Features

### RBAC

Role checks are enforced at middleware level, with operation-level ownership checks for updates.

### Idempotency

`POST /records` requires `Idempotency-Key` header.
- Same key + same payload => replay previous success response
- Same key + different payload => `409` conflict

### Redis Caching

Stats endpoints use cache-aside strategy.
- Summary/category TTL: 300s
- Monthly TTL: 900s
- Invalidated on create/update/delete record actions

### Queue (BullMQ)

Audit log events are queued to BullMQ and processed by an audit worker when Redis is available.

### In-Memory Testing

Test suite uses MongoMemoryServer for isolated, repeatable integration tests without touching local dev data.

## Testing

Run all tests:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Current suites include:
- Auth tests (success + failure)
- Records tests (success + failure + idempotency)
- RBAC matrix tests (Viewer/Analyst/Admin)

## Sample Requests (curl)

### Register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "email": "alice@example.com",
    "password": "Passw0rd!"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "Passw0rd!"
  }'
```

### Create Record (requires token + idempotency key)

```bash
curl -X POST http://localhost:3000/records \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Idempotency-Key: create-record-001" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1200.50,
    "type": "expense",
    "category": "Rent",
    "date": "2026-04-01T00:00:00.000Z",
    "note": "April rent"
  }'
```

### List Records

```bash
curl -X GET "http://localhost:3000/records?page=1&limit=20&type=expense" \
  -H "Authorization: Bearer <TOKEN>"
```

### Summary Stats

```bash
curl -X GET http://localhost:3000/stats/summary \
  -H "Authorization: Bearer <TOKEN>"
```

### Open API Docs

```bash
curl http://localhost:3000/api-docs
```

## Notes

- Record `amount` is stored as Decimal128 and returned as string in many responses.
- Deletes are soft deletes (`deleted=true`) and excluded from normal read queries.
- If Redis is unavailable and `REDIS_DEGRADED_MODE=true`, the server still runs with in-memory fallback behavior for cache/idempotency and direct audit writes.
- Validation errors are returned in the same standardized API error envelope used across the app.
