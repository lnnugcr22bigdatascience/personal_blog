# Blog Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the blog backend — user auth (JWT) + article CRUD (with categories, tags, pagination, search) on Express + TypeScript + MySQL.

**Architecture:** Four-layer: routes → controllers → services → models. Controllers extract params and format responses. Services hold business logic. Models encapsulate SQL. Middleware handles JWT auth, param validation, and error formatting.

**Tech Stack:** Node.js 24, TypeScript, Express, mysql2/promise, jsonwebtoken, bcrypt, dotenv, Docker MySQL 8.0, tsx, nodemon.

---

## File Structure Map

Each file has one responsibility:

| File | Responsibility |
|---|---|
| `src/types/index.ts` | Shared TS types, `AuthRequest` extension of Express Request |
| `src/config/database.ts` | MySQL connection pool from env vars |
| `src/middleware/errorHandler.ts` | `AppError` class + Express error handler |
| `src/middleware/validate.ts` | Request body/query validation middleware factory |
| `src/middleware/auth.ts` | JWT verification, injects `userId` onto request |
| `src/models/user.model.ts` | SQL for users table (find, create) |
| `src/models/article.model.ts` | SQL for articles table (CRUD, list with JOIN) |
| `src/models/category.model.ts` | SQL for categories table (list, find by id) |
| `src/models/tag.model.ts` | SQL for tags table (list, find by name, create) |
| `src/services/auth.service.ts` | Register/login logic: uniqueness check, bcrypt hash, JWT sign |
| `src/services/article.service.ts` | Article CRUD: ownership check, view increment, tag sync |
| `src/services/category.service.ts` | Category listing |
| `src/controllers/auth.controller.ts` | Extract body → auth service → send response |
| `src/controllers/article.controller.ts` | Extract params/body → article service → send response |
| `src/controllers/category.controller.ts` | Extract params → category service → send response |
| `src/routes/auth.routes.ts` | POST /register, POST /login with validation |
| `src/routes/article.routes.ts` | CRUD /posts with auth + validation |
| `src/routes/category.routes.ts` | GET /categories |
| `src/routes/index.ts` | Aggregates all route files under /api |
| `src/app.ts` | Creates Express app, registers global middleware + routes |
| `src/server.ts` | Loads dotenv, calls app.listen |
| `scripts/init-db.ts` | Creates database + tables from env config |
| `scripts/schema.sql` | Raw CREATE TABLE statements |
| `docker-compose.yml` | MySQL 8.0 container |
| `.env` / `.env.example` | DB + JWT config |
| `tsconfig.json` | TypeScript compiler config |
| `nodemon.json` | Dev auto-restart config |

---

### Task 1: Initialize Project

- [ ] **Step 1: Initialize git**

```bash
cd /home/magic/project/blog && git init
```

- [ ] **Step 2: Create .gitignore**

Write `./.gitignore`:

```
node_modules/
dist/
.env
```

- [ ] **Step 3: Initialize npm and install dependencies**

```bash
cd /home/magic/project/blog && npm init -y
```

```bash
cd /home/magic/project/blog && npm install express mysql2 jsonwebtoken bcrypt dotenv
```

```bash
cd /home/magic/project/blog && npm install -D typescript @types/node @types/express @types/bcrypt @types/jsonwebtoken tsx nodemon
```

- [ ] **Step 4: Create tsconfig.json**

Write `./tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Create nodemon.json**

Write `./nodemon.json`:

```json
{
  "watch": ["src"],
  "ext": "ts,json",
  "exec": "tsx src/server.ts"
}
```

- [ ] **Step 6: Update package.json scripts**

Read `./package.json`, replace the `"scripts"` block with:

```json
"scripts": {
  "dev": "nodemon",
  "build": "tsc",
  "start": "node dist/server.js",
  "db:init": "tsx scripts/init-db.ts"
}
```

- [ ] **Step 7: Create .env.example**

Write `./.env.example`:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=blog_dev
JWT_SECRET=change-me-to-a-random-string
PORT=3000
```

- [ ] **Step 8: Create .env**

Write `./.env` (same content as .env.example for local dev):

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=blog_dev
JWT_SECRET=dev-secret-change-in-production
PORT=3000
```

- [ ] **Step 9: Create directory structure**

```bash
mkdir -p /home/magic/project/blog/src/{config,middleware,models,services,controllers,routes,types}
mkdir -p /home/magic/project/blog/scripts
```

- [ ] **Step 10: Commit**

```bash
cd /home/magic/project/blog && git add -A && git commit -m "feat: initialize project with TypeScript, Express, and build tooling"
```

---

### Task 2: Docker MySQL Setup

- [ ] **Step 1: Create docker-compose.yml**

Write `./docker-compose.yml`:

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    container_name: blog-mysql
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

- [ ] **Step 2: Start MySQL**

```bash
cd /home/magic/project/blog && docker compose up -d
```

Wait for MySQL to be ready (~15s):

```bash
sleep 15 && docker compose exec mysql mysqladmin ping -h localhost -u root -prootpassword
```

Expected: `mysqld is alive`

- [ ] **Step 3: Commit**

```bash
cd /home/magic/project/blog && git add docker-compose.yml && git commit -m "feat: add Docker MySQL 8.0 setup"
```

---

### Task 3: Core Infrastructure (Types, Database Config, Error Handler)

- [ ] **Step 1: Create shared types**

Write `./src/types/index.ts`:

```typescript
import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: number;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

- [ ] **Step 2: Create database config**

Write `./src/config/database.ts`:

```typescript
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'blog_dev',
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;
```

- [ ] **Step 3: Create error handler middleware**

Write `./src/middleware/errorHandler.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      code: err.statusCode,
      message: err.message,
    });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    code: 500,
    message: 'Internal server error',
  });
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/magic/project/blog && git add src/ && git commit -m "feat: add types, database config, and error handler middleware"
```

---

### Task 4: Database Init Script

- [ ] **Step 1: Create schema SQL file**

Write `./scripts/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tags (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS articles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    cover VARCHAR(255) DEFAULT NULL,
    category_id INT UNSIGNED DEFAULT NULL,
    tags JSON DEFAULT NULL,
    author_id INT UNSIGNED NOT NULL,
    views INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_author (author_id),
    INDEX idx_category (category_id),
    FOREIGN KEY (author_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 2: Create init-db script**

Write `./scripts/init-db.ts`:

```typescript
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

async function initDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  const dbName = process.env.DB_NAME || 'blog_dev';
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.query(`USE \`${dbName}\``);

  const schemaPath = join(__dirname, 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf-8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await connection.query(stmt);
  }

  console.log(`Database "${dbName}" initialized successfully.`);
  await connection.end();
}

initDb().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Run init script**

```bash
cd /home/magic/project/blog && npx tsx scripts/init-db.ts
```

Expected: `Database "blog_dev" initialized successfully.`

- [ ] **Step 4: Verify tables exist**

```bash
docker compose exec mysql mysql -u root -prootpassword blog_dev -e "SHOW TABLES;"
```

Expected: lists `articles, categories, tags, users`.

- [ ] **Step 5: Commit**

```bash
cd /home/magic/project/blog && git add scripts/ && git commit -m "feat: add database init script and schema SQL"
```

---

### Task 5: User Model + Auth Service + Auth Routes

- [ ] **Step 1: Create user model**

Write `./src/models/user.model.ts`:

```typescript
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface UserRow {
  id: number;
  username: string;
  email: string;
  password: string;
  avatar: string | null;
  created_at: Date;
  updated_at: Date;
}

export const UserModel = {
  async findById(id: number): Promise<UserRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return (rows[0] as UserRow) || null;
  },

  async findByUsername(username: string): Promise<UserRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return (rows[0] as UserRow) || null;
  },

  async findByEmail(email: string): Promise<UserRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return (rows[0] as UserRow) || null;
  },

  async create(data: { username: string; email: string; password: string }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [data.username, data.email, data.password]
    );
    return result.insertId;
  },
};
```

- [ ] **Step 2: Create auth service**

Write `./src/services/auth.service.ts`:

```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model';
import { AppError } from '../middleware/errorHandler';

export const AuthService = {
  async register(username: string, email: string, password: string) {
    const existingUser = await UserModel.findByUsername(username);
    if (existingUser) {
      throw new AppError(400, 'Username already exists');
    }

    const existingEmail = await UserModel.findByEmail(email);
    if (existingEmail) {
      throw new AppError(400, 'Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await UserModel.create({ username, email, password: hashedPassword });

    return { id: userId, username, email };
  },

  async login(username: string, password: string) {
    const user = await UserModel.findByUsername(username);
    if (!user) {
      throw new AppError(401, 'Invalid username or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError(401, 'Invalid username or password');
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    };
  },
};
```

- [ ] **Step 3: Create validate middleware**

Write `./src/middleware/validate.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

interface Rule {
  field: string;
  in: 'body' | 'query';
  required?: boolean;
  type?: 'string' | 'number';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  message?: string;
}

export function validate(rules: Rule[]) {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
    for (const rule of rules) {
      const source = rule.in === 'body' ? req.body : req.query;
      const value = source[rule.field];

      if (value === undefined || value === '' || value === null) {
        if (rule.required) {
          res.status(400).json({ code: 400, message: rule.message || `${rule.field} is required` });
          return;
        }
        continue;
      }

      if (rule.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          res.status(400).json({ code: 400, message: `${rule.field} must be a number` });
          return;
        }
        source[rule.field] = num;
      }

      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          res.status(400).json({
            code: 400,
            message: rule.message || `${rule.field} must be at least ${rule.minLength} characters`,
          });
          return;
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          res.status(400).json({
            code: 400,
            message: rule.message || `${rule.field} must be at most ${rule.maxLength} characters`,
          });
          return;
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          res.status(400).json({ code: 400, message: rule.message || `${rule.field} format is invalid` });
          return;
        }
      }
    }
    next();
  };
}
```

- [ ] **Step 4: Create auth middleware**

Write `./src/middleware/auth.ts`:

```typescript
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import { ApiResponse } from '../types';

interface TokenPayload {
  userId: number;
  username: string;
}

export function auth(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ code: 401, message: 'Authentication required' });
    return;
  }

  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ code: 401, message: 'Invalid or expired token' });
  }
}
```

- [ ] **Step 5: Create auth controller**

Write `./src/controllers/auth.controller.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../types';

export const AuthController = {
  async register(req: Request, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { username, email, password } = req.body;
      const user = await AuthService.register(username, email, password);
      res.status(201).json({ code: 0, message: 'Registration successful', data: user });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { username, password } = req.body;
      const result = await AuthService.login(username, password);
      res.json({ code: 0, message: 'success', data: result });
    } catch (err) {
      next(err);
    }
  },
};
```

- [ ] **Step 6: Create auth routes**

Write `./src/routes/auth.routes.ts`:

```typescript
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';

const router = Router();

router.post(
  '/register',
  validate([
    { field: 'username', in: 'body', required: true, minLength: 3, maxLength: 20 },
    { field: 'email', in: 'body', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' },
    { field: 'password', in: 'body', required: true, minLength: 6 },
  ]),
  AuthController.register
);

router.post(
  '/login',
  validate([
    { field: 'username', in: 'body', required: true },
    { field: 'password', in: 'body', required: true },
  ]),
  AuthController.login
);

export default router;
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd /home/magic/project/blog && git add src/ && git commit -m "feat: implement user registration and login with JWT auth"
```

---

### Task 6: Article CRUD

- [ ] **Step 1: Create article model**

Write `./src/models/article.model.ts`:

```typescript
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface ArticleRow {
  id: number;
  title: string;
  content: string;
  cover: string | null;
  category_id: number | null;
  tags: string[] | null;
  author_id: number;
  views: number;
  created_at: Date;
  updated_at: Date;
  author_name?: string;
  category_name?: string;
}

export const ArticleModel = {
  async findAll(params: {
    page: number;
    pageSize: number;
    category?: number;
    keyword?: string;
  }): Promise<{ articles: ArticleRow[]; total: number }> {
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.category) {
      conditions.push('a.category_id = ?');
      values.push(params.category);
    }

    if (params.keyword) {
      conditions.push('(a.title LIKE ? OR a.content LIKE ?)');
      values.push(`%${params.keyword}%`, `%${params.keyword}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM articles a ${where}`,
      values
    );
    const total = countRows[0].total as number;

    const offset = (params.page - 1) * params.pageSize;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, u.username AS author_name, c.name AS category_name
       FROM articles a
       JOIN users u ON a.author_id = u.id
       LEFT JOIN categories c ON a.category_id = c.id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, params.pageSize, offset]
    );

    return { articles: rows as ArticleRow[], total };
  },

  async findById(id: number): Promise<ArticleRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, u.username AS author_name, c.name AS category_name
       FROM articles a
       JOIN users u ON a.author_id = u.id
       LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.id = ?`,
      [id]
    );
    return (rows[0] as ArticleRow) || null;
  },

  async create(data: {
    title: string;
    content: string;
    cover?: string;
    category_id?: number;
    tags?: string[];
    author_id: number;
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO articles (title, content, cover, category_id, tags, author_id) VALUES (?, ?, ?, ?, ?, ?)',
      [data.title, data.content, data.cover || null, data.category_id || null, JSON.stringify(data.tags || []), data.author_id]
    );
    return result.insertId;
  },

  async update(
    id: number,
    data: { title?: string; content?: string; cover?: string; category_id?: number; tags?: string[] }
  ): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content); }
    if (data.cover !== undefined) { fields.push('cover = ?'); values.push(data.cover); }
    if (data.category_id !== undefined) { fields.push('category_id = ?'); values.push(data.category_id); }
    if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE articles SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM articles WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  async incrementViews(id: number): Promise<void> {
    await pool.query('UPDATE articles SET views = views + 1 WHERE id = ?', [id]);
  },
};
```

- [ ] **Step 2: Create article service**

Write `./src/services/article.service.ts`:

```typescript
import { ArticleModel } from '../models/article.model';
import { AppError } from '../middleware/errorHandler';

export const ArticleService = {
  async list(params: { page: number; pageSize: number; category?: number; keyword?: string }) {
    const { articles, total } = await ArticleModel.findAll(params);
    return {
      items: articles,
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  },

  async getById(id: number) {
    const article = await ArticleModel.findById(id);
    if (!article) {
      throw new AppError(404, 'Article not found');
    }
    await ArticleModel.incrementViews(id);
    article.views += 1;
    return article;
  },

  async create(data: {
    title: string;
    content: string;
    cover?: string;
    category_id?: number;
    tags?: string[];
    author_id: number;
  }) {
    const id = await ArticleModel.create(data);
    return ArticleModel.findById(id);
  },

  async update(
    id: number,
    userId: number,
    data: { title?: string; content?: string; cover?: string; category_id?: number; tags?: string[] }
  ) {
    const article = await ArticleModel.findById(id);
    if (!article) {
      throw new AppError(404, 'Article not found');
    }
    if (article.author_id !== userId) {
      throw new AppError(403, 'You can only edit your own articles');
    }
    await ArticleModel.update(id, data);
    return ArticleModel.findById(id);
  },

  async delete(id: number, userId: number) {
    const article = await ArticleModel.findById(id);
    if (!article) {
      throw new AppError(404, 'Article not found');
    }
    if (article.author_id !== userId) {
      throw new AppError(403, 'You can only delete your own articles');
    }
    await ArticleModel.delete(id);
  },
};
```

- [ ] **Step 3: Create article controller**

Write `./src/controllers/article.controller.ts`:

```typescript
import { Response, NextFunction } from 'express';
import { ArticleService } from '../services/article.service';
import { AuthRequest, ApiResponse } from '../types';

export const ArticleController = {
  async list(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Math.min(Number(req.query.pageSize) || 10, 50);
      const category = req.query.category ? Number(req.query.category) : undefined;
      const keyword = req.query.keyword as string | undefined;

      const data = await ArticleService.list({ page, pageSize, category, keyword });
      res.json({ code: 0, message: 'success', data });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const article = await ArticleService.getById(id);
      res.json({ code: 0, message: 'success', data: article });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { title, content, cover, category_id, tags } = req.body;
      const article = await ArticleService.create({
        title,
        content,
        cover,
        category_id,
        tags,
        author_id: req.userId!,
      });
      res.status(201).json({ code: 0, message: 'Article created', data: article });
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const { title, content, cover, category_id, tags } = req.body;
      const article = await ArticleService.update(id, req.userId!, { title, content, cover, category_id, tags });
      res.json({ code: 0, message: 'Article updated', data: article });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      await ArticleService.delete(id, req.userId!);
      res.json({ code: 0, message: 'Article deleted' });
    } catch (err) {
      next(err);
    }
  },
};
```

- [ ] **Step 4: Create article routes**

Write `./src/routes/article.routes.ts`:

```typescript
import { Router } from 'express';
import { ArticleController } from '../controllers/article.controller';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.get(
  '/',
  validate([
    { field: 'page', in: 'query', type: 'number' },
    { field: 'pageSize', in: 'query', type: 'number' },
    { field: 'category', in: 'query', type: 'number' },
  ]),
  ArticleController.list
);

router.get('/:id', ArticleController.getById);

router.post(
  '/',
  auth,
  validate([
    { field: 'title', in: 'body', required: true, maxLength: 255 },
    { field: 'content', in: 'body', required: true },
  ]),
  ArticleController.create
);

router.put(
  '/:id',
  auth,
  validate([
    { field: 'title', in: 'body', maxLength: 255 },
  ]),
  ArticleController.update
);

router.delete('/:id', auth, ArticleController.delete);

export default router;
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /home/magic/project/blog && git add src/ && git commit -m "feat: implement article CRUD with pagination, search, and category filter"
```

---

### Task 7: Categories + Tags

- [ ] **Step 1: Create category model**

Write `./src/models/category.model.ts`:

```typescript
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export interface CategoryRow {
  id: number;
  name: string;
  description: string | null;
  created_at: Date;
}

export const CategoryModel = {
  async findAll(): Promise<CategoryRow[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categories ORDER BY id ASC'
    );
    return rows as CategoryRow[];
  },

  async findById(id: number): Promise<CategoryRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    return (rows[0] as CategoryRow) || null;
  },
};
```

- [ ] **Step 2: Create tag model**

Write `./src/models/tag.model.ts`:

```typescript
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface TagRow {
  id: number;
  name: string;
  created_at: Date;
}

export const TagModel = {
  async findAll(): Promise<TagRow[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tags ORDER BY name ASC'
    );
    return rows as TagRow[];
  },

  async findByName(name: string): Promise<TagRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tags WHERE name = ?',
      [name]
    );
    return (rows[0] as TagRow) || null;
  },

  async create(name: string): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO tags (name) VALUES (?)',
      [name]
    );
    return result.insertId;
  },
};
```

- [ ] **Step 3: Create category service**

Write `./src/services/category.service.ts`:

```typescript
import { CategoryModel } from '../models/category.model';

export const CategoryService = {
  async list() {
    return CategoryModel.findAll();
  },
};
```

- [ ] **Step 4: Create category controller**

Write `./src/controllers/category.controller.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { ApiResponse } from '../types';

export const CategoryController = {
  async list(_req: Request, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const categories = await CategoryService.list();
      res.json({ code: 0, message: 'success', data: categories });
    } catch (err) {
      next(err);
    }
  },
};
```

- [ ] **Step 5: Create category routes**

Write `./src/routes/category.routes.ts`:

```typescript
import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';

const router = Router();

router.get('/', CategoryController.list);

export default router;
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /home/magic/project/blog && git add src/ && git commit -m "feat: add categories and tags models with list endpoints"
```

---

### Task 8: App Assembly and Server Entry

- [ ] **Step 1: Create routes index (aggregator)**

Write `./src/routes/index.ts`:

```typescript
import { Router } from 'express';
import authRoutes from './auth.routes';
import articleRoutes from './article.routes';
import categoryRoutes from './category.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/posts', articleRoutes);
router.use('/categories', categoryRoutes);

export default router;
```

- [ ] **Step 2: Create app.ts**

Write `./src/app.ts`:

```typescript
import express from 'express';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json());

app.use('/api', routes);

app.use(errorHandler);

export default app;
```

- [ ] **Step 3: Create server.ts**

Write `./src/server.ts`:

```typescript
import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

- [ ] **Step 4: Verify TypeScript compiles and server starts**

```bash
cd /home/magic/project/blog && npx tsc --noEmit
```

Expected: no errors.

```bash
cd /home/magic/project/blog && npx tsx src/server.ts &
sleep 2
curl -s http://localhost:3000/api/categories | head -c 200
kill %1
```

Expected: `{"code":0,"message":"success","data":[]}`

- [ ] **Step 5: Commit**

```bash
cd /home/magic/project/blog && git add src/ && git commit -m "feat: wire up Express app, route aggregator, and server entry point"
```

---

### Task 9: End-to-End Verification

- [ ] **Step 1: Ensure MySQL is running**

```bash
docker compose ps
```

Expected: `blog-mysql` status is `Up` or `running`. If not: `docker compose up -d`.

- [ ] **Step 2: Re-initialize database (clean slate)**

```bash
cd /home/magic/project/blog && npx tsx scripts/init-db.ts
```

Expected: `Database "blog_dev" initialized successfully.`

- [ ] **Step 3: Start server in background**

```bash
cd /home/magic/project/blog && npx tsx src/server.ts &
sleep 2
```

- [ ] **Step 4: Test user registration**

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"123456"}' | python3 -m json.tool
```

Expected: 201 with `{ "code": 0, "message": "Registration successful", "data": { "id": 1, "username": "testuser", "email": "test@example.com" } }`

- [ ] **Step 5: Test duplicate registration (error case)**

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"123456"}'
```

Expected: 400 with `"Username already exists"`

- [ ] **Step 6: Test validation error**

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"ab","email":"bad","password":"12"}'
```

Expected: 400 with validation error message

- [ ] **Step 7: Test login**

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
echo "Token: ${TOKEN:0:20}..."
```

Expected: prints a JWT token prefix.

- [ ] **Step 8: Test create article (authenticated)**

```bash
curl -s -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"First Post","content":"Hello **Markdown**!","tags":["hello","world"]}' | python3 -m json.tool
```

Expected: 201 with article data including `author_name: "testuser"`

- [ ] **Step 9: Test get article list**

```bash
curl -s http://localhost:3000/api/posts | python3 -m json.tool
```

Expected: 200 with `{ "code": 0, "data": { "items": [...], "total": 1, "page": 1, "pageSize": 10 } }`

- [ ] **Step 10: Test get article detail**

```bash
curl -s http://localhost:3000/api/posts/1 | python3 -m json.tool
```

Expected: 200 with article data, `views: 1`

- [ ] **Step 11: Test update article**

```bash
curl -s -X PUT http://localhost:3000/api/posts/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Updated Title"}' | python3 -m json.tool
```

Expected: 200 with updated title.

- [ ] **Step 12: Test unauthorized access**

```bash
curl -s -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"No Auth","content":"test"}'
```

Expected: 401 with `"Authentication required"`

- [ ] **Step 13: Test search**

```bash
curl -s "http://localhost:3000/api/posts?keyword=Markdown" | python3 -m json.tool
```

Expected: 200 with 1 result matching.

- [ ] **Step 14: Test delete article**

```bash
curl -s -X DELETE http://localhost:3000/api/posts/1 \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: 200 with `"Article deleted"`

- [ ] **Step 15: Stop server**

```bash
kill %1
```

- [ ] **Step 16: Commit if any fixes were made during verification**

```bash
cd /home/magic/project/blog && git status
```
