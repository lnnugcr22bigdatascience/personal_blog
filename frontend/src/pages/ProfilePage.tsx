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
