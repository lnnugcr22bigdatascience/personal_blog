# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Database
docker compose up -d                              # Start MySQL
npx tsx scripts/init-db.ts                        # Create tables (first run)
npx tsx scripts/migrate-001.ts                    # Migration: drafts + likes
npx tsx scripts/migrate-002.ts                    # Migration: comments

# Backend (root)
npm run dev                                       # Start with nodemon + tsx (port 3000)
npx tsx src/server.ts                             # Start without watch
npx tsc --noEmit                                  # Type-check

# Frontend (frontend/)
cd frontend && npm run dev                        # Vite dev server (port 5173)
cd frontend && npm run build                      # Production build
cd frontend && npx tsc --noEmit                   # Type-check
```

Both servers must run simultaneously for full-stack dev. The Vite dev server proxies `/api` to the backend.

## Architecture

### Backend: four layers (Express + TypeScript + CommonJS)

```
routes → controllers → services → models → MySQL (mysql2/promise pool)
```

- **controllers** — extract params from `req`, call service, send `{ code, message, data }` response. Throw nothing; forward errors via `next(err)`.
- **services** — all business logic. Throw `AppError(statusCode, message)` for expected errors (400/401/403/404). Unexpected errors become 500 via `errorHandler`.
- **models** — raw SQL via parameterized queries. Return plain data objects. No business logic.
- **middleware** — `auth.ts` verifies JWT and sets `req.userId`; `validate.ts` validates body/query fields; `errorHandler.ts` catches all errors and formats response.

`src/routes/index.ts` is the single route aggregator. New features follow the same layers (see like/comment modules).

### Frontend: flat directory (React + Vite + Tailwind v4)

```
pages → api functions → axios client (with Bearer token interceptor) → /api proxy → backend
```

- **AuthContext** wraps the app, persists token/user to `localStorage`, restores on mount.
- **ProtectedRoute** checks `user` from context, redirects to `/login?redirect=<path>`.
- **pages** manage their own data with `useState`/`useEffect` — no global store.
- **Tailwind v4** uses `@import "tailwindcss"` in `index.css` with `@plugin "@tailwindcss/typography"`. The `@tailwindcss/vite` plugin handles CSS generation.

### API Response Format

```typescript
{ code: 0, message: "success", data: T }        // success (code 0)
{ code: 400, message: "error description" }      // error (non-zero)
```

Paginated lists wrap in `{ items, total, page, pageSize }`.
`GET /api/posts` accepts `?page=1&pageSize=10&category=3&keyword=react&status=published&month=2026-05`.

### Database

Six tables: `users`, `categories`, `tags`, `articles`, `likes`, `comments`. MySQL runs in Docker (`docker-compose.yml`), connecting on port 3306. The mysql2 pool in `src/config/database.ts` uses `charset: 'utf8mb4'`. Schema files in `scripts/` and migration scripts use `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE`.
