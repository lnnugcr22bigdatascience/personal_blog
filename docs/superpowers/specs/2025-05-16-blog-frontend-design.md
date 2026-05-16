# 个人博客系统 · 前端设计规格

## 技术栈

- 框架：React 18 + TypeScript
- 构建：Vite
- 样式：Tailwind CSS
- 路由：react-router-dom v6
- HTTP：axios
- Markdown：react-markdown + react-syntax-highlighter
- 后端 API：localhost:3000（已就绪）

## 架构

采用扁平目录 + Context 模式：

```
src/
├── api/
│   └── client.ts          # axios 实例（baseURL, Bearer 注入）
│   └── auth.ts            # login(), register()
│   └── posts.ts           # getPosts(), getPost(), createPost(), updatePost(), deletePost()
│   └── categories.ts      # getCategories()
├── components/
│   ├── Header.tsx          # 导航栏：Logo、首页、分类、写文章、登录/用户
│   ├── ArticleCard.tsx     # 文章卡片（封面、标题、分类、作者、时间、浏览数）
│   ├── Pagination.tsx      # 分页器（上一页/下一页/页码）
│   ├── ProtectedRoute.tsx  # 认证守卫，未登录重定向 /login
│   └── MarkdownEditor.tsx  # 左编辑 + 右预览组件
├── context/
│   └── AuthContext.tsx      # { user, token, login, logout, register, loading }
├── pages/
│   ├── HomePage.tsx         # 文章列表（搜索 + 分类筛选 + 分页）
│   ├── PostDetailPage.tsx   # 文章详情（Markdown 渲染）
│   ├── WritePage.tsx        # 写文章/编辑文章
│   ├── LoginPage.tsx        # 登录表单
│   ├── RegisterPage.tsx     # 注册表单
│   └── ProfilePage.tsx      # 个人中心
├── types/
│   └── index.ts             # User, Article, PaginatedResponse 等类型
├── App.tsx
└── main.tsx
```

## 路由

| 路径 | 页面 | 认证 | 说明 |
|------|------|------|------|
| `/` | HomePage | 否 | 文章列表，搜索+分类+分页 |
| `/post/:id` | PostDetailPage | 否 | 文章详情，Markdown 渲染 |
| `/write` | WritePage | 是 | 新建文章 |
| `/write/:id` | WritePage | 是 | 编辑已有文章 |
| `/login` | LoginPage | 否 | 登录 |
| `/register` | RegisterPage | 否 | 注册 |
| `/profile` | ProfilePage | 是 | 个人中心 |

## 认证设计

- **AuthContext** 提供全局登录状态，包裹整个 App
- 登录成功后 token 存入 localStorage，同时写入 AuthContext
- 页面刷新时从 localStorage 恢复 token，调用 `/api/auth/me` 验证有效性（或直接解析 JWT）
- `api/client.ts` 的 axios 拦截器自动在 Authorization 头注入 token
- **ProtectedRoute** 检查 AuthContext 的 user 状态，未登录跳 `/login?redirect=<原路径>`，登录后回跳
- Header 组件根据登录状态显示「写文章」+ 用户名 或 「登录」按钮

## 数据流

```
Page组件 → api函数 → axios(client) → 后端API
                ↓
        AuthContext（仅认证相关）
                ↓
        localStorage（token 持久化）
```

各页面独立管理自身数据（useState + useEffect），不设全局文章 store。认证状态由 AuthContext 管理。

## 页面设计

### 首页（HomePage）

- 顶部搜索栏 + 分类标签（从 API 获取分类列表，含「全部」选项）
- 2 列卡片网格，每张卡片显示：封面图、标题、分类标签、作者、时间、浏览数
- 底部分页器，pageSize=10
- 搜索关键词和分类筛选联动

### 文章详情页（PostDetailPage）

- 居中单栏 max-w-3xl
- 标题、作者信息（用户名+头像）、发布时间、浏览量、分类、标签
- Markdown 正文由 react-markdown 渲染，代码块由 react-syntax-highlighter 高亮
- 作者本人可见「编辑」和「删除」按钮
- 删除需确认

### 写文章/编辑页（WritePage）

- 左右分栏：左侧编辑器，右侧实时预览
- 左侧：标题输入框、分类下拉、标签输入（逗号分隔）、封面 URL 输入、Markdown textarea
- 右侧：react-markdown 实时渲染预览
- 保存按钮调用创建/更新 API
- 编辑模式（`/write/:id`）：先请求文章详情，预填表单
- 响应式：移动端上下布局

### 登录/注册页

- 居中卡片表单
- 登录：用户名 + 密码 + 提交按钮 + 注册链接
- 注册：用户名 + 邮箱 + 密码 + 提交按钮 + 登录链接
- 表单校验（客户端，与后端规则一致）
- 成功后跳转首页或 redirect 参数指向的页面

### 个人中心页

- 显示用户名、邮箱、注册时间
- 后续可扩展「我的文章」列表

### Header

- 左侧 Logo（链接到首页）
- 右侧：
  - 未登录：登录按钮
  - 已登录：写文章按钮 + 用户名（链接到 /profile）
- 简洁，一行

### MarkdownEditor 组件

- 左侧 textarea（等宽字体），绑定 value 到父组件 state
- 右侧 react-markdown 渲染区域
- onChange 回调将内容传给父组件
- 代码块配置 react-syntax-highlighter（Prism 主题）
- 支持 GitHub Flavored Markdown

## 类型定义

```typescript
interface User {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
}

interface Article {
  id: number;
  title: string;
  content: string;
  cover: string | null;
  category_id: number | null;
  tags: string[];
  author_id: number;
  views: number;
  author_name: string;
  category_name: string | null;
  created_at: string;
  updated_at: string;
}

interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
}
```

## 统一响应格式

后端返回 `{ code: number, message: string, data: T }`。code=0 表示成功，非零为错误。前端需处理错误显示。

## 样式

- Tailwind CSS 默认色板
- 主色调 indigo-600（链接、按钮、激活状态）
- 背景 gray-50，卡片白色，文字 gray-900
- 卡片圆角 rounded-lg，阴影 shadow-sm
- 响应式：md 断点 2 列网格 → 1 列；编辑器左右分栏 → 上下

## 开发流程

- `npm run dev`：Vite 开发服务器（端口 5173）
- `npm run build`：生产构建
- 后端 API 在 localhost:3000，通过 Vite proxy 转发（开发环境）
- .env 配置 VITE_API_BASE_URL
