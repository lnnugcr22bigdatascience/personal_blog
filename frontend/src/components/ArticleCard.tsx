import { Link } from 'react-router-dom';
import type { Article } from '../types';

interface Props {
  article: Article;
  showStatus?: boolean;
}

export default function ArticleCard({ article, showStatus }: Props) {
  return (
    <Link
      to={`/post/${article.id}`}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      {article.cover && (
        <img src={article.cover} alt={article.title} className="w-full h-40 object-cover" />
      )}
      <div className="p-4">
        {showStatus && article.status === 'draft' && (
          <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full mr-1">
            草稿
          </span>
        )}
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
          <span>{(article.like_count ?? 0)} 赞</span>
        </div>
      </div>
    </Link>
  );
}
