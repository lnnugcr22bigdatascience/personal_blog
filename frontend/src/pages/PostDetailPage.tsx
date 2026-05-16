import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getPost, deletePost, likePost, unlikePost, getComments, createComment, deleteComment } from '../api/posts';
import { useAuth } from '../context/AuthContext';
import type { Article, Comment } from '../types';

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!id) return;
    getPost(Number(id))
      .then((res) => {
        if (res.code === 0) {
          setArticle(res.data);
          setLiked(res.data.liked ?? false);
          setLikeCount(res.data.like_count ?? 0);
          getComments(Number(id)).then((res2) => {
            if (res2.code === 0) setComments(res2.data);
          });
        } else setError(res.message);
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleToggleLike() {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(location.pathname));
      return;
    }
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
    } catch {
      // silently ignore
    }
  }

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
        <button onClick={handleToggleLike} className={`inline-flex items-center gap-1 ${liked ? 'text-red-500' : 'text-gray-400'} hover:text-red-500 transition-colors`}>
          {liked ? '❤️' : '🤍'} {likeCount}
        </button>
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

      {/* Comments section */}
      <div className="mt-12 border-t pt-8">
        <h2 className="text-xl font-bold mb-6">评论 ({comments.length})</h2>

        {user ? (
          <div className="mb-8">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="写下你的评论..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
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
    </div>
  );
}
