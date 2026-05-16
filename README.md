# Personal Blog System

A full-stack personal blog built with **React + Express + TypeScript + MySQL**.

[简体中文](README.zh.md)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS v4 |
| Backend | Node.js + Express + TypeScript |
| Database | MySQL 8.0 (Docker) |
| Auth | JWT + bcrypt |

## Features

- User registration & login (JWT, 7-day expiry)
- Article CRUD with Markdown editor (split-pane editing + live preview + syntax highlighting)
- Categories & tags
- Search, category filter, and monthly archives
- Draft/published status
- Like/unlike posts
- Comments
- Responsive layout

## Quick Start

### 1. Start MySQL

```bash
docker compose up -d
```

### 2. Initialize database

```bash
cp .env.example .env              # edit JWT_SECRET
npx tsx scripts/init-db.ts        # create tables
npx tsx scripts/migrate-001.ts    # drafts + likes
npx tsx scripts/migrate-002.ts    # comments
```

### 3. Start backend (port 3000)

```bash
npm install
npx tsx src/server.ts
```

### 4. Start frontend (port 5173)

```bash
cd frontend && npm install && npx vite
```

Open `http://localhost:5173`

## Project Structure

```
├── src/                  # Backend
│   ├── routes/           # Route layer
│   ├── controllers/      # Controller layer
│   ├── services/         # Business logic layer
│   ├── models/           # Data model layer
│   ├── middleware/       # JWT auth, validation, error handler
│   ├── config/           # MySQL connection pool
│   └── types/            # Shared types
├── frontend/             # Frontend
│   └── src/
│       ├── api/          # Axios client + API functions
│       ├── components/   # Shared components
│       ├── context/      # AuthContext
│       ├── pages/        # Page components
│       └── types/        # Shared types
├── scripts/              # DB migration scripts
├── docker-compose.yml    # MySQL container
└── .env.example          # Environment template
```

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Register | No |
| POST | `/api/auth/login` | Login | No |
| GET | `/api/posts` | List posts | No |
| GET | `/api/posts/archives` | Monthly archives | No |
| GET | `/api/posts/:id` | Post detail | No |
| POST | `/api/posts` | Create post | Yes |
| PUT | `/api/posts/:id` | Update post | Yes |
| DELETE | `/api/posts/:id` | Delete post | Yes |
| POST | `/api/posts/:id/like` | Like post | Yes |
| DELETE | `/api/posts/:id/like` | Unlike post | Yes |
| GET | `/api/posts/:id/comments` | List comments | No |
| POST | `/api/posts/:id/comments` | Add comment | Yes |
| DELETE | `/api/comments/:id` | Delete comment | Yes |
| GET | `/api/categories` | List categories | No |
