# Blog Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the blog frontend — article browsing (list, detail, search, filter), user auth (login/register), article writing/editing with Markdown editor, all in React + TypeScript + Vite + Tailwind CSS.

**Architecture:** Flat directory structure with pages, components, api, context, and types. AuthContext provides global login state via localStorage-backed JWT. API layer wraps axios with automatic Bearer token injection and proxy to backend at localhost:3000. Pages independently manage their own data via useState/useEffect.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v4, react-router-dom v6, axios, react-markdown, react-syntax-highlighter.

---

## File Structure Map

| File | Responsibility |
|---|---|
| `frontend/src/types/index.ts` | Shared TypeScript types (User, Article, Category, PaginatedData, ApiResponse) |
| `frontend/src/api/client.ts` | Axios instance with /api baseURL, Bearer token injection, 401 handling |
| `frontend/src/api/auth.ts` | login(), register() API calls |
| `frontend/src/api/posts.ts` | getPosts(), getPost(), createPost(), updatePost(), deletePost() |
| `frontend/src/api/categories.ts` | getCategories() |
| `frontend/src/context/AuthContext.tsx` | AuthProvider + useAuth hook, token/user in localStorage |
| `frontend/src/components/Header.tsx` | Nav bar with conditional login/write links |
| `frontend/src/components/ArticleCard.tsx` | Article card with cover, title, author, time, views |
| `frontend/src/components/Pagination.tsx` | Page navigation with prev/next and page numbers |
| `frontend/src/components/ProtectedRoute.tsx` | Redirects to /login if not authenticated |
| `frontend/src/components/MarkdownEditor.tsx` | Split-pane editor: textarea left + react-markdown preview right |
| `frontend/src/pages/HomePage.tsx` | Article list with search, category filter, pagination |
| `frontend/src/pages/PostDetailPage.tsx` | Article detail with markdown rendering, edit/delete for author |
| `frontend/src/pages/WritePage.tsx` | Create/edit article with MarkdownEditor, title, category, tags, cover |
| `frontend/src/pages/LoginPage.tsx` | Login form with validation and redirect |
| `frontend/src/pages/RegisterPage.tsx` | Registration form with validation |
| `frontend/src/pages/ProfilePage.tsx` | User profile display |
| `frontend/src/App.tsx` | React Router setup with all routes |
| `frontend/src/main.tsx` | ReactDOM entry, AuthProvider + App |
| `frontend/index.html` | Vite HTML entry |
| `frontend/vite.config.ts` | Vite config with proxy to backend |
| `frontend/src/index.css` | Tailwind directives |

---

### Task 1: Initialize Frontend Project

- [ ] **Step 1: Scaffold Vite + React + TypeScript**

```bash
cd /home/magic/project/blog && npm create vite@latest frontend -- --template react-ts
```

- [ ] **Step 2: Install dependencies**

```bash
cd /home/magic/project/blog/frontend && npm install react-router-dom axios react-markdown react-syntax-highlighter remark-gfm
```

```bash
cd /home/magic/project/blog/frontend && npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Create vite.config.ts**

Overwrite `./frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 4: Create index.css with Tailwind**

Overwrite `./frontend/src/index.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 5: Create shared types**

Write `./frontend/src/types/index.ts`:

```typescript
export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
}

export interface Article {
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

export interface Category {
  id: number;
  name: string;
  description: string | null;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
```

- [ ] **Step 6: Create directory structure and clean up**

```bash
mkdir -p /home/magic/project/blog/frontend/src/{api,components,context,pages}
rm -f /home/magic/project/blog/frontend/src/App.css /home/magic/project/blog/frontend/src/assets/react.svg
```

- [ ] **Step 7: Verify the dev server starts and proxy works**

```bash
cd /home/magic/project/blog && npx tsx src/server.ts &
sleep 2
cd /home/magic/project/blog/frontend && npx vite --host &
sleep 3
curl -s http://localhost:5173/api/categories
kill %2 %1 2>/dev/null
```

Expected: `{"code":0,"message":"success","data":[]}` (proxy to backend working)

- [ ] **Step 8: Commit**

```bash
cd /home/magic/project/blog && git add frontend/ .gitignore frontend/.gitignore 2>/dev/null; git commit -m "feat: initialize frontend with Vite, React, TypeScript, Tailwind CSS"
```

---

### Task 2: Create API Layer

- [ ] **Step 1: Create api/client.ts**

Write `./frontend/src/api/client.ts`:

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default client;
```

- [ ] **Step 2: Create api/auth.ts**

Write `./frontend/src/api/auth.ts`:

```typescript
import client from './client';

export async function login(username: string, password: string) {
  const res = await client.post('/auth/login', { username, password });
  return res.data;
}

export async function register(username: string, email: string, password: string) {
  const res = await client.post('/auth/register', { username, email, password });
  return res.data;
}
```

- [ ] **Step 3: Create api/posts.ts**

Write `./frontend/src/api/posts.ts`:

```typescript
import client from './client';

export async function getPosts(params: {
  page?: number;
  pageSize?: number;
  category?: number;
  keyword?: string;
}) {
  const res = await client.get('/posts', { params });
  return res.data;
}

export async function getPost(id: number) {
  const res = await client.get(`/posts/${id}`);
  return res.data;
}

export async function createPost(data: {
  title: string;
  content: string;
  cover?: string;
  category_id?: number;
  tags?: string[];
}) {
  const res = await client.post('/posts', data);
  return res.data;
}

export async function updatePost(
  id: number,
  data: {
    title?: string;
    content?: string;
    cover?: string;
    category_id?: number;
    tags?: string[];
  }
) {
  const res = await client.put(`/posts/${id}`, data);
  return res.data;
}

export async function deletePost(id: number) {
  const res = await client.delete(`/posts/${id}`);
  return res.data;
}
```

- [ ] **Step 4: Create api/categories.ts**

Write `./frontend/src/api/categories.ts`:

```typescript
import client from './client';

export async function getCategories() {
  const res = await client.get('/categories');
  return res.data;
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /home/magic/project/blog/frontend && git add src/ && git commit -m "feat: add API layer with axios client and endpoint functions"
```

---

### Task 3: Create AuthContext

- [ ] **Step 1: Create AuthContext**

Write `./frontend/src/context/AuthContext.tsx`:

```typescript
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { login as apiLogin, register as apiRegister } from '../api/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  async function login(username: string, password: string) {
    const res = await apiLogin(username, password);
    if (res.code !== 0) throw new Error(res.message);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
  }

  async function register(username: string, email: string, password: string) {
    const res = await apiRegister(username, email, password);
    if (res.code !== 0) throw new Error(res.message);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/magic/project/blog/frontend && git add src/ && git commit -m "feat: add AuthContext with login, register, logout, and localStorage persistence"
```

---

### Task 4: Create Shared Components

- [ ] **Step 1: Create Header component**

Write `./frontend/src/components/Header.tsx`:

```typescript
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-indigo-600">
          MyBlog
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link to="/write" className="text-indigo-600 hover:text-indigo-800">
                写文章
              </Link>
              <Link to="/profile" className="text-gray-600 hover:text-gray-900">
                {user.username}
              </Link>
              <button onClick={logout} className="text-gray-500 hover:text-gray-700">
                退出
              </button>
            </>
          ) : (
            <Link to="/login" className="text-indigo-600 hover:text-indigo-800">
              登录
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create ArticleCard component**

Write `./frontend/src/components/ArticleCard.tsx`:

```typescript
import { Link } from 'react-router-dom';
import type { Article } from '../types';

export default function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      to={`/post/${article.id}`}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      {article.cover && (
        <img src={article.cover} alt={article.title} className="w-full h-40 object-cover" />
      )}
      <div className="p-4">
        {article.category_name && (
          <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {article.category_name}
          </span>
        )}
        <h3 className="mt-2 font-semibold text-gray-900 line-clamp-2">{article.title}</h3>
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
          <span>{article.author_name}</span>
          <span>{new Date(article.created_at).toLocaleDateString('zh-CN')}</span>
          <span>{article.views} 阅读</span>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Create Pagination component**

Write `./frontend/src/components/Pagination.tsx`:

```typescript
interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-sm border rounded disabled:opacity-30 hover:bg-gray-50"
      >
        上一页
      </button>
      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">1</button>
          {start > 2 && <span className="px-2">...</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`px-3 py-1.5 text-sm border rounded ${
            p === page ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-gray-50'
          }`}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-2">...</span>}
          <button onClick={() => onPageChange(totalPages)} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">{totalPages}</button>
        </>
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-sm border rounded disabled:opacity-30 hover:bg-gray-50"
      >
        下一页
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create ProtectedRoute component**

Write `./frontend/src/components/ProtectedRoute.tsx`:

```typescript
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><p className="text-gray-500">加载中...</p></div>;
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /home/magic/project/blog/frontend && git add src/ && git commit -m "feat: add Header, ArticleCard, Pagination, and ProtectedRoute components"
```

---

### Task 5: Create MarkdownEditor Component

- [ ] **Step 1: Create MarkdownEditor**

Write `./frontend/src/components/MarkdownEditor.tsx`:

```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function MarkdownEditor({ value, onChange }: Props) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <p className="text-sm text-gray-500 mb-1">编辑</p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
          placeholder="开始写 Markdown..."
        />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-500 mb-1">预览</p>
        <div className="w-full min-h-96 p-4 border border-gray-200 rounded-lg bg-white prose prose-sm max-w-none overflow-auto">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const codeStr = String(children).replace(/\n$/, '');
                if (match) {
                  return (
                    <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div">
                      {codeStr}
                    </SyntaxHighlighter>
                  );
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {value || '*暂无内容*'}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/magic/project/blog/frontend && git add src/ && git commit -m "feat: add MarkdownEditor component with split-pane editing and syntax highlighting"
```

---

### Task 6: Create LoginPage and RegisterPage

- [ ] **Step 1: Create LoginPage**

Write `./frontend/src/pages/LoginPage.tsx`:

```typescript
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('请填写所有字段');
      return;
    }
    setSubmitting(true);
    try {
      await login(username, password);
      const redirect = searchParams.get('redirect') || '/';
      navigate(redirect, { replace: true });
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-xl font-bold text-center mb-6">登录</h1>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="输入用户名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="输入密码"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? '登录中...' : '登录'}
          </button>
        </form>
        <p className="text-sm text-center mt-4 text-gray-500">
          还没有账号？<Link to="/register" className="text-indigo-600 hover:underline">注册</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create RegisterPage**

Write `./frontend/src/pages/RegisterPage.tsx`:

```typescript
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !email.trim() || !password) {
      setError('请填写所有字段');
      return;
    }
    if (username.length < 3) {
      setError('用户名至少 3 个字符');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 个字符');
      return;
    }
    setSubmitting(true);
    try {
      await register(username, email, password);
      navigate('/login', { replace: true });
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-xl font-bold text-center mb-6">注册</h1>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="3-20 个字符"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="至少 6 个字符"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? '注册中...' : '注册'}
          </button>
        </form>
        <p className="text-sm text-center mt-4 text-gray-500">
          已有账号？<Link to="/login" className="text-indigo-600 hover:underline">登录</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/magic/project/blog/frontend && git add src/ && git commit -m "feat: add LoginPage and RegisterPage with form validation"
```

---

### Task 7: Create HomePage

- [ ] **Step 1: Create HomePage**

Write `./frontend/src/pages/HomePage.tsx`:

```typescript
import { useState, useEffect, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPosts } from '../api/posts';
import { getCategories } from '../api/categories';
import ArticleCard from '../components/ArticleCard';
import Pagination from '../components/Pagination';
import type { Article, Category } from '../types';

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('keyword') || '');

  const page = Number(searchParams.get('page')) || 1;
  const category = searchParams.get('category') ? Number(searchParams.get('category')) : undefined;
  const keyword = searchParams.get('keyword') || undefined;

  useEffect(() => {
    getCategories().then((res) => {
      if (res.code === 0) setCategories(res.data);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    getPosts({ page, pageSize: 10, category, keyword })
      .then((res) => {
        if (res.code === 0) {
          setArticles(res.data.items);
          setTotal(res.data.total);
        }
      })
      .finally(() => setLoading(false));
  }, [page, category, keyword]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set('keyword', searchInput.trim());
    if (category) params.set('category', String(category));
    params.set('page', '1');
    setSearchParams(params);
  }

  function handleCategory(catId: number | undefined) {
    const params = new URLSearchParams();
    if (catId) params.set('category', String(catId));
    if (keyword) params.set('keyword', keyword);
    params.set('page', '1');
    setSearchParams(params);
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="搜索文章..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
        <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          搜索
        </button>
      </form>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => handleCategory(undefined)}
          className={`px-3 py-1 rounded-full text-sm ${!category ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          全部
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategory(cat.id)}
            className={`px-3 py-1 rounded-full text-sm ${category === cat.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-12">加载中...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
          {articles.length === 0 && (
            <p className="text-center text-gray-500 py-12">暂无文章</p>
          )}
          <Pagination page={page} pageSize={10} total={total} onPageChange={handlePageChange} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/magic/project/blog/frontend && git add src/ && git commit -m "feat: add HomePage with search, category filter, and pagination"
```

---

### Task 8: Create PostDetailPage

- [ ] **Step 1: Create PostDetailPage**

Write `./frontend/src/pages/PostDetailPage.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getPost, deletePost } from '../api/posts';
import { useAuth } from '../context/AuthContext';
import type { Article } from '../types';

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    getPost(Number(id))
      .then((res) => {
        if (res.code === 0) setArticle(res.data);
        else setError(res.message);
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!article || !window.confirm('确定删除这篇文章？')) return;
    setDeleting(true);
    try {
      await deletePost(article.id);
      navigate('/', { replace: true });
    } catch {
      alert('删除失败');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <p className="text-center text-gray-500 py-12">加载中...</p>;
  if (error) return <p className="text-center text-red-500 py-12">{error}</p>;
  if (!article) return <p className="text-center text-gray-500 py-12">文章不存在</p>;

  const isAuthor = user?.id === article.author_id;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        <span>{article.author_name}</span>
        <span>{new Date(article.created_at).toLocaleDateString('zh-CN')}</span>
        <span>{article.views} 阅读</span>
        {article.category_name && (
          <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full text-xs">
            {article.category_name}
          </span>
        )}
      </div>

      {article.tags && article.tags.length > 0 && (
        <div className="flex gap-2 mb-6">
          {article.tags.map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {isAuthor && (
        <div className="flex gap-3 mb-6">
          <Link
            to={`/write/${article.id}`}
            className="text-sm text-indigo-600 hover:underline"
          >
            编辑
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red-500 hover:underline disabled:opacity-50"
          >
            {deleting ? '删除中...' : '删除'}
          </button>
        </div>
      )}

      {article.cover && (
        <img src={article.cover} alt={article.title} className="w-full rounded-lg mb-6" />
      )}

      <div className="prose prose-lg max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const codeStr = String(children).replace(/\n$/, '');
              if (match) {
                return (
                  <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div">
                    {codeStr}
                  </SyntaxHighlighter>
                );
              }
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {article.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/magic/project/blog/frontend && git add src/ && git commit -m "feat: add PostDetailPage with Markdown rendering and author actions"
```

---

### Task 9: Create WritePage

- [ ] **Step 1: Create WritePage**

Write `./frontend/src/pages/WritePage.tsx`:

```typescript
import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPost, updatePost, getPost } from '../api/posts';
import { getCategories } from '../api/categories';
import MarkdownEditor from '../components/MarkdownEditor';
import type { Category } from '../types';

export default function WritePage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [tagsInput, setTagsInput] = useState('');
  const [cover, setCover] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    getCategories().then((res) => {
      if (res.code === 0) setCategories(res.data);
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    getPost(Number(id)).then((res) => {
      if (res.code === 0) {
        const a = res.data;
        setTitle(a.title);
        setContent(a.content);
        setCategoryId(a.category_id ?? undefined);
        setTagsInput(a.tags?.join(', ') || '');
        setCover(a.cover || '');
      }
      setLoading(false);
    });
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('标题和内容不能为空');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const data = {
        title: title.trim(),
        content,
        cover: cover.trim() || undefined,
        category_id: categoryId,
        tags: tags.length > 0 ? tags : undefined,
      };

      if (isEdit) {
        await updatePost(Number(id), data);
      } else {
        await createPost(data);
      }
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-center text-gray-500 py-12">加载中...</p>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? '编辑文章' : '写文章'}</h1>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="文章标题"
            className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <select
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="">无分类</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="标签，逗号分隔"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <input
            type="text"
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            placeholder="封面图片 URL（可选）"
            className="md:col-span-4 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        <MarkdownEditor value={content} onChange={setContent} />

        <div className="mt-6">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/magic/project/blog/frontend && git add src/ && git commit -m "feat: add WritePage with MarkdownEditor, category, tags, and cover image"
```

---

### Task 10: Create ProfilePage, App.tsx, main.tsx

- [ ] **Step 1: Create ProfilePage**

Write `./frontend/src/pages/ProfilePage.tsx`:

```typescript
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">个人中心</h1>
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div>
          <span className="text-sm text-gray-500">用户名</span>
          <p className="text-lg font-medium">{user.username}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">邮箱</span>
          <p className="text-lg">{user.email}</p>
        </div>
        <div>
          <Link to="/write" className="text-indigo-600 hover:underline text-sm">
            写新文章 →
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create App.tsx**

Overwrite `./frontend/src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import PostDetailPage from './pages/PostDetailPage';
import WritePage from './pages/WritePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/post/:id" element={<PostDetailPage />} />
            <Route path="/write" element={<ProtectedRoute><WritePage /></ProtectedRoute>} />
            <Route path="/write/:id" element={<ProtectedRoute><WritePage /></ProtectedRoute>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Create main.tsx**

Overwrite `./frontend/src/main.tsx`:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/magic/project/blog/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Build test**

```bash
cd /home/magic/project/blog/frontend && npx vite build
```

Expected: successful production build.

- [ ] **Step 6: Commit**

```bash
cd /home/magic/project/blog/frontend && git add src/ && git commit -m "feat: add ProfilePage, App routing, and main entry point"
```

---

### Task 11: End-to-End Verification

- [ ] **Step 1: Ensure backend is running**

```bash
# Start MySQL if not running
docker compose ps || docker compose up -d
# Start backend
cd /home/magic/project/blog && npx tsx src/server.ts &
sleep 2
```

- [ ] **Step 2: Start frontend dev server**

```bash
cd /home/magic/project/blog/frontend && npx vite &
sleep 3
```

- [ ] **Step 3: Test frontend serves HTML**

```bash
curl -s http://localhost:5173 | head -c 200
```

Expected: HTML with `<title>` tag.

- [ ] **Step 4: Test API proxy works**

```bash
curl -s http://localhost:5173/api/categories
```

Expected: `{"code":0,"message":"success","data":[]}`

- [ ] **Step 5: Test login API via proxy**

```bash
# Register a test user
curl -s -X POST http://localhost:5173/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"frontendtest","email":"ftest@example.com","password":"test123"}'

# Login
curl -s -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"frontendtest","password":"test123"}'
```

Expected: returns token.

- [ ] **Step 6: Test article list via proxy**

```bash
# Create a test article
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"frontendtest","password":"test123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

curl -s -X POST http://localhost:5173/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test Post","content":"# Hello\n\nThis is a **test**."}'

# Get list
curl -s http://localhost:5173/api/posts
```

Expected: returns the test article.

- [ ] **Step 7: Stop servers**

```bash
kill %1 %2 2>/dev/null
```

- [ ] **Step 8: Commit if any fixes made**

```bash
cd /home/magic/project/blog && git status
```
