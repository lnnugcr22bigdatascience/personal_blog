# Blog Extensions Implementation Plan (Drafts, Likes, Archives)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add article drafts (draft/published status), likes (toggle like per user per article), and monthly archives to the blog.

**Architecture:** Extend existing articles table with a status column, add a new likes table. Backend gets new like model/service/controller, article model gets status/month/archive support and like data in JOINs. Frontend gets ArchivesPage, draft toggle in WritePage, like button in PostDetailPage, and incremental updates to HomePage/ProfilePage/Header/ArticleCard.

**Tech Stack:** Same as existing — Express + TypeScript + MySQL (backend), React + Vite + Tailwind (frontend).

---

## File Structure Map

| File | Action | Responsibility |
|------|--------|---------------|
| `scripts/migration-001.sql` | Create | ALTER articles + CREATE likes table |
| `scripts/migrate.ts` | Create | Run migration script |
| `src/models/like.model.ts` | Create | Like SQL (create, delete, exists, count) |
| `src/services/like.service.ts` | Create | Like business logic (toggle, check) |
| `src/controllers/like.controller.ts` | Create | Like request handlers |
| `src/models/article.model.ts` | Modify | Add status, month filter, archive query, like data |
| `src/services/article.service.ts` | Modify | Add status/month params, archives(), like info |
| `src/controllers/article.controller.ts` | Modify | Add status/month to list, status to create/update, archives |
| `src/routes/article.routes.ts` | Modify | Add archives route, update validation |
| `src/routes/index.ts` | Modify | Mount like routes |
| `frontend/src/types/index.ts` | Modify | Add like_count, liked, status to Article; new ArchiveMonth |
| `frontend/src/api/posts.ts` | Modify | Add getArchives, likePost, unlikePost |
| `frontend/src/components/ArticleCard.tsx` | Modify | Show like count, optional status badge |
| `frontend/src/components/Header.tsx` | Modify | Add archives link |
| `frontend/src/pages/HomePage.tsx` | Modify | status=published filter, month filter |
| `frontend/src/pages/PostDetailPage.tsx` | Modify | Like button + toggle |
| `frontend/src/pages/WritePage.tsx` | Modify | Draft/Publish buttons |
| `frontend/src/pages/ProfilePage.tsx` | Modify | My drafts section |
| `frontend/src/pages/ArchivesPage.tsx` | Create | Monthly archive list |
| `frontend/src/App.tsx` | Modify | Add /archives route |

---

### Task 1: Database Migration

- [ ] **Step 1: Create migration SQL**

Write `./scripts/migration-001.sql`:

```sql
ALTER TABLE articles ADD COLUMN status ENUM('draft', 'published') NOT NULL DEFAULT 'published';

CREATE TABLE IF NOT EXISTS likes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    article_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_article (user_id, article_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 2: Create migration script**

Write `./scripts/migrate.ts`:

```typescript
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'blog_dev',
    multipleStatements: true,
  });

  const sql = readFileSync(join(__dirname, 'migration-001.sql'), 'utf-8');
  await connection.query(sql);
  console.log('Migration 001 applied successfully.');
  await connection.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Run migration**

```bash
cd /home/magic/project/blog && npx tsx scripts/migrate.ts
```

Expected: `Migration 001 applied successfully.`

- [ ] **Step 4: Verify changes**

```bash
docker compose exec mysql mysql -h 127.0.0.1 -u root -prootpassword blog_dev -e "DESCRIBE articles; SHOW CREATE TABLE likes\G"
```

Expected: articles has `status` column; likes table exists.

- [ ] **Step 5: Commit**

```bash
cd /home/magic/project/blog && git add scripts/ && git commit -m "feat: add migration for article status and likes table"
```

---

### Task 2: Add Like Model

- [ ] **Step 1: Create like model**

Write `./src/models/like.model.ts`:

```typescript
import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export const LikeModel = {
  async create(userId: number, articleId: number): Promise<void> {
    await pool.query('INSERT INTO likes (user_id, article_id) VALUES (?, ?)', [userId, articleId]);
  },

  async delete(userId: number, articleId: number): Promise<void> {
    await pool.query('DELETE FROM likes WHERE user_id = ? AND article_id = ?', [userId, articleId]);
  },

  async exists(userId: number, articleId: number): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT 1 FROM likes WHERE user_id = ? AND article_id = ?',
      [userId, articleId]
    );
    return rows.length > 0;
  },

  async countByArticle(articleId: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM likes WHERE article_id = ?',
      [articleId]
    );
    return rows[0].count as number;
  },
};
```

- [ ] **Step 2: Create like service**

Write `./src/services/like.service.ts`:

```typescript
import { LikeModel } from '../models/like.model';
import { AppError } from '../middleware/errorHandler';

export const LikeService = {
  async like(userId: number, articleId: number) {
    const exists = await LikeModel.exists(userId, articleId);
    if (exists) {
      throw new AppError(400, 'Already liked');
    }
    await LikeModel.create(userId, articleId);
    return LikeModel.countByArticle(articleId);
  },

  async unlike(userId: number, articleId: number) {
    const exists = await LikeModel.exists(userId, articleId);
    if (!exists) {
      throw new AppError(400, 'Not liked yet');
    }
    await LikeModel.delete(userId, articleId);
    return LikeModel.countByArticle(articleId);
  },
};
```

- [ ] **Step 3: Create like controller**

Write `./src/controllers/like.controller.ts`:

```typescript
import { Response, NextFunction } from 'express';
import { LikeService } from '../services/like.service';
import { AuthRequest, ApiResponse } from '../types';

export const LikeController = {
  async like(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const articleId = Number(req.params.id);
      const count = await LikeService.like(req.userId!, articleId);
      res.json({ code: 0, message: 'Liked', data: { like_count: count } });
    } catch (err) {
      next(err);
    }
  },

  async unlike(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const articleId = Number(req.params.id);
      const count = await LikeService.unlike(req.userId!, articleId);
      res.json({ code: 0, message: 'Unliked', data: { like_count: count } });
    } catch (err) {
      next(err);
    }
  },
};
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/magic/project/blog && git add src/ && git commit -m "feat: add like model, service, and controller"
```

---

### Task 3: Update Article Model

- [ ] **Step 1: Read article model**

Read the existing file at `./src/models/article.model.ts`.

- [ ] **Step 2: Update findAll method**

Use Edit to add `status` and `month` params, and `like_count` to the SELECT.

The updated `findAll` method should:

```typescript
async findAll(params: {
  page: number;
  pageSize: number;
  category?: number;
  keyword?: string;
  status?: 'draft' | 'published';
  author_id?: number;
  month?: string; // format: "2026-05"
}): Promise<{ articles: ArticleRow[]; total: number }>
```

Add conditions for:
- `params.status`: `conditions.push('a.status = ?'); values.push(params.status);`
- `params.author_id`: `conditions.push('a.author_id = ?'); values.push(params.author_id);`
- `params.month`: `conditions.push("DATE_FORMAT(a.created_at, '%Y-%m') = ?"); values.push(params.month);`

Update SELECT to include: `a.status, COUNT(DISTINCT l.id) AS like_count`

Add: `LEFT JOIN likes l ON a.id = l.article_id`

Add: `GROUP BY a.id`

Update ORDER BY to: `ORDER BY a.created_at DESC`

- [ ] **Step 3: Update findById to include like data**

Update SELECT to include: `a.status, COUNT(DISTINCT l.id) AS like_count`
Add: `LEFT JOIN likes l ON a.id = l.article_id`
Add: `GROUP BY a.id`

- [ ] **Step 4: Add archives method**

Add to `ArticleModel`:

```typescript
async archives(): Promise<{ yearMonth: string; count: number }[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS yearMonth, COUNT(*) AS count
     FROM articles
     WHERE status = 'published'
     GROUP BY yearMonth
     ORDER BY yearMonth DESC`
  );
  return rows as { yearMonth: string; count: number }[];
}
```

- [ ] **Step 5: Update create to accept status**

Add `status?: 'draft' | 'published'` to create data. Update INSERT to include status column. Default to `'published'` if not provided.

- [ ] **Step 6: Update update to accept status**

Add `status?: 'draft' | 'published'` to update data.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd /home/magic/project/blog && git add src/ && git commit -m "feat: update article model with status, month filter, archives, and like data"
```

---

### Task 4: Update Article Service + Controller + Routes

- [ ] **Step 1: Update article service**

Read `./src/services/article.service.ts`. Update with these changes:

**list()** — add `status`, `authorId`, and `month` params. Pass through to model. Default `status` to `'published'` if not provided.

**getById()** — after fetching article, check if `reqUserId` is provided for `liked` check. Add optional `userId` param.

**create()** — add `status` param with default `'published'`.

**update()** — add `status` param.

**New: archives()** — call model.archives().

- [ ] **Step 2: Update article controller**

Read `./src/controllers/article.controller.ts`. Update:

**list()** — extract `status`, `authorId`, `month` from query params. Pass to service.

**getById()** — pass `req.userId` to service for liked check.

**create()** — extract `status` from body, default `'published'`.

**update()** — extract `status` from body.

**New: archives()** — call service.archives().

- [ ] **Step 3: Update article routes**

Read `./src/routes/article.routes.ts`.

Add: `router.get('/archives', ArticleController.archives);`

- [ ] **Step 4: Update routes index to mount like routes**

Read `./src/routes/index.ts`.

Add like controller import and mount:
```typescript
import { LikeController } from '../controllers/like.controller';
// ...
router.post('/posts/:id/like', auth, LikeController.like);
router.delete('/posts/:id/like', auth, LikeController.unlike);
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Start server and quick test**

```bash
cd /home/magic/project/blog && npx tsx src/server.ts &
sleep 2
# Test archives
curl -s http://localhost:3000/api/posts/archives
# Test like
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"testuser","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
curl -s -X POST http://localhost:3000/api/posts/1/like -H "Authorization: Bearer $TOKEN"
kill %1
```

Expected: archives returns data; like succeeds or returns 400 if already liked.

- [ ] **Step 7: Commit**

```bash
cd /home/magic/project/blog && git add src/ && git commit -m "feat: add archives, status filter, and like endpoints to article routes"
```

---

### Task 5: Update Frontend Types + API

- [ ] **Step 1: Update types**

Read `./frontend/src/types/index.ts`. Add to Article interface:

```typescript
status: 'draft' | 'published';
like_count: number;
liked: boolean;
```

Add new type:
```typescript
export interface ArchiveMonth {
  yearMonth: string;
  count: number;
}
```

- [ ] **Step 2: Update posts API**

Read `./frontend/src/api/posts.ts`. Update `getPosts` params to include `status?: string` and `month?: string`.

Add new functions:

```typescript
export async function getArchives() {
  const res = await client.get('/posts/archives');
  return res.data;
}

export async function likePost(id: number) {
  const res = await client.post(`/posts/${id}/like`);
  return res.data;
}

export async function unlikePost(id: number) {
  const res = await client.delete(`/posts/${id}/like`);
  return res.data;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/magic/project/blog && git add frontend/ && git commit -m "feat: update frontend types and API for drafts, likes, archives"
```

---

### Task 6: Update ArticleCard + Header + HomePage

- [ ] **Step 1: Update ArticleCard**

Read `./frontend/src/components/ArticleCard.tsx`. Add `showStatus` optional prop and like count display:

```typescript
interface Props {
  article: Article;
  showStatus?: boolean;
}
```

Add below views display: `<span>{article.like_count ?? 0} 赞</span>`

- [ ] **Step 2: Update Header**

Read `./frontend/src/components/Header.tsx`. Add archives link:

```typescript
<Link to="/archives" className="text-gray-600 hover:text-gray-900">归档</Link>
```

- [ ] **Step 3: Update HomePage**

Read `./frontend/src/pages/HomePage.tsx`. Changes:
- Add `month` param extracted from searchParams
- Pass `status: 'published'` to getPosts
- Pass month param

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/magic/project/blog && git add frontend/ && git commit -m "feat: update ArticleCard, Header, HomePage for likes, archives, and drafts filter"
```

---

### Task 7: Update PostDetailPage with Like Button

- [ ] **Step 1: Read PostDetailPage**

Read `./frontend/src/pages/PostDetailPage.tsx`.

- [ ] **Step 2: Add like toggle logic**

Add state: `const [liked, setLiked] = useState(false); const [likeCount, setLikeCount] = useState(0);`

After fetching article, set liked/likeCount from response data.

Add toggle handler:

```typescript
async function handleToggleLike() {
  if (!user) { navigate('/login?redirect=' + encodeURIComponent(location.pathname)); return; }
  try {
    if (liked) {
      const res = await unlikePost(article!.id);
      setLiked(false);
      setLikeCount(res.data.like_count);
    } else {
      const res = await likePost(article!.id);
      setLiked(true);
      setLikeCount(res.data.like_count);
    }
  } catch {}
}
```

- [ ] **Step 3: Add like button to the render**

Add in the article info bar:
```typescript
<button onClick={handleToggleLike} className={`text-lg ${liked ? 'text-red-500' : 'text-gray-400'} hover:text-red-500 transition-colors`}>
  {liked ? '❤️' : '🤍'} {likeCount}
</button>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/magic/project/blog && git add frontend/ && git commit -m "feat: add like button with toggle to PostDetailPage"
```

---

### Task 8: Update WritePage with Draft/Publish

- [ ] **Step 1: Read WritePage**

Read `./frontend/src/pages/WritePage.tsx`.

- [ ] **Step 2: Add status state**

Add: `const [status, setStatus] = useState<'draft' | 'published'>('published');`

In edit mode useEffect, set from loaded data: `setStatus(a.status || 'published');`

- [ ] **Step 3: Update handleSubmit**

Pass `status` in the data object.

- [ ] **Step 4: Update buttons**

Replace the single save button with two buttons:

```typescript
<div className="flex gap-3 mt-6">
  <button type="button" onClick={() => { setStatus('draft'); setTimeout(() => formRef.current?.requestSubmit(), 0); }} disabled={saving} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">
    {saving && status === 'draft' ? '保存中...' : '保存草稿'}
  </button>
  <button type="button" onClick={() => { setStatus('published'); setTimeout(() => formRef.current?.requestSubmit(), 0); }} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
    {saving && status === 'published' ? '发布中...' : '发布'}
  </button>
</div>
```

Use a form ref: `const formRef = useRef<HTMLFormElement>(null);` and add `ref={formRef}` to the form element.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /home/magic/project/blog && git add frontend/ && git commit -m "feat: add draft/publish toggle to WritePage"
```

---

### Task 9: Update ProfilePage with My Drafts

- [ ] **Step 1: Read ProfilePage**

Read `./frontend/src/pages/ProfilePage.tsx`.

- [ ] **Step 2: Add drafts section**

Below the user info card, add a "我的草稿" section:

```typescript
import { useState, useEffect } from 'react';
import { getPosts } from '../api/posts';
import { Link } from 'react-router-dom';
import type { Article } from '../types';

// Inside component:
const [drafts, setDrafts] = useState<Article[]>([]);

useEffect(() => {
  getPosts({ status: 'draft', pageSize: 50 }).then((res) => {
    if (res.code === 0) setDrafts(res.data.items);
  });
}, []);

// Below user info card:
{drafts.length > 0 && (
  <div className="mt-8">
    <h2 className="text-lg font-semibold mb-4">我的草稿</h2>
    <div className="space-y-2">
      {drafts.map((draft) => (
        <Link key={draft.id} to={`/write/${draft.id}`} className="block p-3 bg-white rounded-lg border hover:border-indigo-300">
          <span className="font-medium">{draft.title || '无标题'}</span>
          <span className="text-xs text-gray-400 ml-3">{new Date(draft.updated_at).toLocaleDateString('zh-CN')}</span>
        </Link>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/magic/project/blog && git add frontend/ && git commit -m "feat: add my drafts section to ProfilePage"
```

---

### Task 10: Create ArchivesPage + Update App.tsx

- [ ] **Step 1: Create ArchivesPage**

Write `./frontend/src/pages/ArchivesPage.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getArchives } from '../api/posts';
import type { ArchiveMonth } from '../types';

export default function ArchivesPage() {
  const [archives, setArchives] = useState<ArchiveMonth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getArchives()
      .then((res) => {
        if (res.code === 0) setArchives(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-gray-500 py-12">加载中...</p>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">文章归档</h1>
      {archives.length === 0 ? (
        <p className="text-gray-500">暂无文章</p>
      ) : (
        <div className="space-y-3">
          {archives.map((item) => {
            const [year, month] = item.yearMonth.split('-');
            return (
              <Link
                key={item.yearMonth}
                to={`/?month=${item.yearMonth}`}
                className="flex items-center justify-between p-4 bg-white rounded-lg border hover:border-indigo-300 transition-colors"
              >
                <span className="text-lg font-medium">
                  {year} 年 {Number(month)} 月
                </span>
                <span className="text-sm text-gray-500">{item.count} 篇文章</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx**

Read `./frontend/src/App.tsx`. Add import and route:

```typescript
import ArchivesPage from './pages/ArchivesPage';
// ...inside Routes:
<Route path="/archives" element={<ArchivesPage />} />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Build test**

```bash
cd /home/magic/project/blog/frontend && npx vite build 2>&1 | tail -3
```

Expected: built successfully.

- [ ] **Step 5: Commit**

```bash
cd /home/magic/project/blog && git add frontend/ && git commit -m "feat: add ArchivesPage and route"
```

---

### Task 11: End-to-End Verification

- [ ] **Step 1: Ensure MySQL is running and run migration**

```bash
docker compose ps || docker compose up -d
cd /home/magic/project/blog && npx tsx scripts/migrate.ts
```

- [ ] **Step 2: Start backend and frontend**

```bash
cd /home/magic/project/blog && npx tsx src/server.ts &
sleep 2
cd /home/magic/project/blog/frontend && npx vite &
sleep 3
```

- [ ] **Step 3: Test archives endpoint**

```bash
curl -s http://localhost:5173/api/posts/archives
```

Expected: returns monthly archive data.

- [ ] **Step 4: Test like/unlike**

```bash
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login -H "Content-Type: application/json" -d '{"username":"testuser","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# Like
curl -s -X POST "http://localhost:5173/api/posts/2/like" -H "Authorization: Bearer $TOKEN"
# Unlike
curl -s -X DELETE "http://localhost:5173/api/posts/2/like" -H "Authorization: Bearer $TOKEN"
```

Expected: like returns `{"code":0}`; unlike returns `{"code":0}`.

- [ ] **Step 5: Test draft creation**

```bash
curl -s -X POST http://localhost:5173/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Draft Post","content":"Still writing...","status":"draft"}'
```

Expected: returns 201 with `status: "draft"`.

- [ ] **Step 6: Test draft filter**

```bash
curl -s "http://localhost:5173/api/posts?status=draft" -H "Authorization: Bearer $TOKEN"
```

Expected: returns draft article.

- [ ] **Step 7: Verify published filter (drafts hidden)**

```bash
curl -s "http://localhost:5173/api/posts?status=published"
```

Expected: returns published articles only.

- [ ] **Step 8: Stop servers**

```bash
kill %1 %2 2>/dev/null
```

- [ ] **Step 9: Final commit if needed**

```bash
cd /home/magic/project/blog && git status
```
