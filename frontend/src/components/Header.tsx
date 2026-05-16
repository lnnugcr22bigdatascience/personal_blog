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
          <Link to="/archives" className="text-gray-600 hover:text-gray-900">归档</Link>
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
