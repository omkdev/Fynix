# Fynix

AI-powered personal finance platform (backend + frontend).

<!-- cd backend
npm install
npm run prisma:migrate
npm run start:dev -->

<!-- cd frontend
npm install
image.pngnpm run dev -->

## Prerequisites

- **Node.js** 18+
- **Supabase** (for backend database)
- **Redis** (optional; needed from Phase 5 for real-time)

---

## Quick run

### 1. Backend

```bash
cd backend
npm install
```

- Copy `backend/.env.example` → `backend/.env`
- Set `DATABASE_URL` to your Supabase pooled URL
- Set `DIRECT_URL` to your Supabase direct DB URL (for Prisma migrations)

```bash
npm run prisma:migrate
npm run start:dev
```

Backend runs at **http://localhost:3000**.

### 2. Frontend

In a **second terminal**:

```bash
cd frontend
npm install
```

- Optional: copy `frontend/.env.local.example` → `frontend/.env.local` and set `NEXT_PUBLIC_API_URL=http://localhost:3000` if the API is on another host.

```bash
npm run dev
```

Frontend runs at **http://localhost:3001** (or 3000 if free).

---

## Summary

| App      | Folder    | Command           | URL                    |
|----------|-----------|-------------------|------------------------|
| Backend  | `backend/` | `npm run start:dev` | http://localhost:3000  |
| Frontend | `frontend/` | `npm run dev`     | http://localhost:3001 |

Open the frontend URL in the browser; use “Go to Dashboard” from the home page.
