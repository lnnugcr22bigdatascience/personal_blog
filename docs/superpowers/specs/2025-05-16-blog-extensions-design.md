# 博客扩展功能设计规格

> 覆盖：文章草稿、点赞功能、文章归档

## 数据库变更

### articles 表新增字段

```sql
ALTER TABLE articles ADD COLUMN status ENUM('draft', 'published') NOT NULL DEFAULT 'published';
```

现有 article 行自动设 `published`，新文章可存为 `draft`。

### 新建 likes 表

```sql
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

UNIQUE (user_id, article_id) 保证一人对同一文章只能点赞一次。

## 后端 API 变更

### 文章 API 变更

| 变更 | 说明 |
|------|------|
| `GET /api/posts` | 默认 `status=published`；新增可选的 `?status=draft`（仅自己）+ `?month=2026-05`（归档筛选） |
| `GET /api/posts/:id` | 响应增加 `like_count` 和 `liked`（当前用户是否已点赞，需 token） |
| `POST /api/posts` | body 新增 `status?: 'draft' \| 'published'` |
| `PUT /api/posts/:id` | body 新增 `status?: 'draft' \| 'published'` |

### 归档 API

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| `GET` | `/api/posts/archives` | 否 | 返回 `[{yearMonth: "2026-05", count: 12}, ...]`，只统计 published |

### 点赞 API

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| `POST` | `/api/posts/:id/like` | 是 | 点赞，重复点赞返回 400 |
| `DELETE` | `/api/posts/:id/like` | 是 | 取消点赞 |

## 前端变更

### WritePage（修改）

- 底部两个按钮：「保存草稿」（status='draft'）和「发布」（status='published'）
- 编辑模式下根据当前 status 预设按钮提示

### PostDetailPage（修改）

- 文章信息栏增加点赞按钮：已赞 ❤️ 实色（红色），未赞 ♡ 空心
- 显示 `like_count`，点击切换点赞/取消
- 只展示 published 文章，草稿走编辑页

### HomePage（修改）

- 文章卡片增加点赞数
- 请求默认加 `status=published`

### ProfilePage（修改）

- 新增「我的草稿」区域：`GET /api/posts?status=draft`（自动使用当前用户 token）
- 草稿列表项点击跳转 `/write/:id` 编辑

### ArchivesPage（新增）

- 路由：`/archives`
- `GET /api/posts/archives` 获取数据
- 渲染按月列表，点击某月跳 `/?month=2026-05`

### Header（修改）

- 导航栏增加「归档」链接（`/archives`）

### ArticleCard（修改）

- Props 增加 `showStatus?` 可选项（草稿列表可选显示状态标签）
- 显示点赞数

## 路由更新

| 路径 | 页面 | 说明 |
|------|------|------|
| `/archives` | ArchivesPage | 新增 |

## 类型更新

```typescript
// Article 新增字段
interface Article {
  // ...existing fields
  status: 'draft' | 'published';
  like_count: number;
  liked: boolean;
}

// 新增 ArchiveMonth
interface ArchiveMonth {
  yearMonth: string;
  count: number;
}
```
