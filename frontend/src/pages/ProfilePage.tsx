import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { getPosts } from '../api/posts';
import type { Article } from '../types';

export default function ProfilePage() {
  const { user } = useAuth();

  const [drafts, setDrafts] = useState<Article[]>([]);

  useEffect(() => {
    getPosts({ status: 'draft', pageSize: 50 }).then((res) => {
      if (res.code === 0) setDrafts(res.data.items);
    });
  }, []);

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

      {drafts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">我的草稿</h2>
          <div className="space-y-2">
            {drafts.map((draft) => (
              <Link
                key={draft.id}
                to={`/write/${draft.id}`}
                className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">
                    {draft.title || '无标题'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(draft.updated_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
