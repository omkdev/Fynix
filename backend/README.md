# Fynix Backend

AI-powered personal finance platform API. NestJS (JavaScript) + Prisma + Supabase.

## Prerequisites

- Node.js 18+
- Supabase project (Postgres database)
- Redis (for Phase 5+)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` to your Supabase pooled Postgres URL
   - Set `DIRECT_URL` to your Supabase direct Postgres URL (for Prisma migrations)

3. **Database**
   ```bash
   npm run prisma:migrate
   ```

4. **Run**
   ```bash
   npm run start:dev
   ```

API base: `http://localhost:3000` (or `PORT` from `.env`).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start with watch |
| `npm run build` | Build to `dist/` |
| `npm run start:prod` | Run built app |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run migrations (dev) |
| `npm run prisma:studio` | Open Prisma Studio |

## Structure

```
src/
├── auth/
├── users/
├── expenses/
├── subscriptions/
├── ai/
├── analytics/
├── notifications/
├── events/
├── common/
├── app.module.js
└── main.js
```

- **Controllers**: HTTP only  
- **Services**: Business logic  
- **Repositories**: DB access  
- **DTOs**: Validation  

## Troubleshooting

**`npm warn Unknown env config "devdir"`**  
This comes from your global npm config, not this project. Remove it:

```bash
npm config delete devdir
```

If it persists, check for `devdir` or `NPM_CONFIG_DEVDIR` in your user `.npmrc` (e.g. `~/.npmrc` or `%USERPROFILE%\.npmrc`) or environment variables and remove/unset it.
