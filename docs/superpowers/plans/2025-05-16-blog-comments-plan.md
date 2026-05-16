# Blog Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add flat comment system — users can comment on articles, authors (and commenters) can delete comments.

**Architecture:** New comments table, comment model/service/controller pattern (matching existing likes/categories architecture), routes under /api/posts/:id/comments, frontend comment section appended to PostDetailPage.

**Tech Stack:** Same as existing — Express + TypeScript + MySQL backend, React + Vite + Tailwind frontend.

---

## File Structure Map

| File | Action | Responsibility |
|------|--------|---------------|
| `scripts/migration-002.sql` | Create | CREATE TABLE comments |
| `src/models/comment.model.ts` | Create | Comment SQL (findByArticle, create, delete) |
| `src/services/comment.service.ts` | Create | Comment business logic (create, delete with authorization) |
| `src/controllers/comment.controller.ts` | Create | Comment request handlers |
| `src/routes/index.ts` | Modify | Mount comment routes |
| `frontend/src/api/posts.ts` | Modify | Add getComments, createComment, deleteComment |
| `frontend/src/types/index.ts` | Modify | Add Comment type |
| `frontend/src/pages/PostDetailPage.tsx` | Modify | Add comment section |

---

### Task 1: Database Migration

- [ ] **Step 1: Create migration SQL**

Write `./scripts/migration-002.sql`:

```sql
CREATE TABLE IF NOT EXISTS comments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    article_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 2: Run migration**

```bash
cd /home/magic/project/blog && npx tsx -e "
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config();
const conn = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 3306, user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'blog_dev' });
const sql = readFileSync('scripts/migration-002.sql', 'utf-8');
await conn.query(sql);
console.log('Migration 002 applied successfully.');
await conn.end();
" 2>&1
```

If the inline script is too unwieldy, write a simple `./scripts/migrate-002.ts` file:

```typescript
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

async function migrate() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'blog_dev',
  });
  const sql = readFileSync('scripts/migration-002.sql', 'utf-8');
  await c.query(sql);
  console.log('Migration 002 applied successfully.');
  await c.end();
}
migrate().catch((err) => { console.error(err); process.exit(1); });
```

Then run: `cd /home/magic/project/blog && npx tsx scripts/migrate-002.ts`

Expected: `Migration 002 applied successfully.`

- [ ] **Step 3: Verify table**

```bash
docker compose exec mysql mysql -h 127.0.0.1 -u root -prootpassword blog_dev -e "DESCRIBE comments;"
```

Expected: shows id, content, user_id, article_id, created_at columns.

- [ ] **Step 4: Commit**

```bash
cd /home/magic/project/blog && git add scripts/ && git commit -m "feat: add migration for comments table"
```

---

### Task 2: Comment Model + Service + Controller

- [ ] **Step 1: Create comment model**

Write `./src/models/comment.model.ts`:

```typescript
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface CommentRow {
  id: number;
  content: string;
  user_id: number;
  username: string;
  article_id: number;
  created_at: Date;
}

export const CommentModel = {
  async findByArticle(articleId: number): Promise<CommentRow[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, u.username
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.article_id = ?
       ORDER BY c.created_at ASC`,
      [articleId]
    );
    return rows as CommentRow[];
  },

  async create(userId: number, articleId: number, content: string): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO comments (user_id, article_id, content) VALUES (?, ?, ?)',
      [userId, articleId, content]
    );
    return result.insertId;
  },

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM comments WHERE id = ?', [id]);
  },

  async findById(id: number): Promise<CommentRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, u.username
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [id]
    );
    return (rows[0] as CommentRow) || null;
  },

  async countByArticle(articleId: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM comments WHERE article_id = ?',
      [articleId]
    );
    return rows[0].count as number;
  },
};
```

- [ ] **Step 2: Create comment service**

Write `./src/services/comment.service.ts`:

```typescript
import { CommentModel } from '../models/comment.model';
import { ArticleModel } from '../models/article.model';
import { AppError } from '../middleware/errorHandler';

export const CommentService = {
  async list(articleId: number) {
    return CommentModel.findByArticle(articleId);
  },

  async create(userId: number, articleId: number, content: string) {
    const article = await ArticleModel.findById(articleId);
    if (!article) throw new AppError(404, 'Article not found');
    const id = await CommentModel.create(userId, articleId, content);
    return CommentModel.findById(id);
  },

  async delete(commentId: number, userId: number) {
    const comment = await CommentModel.findById(commentId);
    if (!comment) throw new AppError(404, 'Comment not found');

    // Article author OR comment author can delete
    const article = await ArticleModel.findById(comment.article_id);
    if (!article) throw new AppError(404, 'Article not found');
    if (comment.user_id !== userId && article.author_id !== userId) {
      throw new AppError(403, 'You can only delete your own comments or comments on your articles');
    }

    await CommentModel.delete(commentId);
  },
};
```

- [ ] **Step 3: Create comment controller**

Write `./src/controllers/comment.controller.ts`:

```typescript
import { Response, NextFunction } from 'express';
import { CommentService } from '../services/comment.service';
import { AuthRequest, ApiResponse } from '../types';

export const CommentController = {
  async list(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const articleId = Number(req.params.id);
      const comments = await CommentService.list(articleId);
      res.json({ code: 0, message: 'success', data: comments });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const articleId = Number(req.params.id);
      const { content } = req.body;
      const comment = await CommentService.create(req.userId!, articleId, content);
      res.status(201).json({ code: 0, message: 'Comment created', data: comment });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const commentId = Number(req.params.id);
      await CommentService.delete(commentId, req.userId!);
      res.json({ code: 0, message: 'Comment deleted' });
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
cd /home/magic/project/blog && git add src/ && git commit -m "feat: add comment model, service, and controller"
```

---

### Task 3: Mount Comment Routes

- [ ] **Step 1: Read routes index**

Read `./src/routes/index.ts`.

- [ ] **Step 2: Add comment routes**

Add import:
```typescript
import { CommentController } from '../controllers/comment.controller';
```

Mount comment routes (before `export default router`):
```typescript
router.get('/posts/:id/comments', CommentController.list);
router.post('/posts/:id/comments', auth, CommentController.create);
router.delete('/comments/:id', auth, CommentController.delete);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Quick server test**

```bash
cd /home/magic/project/blog && npx tsx src/server.ts &
sleep 2
curl -s http://localhost:3000/api/posts/1/comments
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"testuser","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
curl -s -X POST "http://localhost:3000/api/posts/1/comments" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"content":"Nice article!"}'
kill %1
```

Expected: list returns empty array; create returns comment with username.

- [ ] **Step 5: Commit**

```bash
cd /home/magic/project/blog && git add src/ && git commit -m "feat: mount comment routes with list, create, delete endpoints"
```

---

### Task 4: Frontend Types + API

- [ ] **Step 1: Add Comment type**

Read `./frontend/src/types/index.ts`. Add at end:

```typescript
export interface Comment {
  id: number;
  content: string;
  user_id: number;
  username: string;
  article_id: number;
  created_at: string;
}
```

- [ ] **Step 2: Add comment API functions**

Read `./frontend/src/api/posts.ts`. Add at end:

```typescript
export async function getComments(articleId: number) {
  const res = await client.get(`/posts/${articleId}/comments`);
  return res.data;
}

export async function createComment(articleId: number, content: string) {
  const res = await client.post(`/posts/${articleId}/comments`, { content });
  return res.data;
}

export async function deleteComment(commentId: number) {
  const res = await client.delete(`/comments/${commentId}`);
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
cd /home/magic/project/blog && git add frontend/ && git commit -m "feat: add Comment type and comment API functions"
```

---

### Task 5: PostDetailPage Comment Section

- [ ] **Step 1: Read PostDetailPage**

Read `./frontend/src/pages/PostDetailPage.tsx`.

- [ ] **Step 2: Add comment state and fetch**

Add imports:
```typescript
import { getComments, createComment, deleteComment } from '../api/posts';
```

Add state (after existing state declarations):
```typescript
const [comments, setComments] = useState<Comment[]>([]);
const [commentText, setCommentText] = useState('');
const [commentSubmitting, setCommentSubmitting] = useState(false);
```

Fetch comments in the existing useEffect (where article is fetched):
```typescript
getComments(Number(id)).then((res) => {
  if (res.code === 0) setComments(res.data);
});
```

- [ ] **Step 3: Add comment handlers**

Add after handleToggleLike:
```typescript
async function handleAddComment() {
  if (!commentText.trim()) return;
  setCommentSubmitting(true);
  try {
    const res = await createComment(article!.id, commentText.trim());
    if (res.code === 0) {
      setComments([...comments, res.data]);
      setCommentText('');
    }
  } catch {
    // silently handle
  } finally {
    setCommentSubmitting(false);
  }
}

async function handleDeleteComment(commentId: number) {
  if (!window.confirm('确定删除这条评论？')) return;
  try {
    await deleteComment(commentId);
    setComments(comments.filter((c) => c.id !== commentId));
  } catch {
    // silently handle
  }
}
```

Add Comment import to types import.

- [ ] **Step 4: Add comment section in render**

After the closing `</div>` of the prose div (Markdown content), add:

```typescript
{/* Comments section */}
<div className="mt-12 border-t pt-8">
  <h2 className="text-xl font-bold mb-6">评论 ({comments.length})</h2>

  {/* Comment form */}
  {user ? (
    <div className="mb-8">
      <textarea
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="写下你的评论..."
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y min-h-20"
        rows={3}
      />
      <button
        onClick={handleAddComment}
        disabled={commentSubmitting || !commentText.trim()}
        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
      >
        {commentSubmitting ? '提交中...' : '发表评论'}
      </button>
    </div>
  ) : (
    <p className="mb-8 text-sm text-gray-500">
      <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} className="text-indigo-600 hover:underline">
        登录
      </Link>
      后发表评论
    </p>
  )}

  {/* Comment list */}
  {comments.length === 0 ? (
    <p className="text-gray-400 text-sm">暂无评论，来写第一条吧</p>
  ) : (
    <div className="space-y-4">
      {comments.map((c) => (
        <div key={c.id} className="p-4 bg-white rounded-lg border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-gray-900">{c.username}</span>
              <span className="text-xs text-gray-400">
                {new Date(c.created_at).toLocaleDateString('zh-CN')} {new Date(c.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {(user?.id === c.user_id || user?.id === article?.author_id) && (
              <button
                onClick={() => handleDeleteComment(c.id)}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                删除
              </button>
            )}
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
        </div>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Build test**

```bash
cd /home/magic/project/blog/frontend && npx vite build 2>&1 | tail -3
```

Expected: build success.

- [ ] **Step 7: Commit**

```bash
cd /home/magic/project/blog && git add frontend/ && git commit -m "feat: add comment section to PostDetailPage"
```

---

### Task 6: End-to-End Verification

- [ ] **Step 1: Ensure MySQL is running and run migration**

```bash
docker compose ps || docker compose up -d
cd /home/magic/project/blog && npx tsx scripts/migrate-002.ts
```

- [ ] **Step 2: Start backend and frontend**

```bash
cd /home/magic/project/blog && npx tsx src/server.ts &
sleep 2
cd /home/magic/project/blog/frontend && npx vite &
sleep 3
```

- [ ] **Step 3: Test comment flow via backend API**

```bash
# Get comments (empty)
curl -s http://localhost:3000/api/posts/1/comments

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"testuser","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# Create comment
curl -s -X POST "http://localhost:3000/api/posts/1/comments" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"content":"Great post!"}'

# Get comments (should have 1)
curl -s http://localhost:3000/api/posts/1/comments

# Delete comment
curl -s -X DELETE "http://localhost:3000/api/comments/1" -H "Authorization: Bearer $TOKEN"

# Verify deleted
curl -s http://localhost:3000/api/posts/1/comments
```

Expected: create returns comment with username; list shows comments; delete succeeds.

- [ ] **Step 4: Test via frontend proxy**

```bash
curl -s http://localhost:5173/api/posts/1/comments
```

Expected: same result as direct backend call.

- [ ] **Step 5: Frontend build test**

```bash
cd /home/magic/project/blog/frontend && npx vite build 2>&1 | tail -3
```

Expected: successful build.

- [ ] **Step 6: Stop servers**

```bash
kill %1 %2 2>/dev/null
```

- [ ] **Step 7: Final commit if needed**

```bash
cd /home/magic/project/blog && git status
```
