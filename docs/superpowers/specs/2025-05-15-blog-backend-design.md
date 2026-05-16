# 个人博客系统 · 后端设计规格

## 技术栈

- 运行时：Node.js + TypeScript
- 框架：Express
- 数据库：MySQL 8.0（Docker 部署）
- 认证：JWT + bcrypt
- 数据库驱动：mysql2（连接池）

## 架构分层

采用四层结构：**routes → controllers → services → models**

| 层 | 职责 | 不做什么 |
|---|---|---|
| routes | 定义路径和 HTTP 方法，绑定中间件和控制器 | 不含任何逻辑 |
| controllers | 提取 req 参数，调用 service，格式化 res 返回 | 不含业务逻辑 |
| services | 业务规则校验，调用 model，组装数据 | 不直接操作 req/res |
| models | 封装 SQL，返回原始数据 | 不含业务判断 |

### 请求处理链路

```
请求 → 路由 → validate(middleware) → auth(middleware) → Controller → Service → Model → MySQL
```

## 项目结构

```
blog/
├── docker-compose.yml
├── .env / .env.example
├── package.json
├── tsconfig.json
├── nodemon.json
├── src/
│   ├── app.ts                  # Express 初始化 + 中间件注册
│   ├── server.ts               # 启动入口
│   ├── config/
│   │   └── database.ts         # MySQL 连接池配置（mysql2/promise）
│   ├── middleware/
│   │   ├── auth.ts             # JWT 验证，注入 userId 到 req
│   │   ├── errorHandler.ts     # 统一错误处理，返回标准化错误响应
│   │   └── validate.ts         # 请求参数校验（body + query）
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── article.model.ts
│   │   ├── category.model.ts
│   │   └── tag.model.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── article.service.ts
│   │   └── category.service.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── article.controller.ts
│   │   └── category.controller.ts
│   ├── routes/
│   │   ├── index.ts            # 聚合所有路由挂载到 /api
│   │   ├── auth.routes.ts
│   │   ├── article.routes.ts
│   │   └── category.routes.ts
│   └── types/
│       └── index.ts            # 共享类型 + Express Request 扩展
└── scripts/
    └── init-db.ts              # 初始化建表脚本
```

## API 端点

### 认证

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | 否 | 注册（username + email + password） |
| POST | `/api/auth/login` | 否 | 登录，返回 token + 用户信息 |

### 文章

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/posts` | 否 | 列表，支持 `?page=1&pageSize=10&category=3&keyword=react` |
| GET | `/api/posts/:id` | 否 | 详情，浏览次数 +1 |
| POST | `/api/posts` | 是 | 创建文章 |
| PUT | `/api/posts/:id` | 是 | 更新（仅作者） |
| DELETE | `/api/posts/:id` | 是 | 删除（仅作者） |

### 分类

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/categories` | 否 | 全部分类列表 |

## 认证设计

- JWT payload：`{ userId: number, username: string }`
- 有效期：7 天
- 请求头：`Authorization: Bearer <token>`
- auth 中间件解析 token，注入 `req.userId`——controller/service 直接使用
- 文章写操作时 service 比对 `author_id` 与 `req.userId`，不匹配返回 403

## 参数校验规则

**注册 (POST /api/auth/register)**
- username：必填，3-20 字符
- email：必填，合法邮箱格式
- password：必填，最少 6 字符

**登录 (POST /api/auth/login)**
- username：必填
- password：必填

**创建/更新文章 (POST|PUT /api/posts)**
- title：必填，最长 255 字符
- content：必填
- category_id：可选，须为有效分类 ID
- tags：可选，字符串数组
- cover：可选，合法 URL 格式

**文章列表 (GET /api/posts)**
- page：可选，正整数，默认 1
- pageSize：可选，正整数，最大 50，默认 10
- category：可选，数字
- keyword：可选，字符串

## 统一响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

错误时 code 为非零：

| code | 含义 |
|------|------|
| 400 | 参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

列表返回格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "articles": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}
```

## 数据库

基于 `database.md` 中已设计好的 4 张表：`users`、`categories`、`tags`、`articles`。
- 通过 `docker-compose.yml` 启动 MySQL 8.0
- `scripts/init-db.ts` 执行建表 SQL
- 环境变量配置连接信息（DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME）

## 开发流程

- `npm run dev`：nodemon 监听 `src/` 变更，自动重启
- `npm run build`：tsc 编译到 `dist/`
- Docker MySQL 通过 docker compose 管理
- `.env` 文件不提交，`.env.example` 作为模板提交
