# 个人博客系统

基于 **React + Express + TypeScript + MySQL** 的全栈个人博客。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS v4 |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | MySQL 8.0（Docker） |
| 认证 | JWT + bcrypt |

## 功能

- 用户注册/登录（JWT 7 天有效期）
- 文章发布/编辑/删除（Markdown 编辑器 + 实时预览 + 代码语法高亮）
- 文章分类与标签
- 文章搜索 + 分类筛选 + 月度归档
- 草稿/发布状态
- 点赞/取消点赞
- 文章评论
- 响应式布局

## 快速开始

### 1. 启动 MySQL

```bash
docker compose up -d
```

### 2. 初始化数据库

```bash
cp .env.example .env          # 编辑 JWT_SECRET
npx tsx scripts/init-db.ts    # 创建表
npx tsx scripts/migrate-001.ts # 草稿 + 点赞
npx tsx scripts/migrate-002.ts # 评论
```

### 3. 启动后端（端口 3000）

```bash
npm install
npx tsx src/server.ts
```

### 4. 启动前端（端口 5173）

```bash
cd frontend && npm install && npx vite
```

浏览器打开 `http://localhost:5173`

## 项目结构

```
├── src/                  # 后端
│   ├── routes/           # 路由层
│   ├── controllers/      # 控制器层
│   ├── services/         # 业务逻辑层
│   ├── models/           # 数据模型层
│   ├── middleware/       # 中间件（JWT、校验、错误处理）
│   ├── config/           # 数据库连接池
│   └── types/            # 类型定义
├── frontend/             # 前端
│   └── src/
│       ├── api/          # axios 封装 + API 函数
│       ├── components/   # 共享组件
│       ├── context/      # AuthContext
│       ├── pages/        # 页面组件
│       └── types/        # 类型定义
├── scripts/              # 数据库迁移脚本
├── docker-compose.yml    # MySQL 容器
└── .env.example          # 环境变量模板
```

## API 端点

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册 | 否 |
| POST | `/api/auth/login` | 登录 | 否 |
| GET | `/api/posts` | 文章列表 | 否 |
| GET | `/api/posts/archives` | 月度归档 | 否 |
| GET | `/api/posts/:id` | 文章详情 | 否 |
| POST | `/api/posts` | 创建文章 | 是 |
| PUT | `/api/posts/:id` | 更新文章 | 是 |
| DELETE | `/api/posts/:id` | 删除文章 | 是 |
| POST | `/api/posts/:id/like` | 点赞 | 是 |
| DELETE | `/api/posts/:id/like` | 取消点赞 | 是 |
| GET | `/api/posts/:id/comments` | 评论列表 | 否 |
| POST | `/api/posts/:id/comments` | 发表评论 | 是 |
| DELETE | `/api/comments/:id` | 删除评论 | 是 |
| GET | `/api/categories` | 分类列表 | 否 |
