# Zorvyn Frontend (React + Vite)

This folder contains the frontend application for Zorvyn.

## Features

- Login flow and protected routes
- Dashboard charts and summary cards
- Role-aware records management UI
- Toast-driven UX feedback and loading/error states

## Local Setup

Install dependencies:

```bash
npm install
```

Create local env file `client/.env.local`:

```env
VITE_API_URL=http://localhost:3000
```

Start development server:

```bash
npm run dev
```

## Build

```bash
npm run build
```

Build output is generated in `client/dist`.

## Production Environment Rules

- Set `VITE_API_URL` for production deployments.
- `VITE_API_URL` must use `https://` in production.
- `VITE_API_BASE_URL` is supported only as temporary compatibility fallback.

## Vercel Deployment

1. Import repository in Vercel.
2. Set Root Directory to `client`.
3. Configure environment variable:

```env
VITE_API_URL=https://your-backend-domain.onrender.com
```

4. Deploy and verify API calls are sent to the Render backend.
