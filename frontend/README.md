# Fynix Frontend

Next.js (App Router) + React (JavaScript) + Tailwind + Recharts. Connects to the Fynix backend API.

## Setup

1. **Install**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.local.example` to `.env.local`
   - Set `NEXT_PUBLIC_API_URL` to your backend URL (default `http://localhost:3000`)

3. **Run**
   ```bash
   npm run dev
   ```

App: [http://localhost:3001](http://localhost:3001) (Next.js default port when 3000 is in use, or 3000 if free).

## Scripts

| Script        | Description        |
|---------------|--------------------|
| `npm run dev` | Dev server + watch  |
| `npm run build` | Production build |
| `npm run start` | Run production build |

## Structure

- `app/` – App Router pages and layout
- `components/` – Reusable UI (e.g. `CategoryChart.js`)
- Backend API is called via `NEXT_PUBLIC_API_URL`; proxy/rewrites can be added in `next.config.js` if needed.
