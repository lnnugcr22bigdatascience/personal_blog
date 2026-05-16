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
