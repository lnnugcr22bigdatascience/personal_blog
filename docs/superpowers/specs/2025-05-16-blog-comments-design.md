# 博客评论系统设计规格

## 数据库

### 新建 comments 表

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

## 后端 API

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/posts/:id/comments` | 否 | 评论列表，带评论人用户名，按时间正序 |
| POST | `/api/posts/:id/comments` | 是 | 发表评论，body: `{ content }` |
| DELETE | `/api/comments/:id` | 是 | 删除评论（文章作者或评论作者可删） |

**GET 响应：**
```json
{
  "code": 0,
  "data": [{
    "id": 1,
    "content": "好文章！",
    "user_id": 2,
    "username": "reader",
    "article_id": 1,
    "created_at": "2026-05-16T..."
  }]
}
```

## 前端

### PostDetailPage 新增评论区域

- 文章正文下方展示评论列表（用户名 + 时间 + 内容）
- 已登录用户显示评论输入框 + 提交按钮
- 评论作者或文章作者可看到删除按钮，带 `window.confirm` 确认
- 发表评论后即时追加到列表
- 未登录用户看到「登录后评论」链接跳转 `/login?redirect=...`

## 类型

```typescript
interface Comment {
  id: number;
  content: string;
  user_id: number;
  username: string;
  article_id: number;
  created_at: string;
}
```
