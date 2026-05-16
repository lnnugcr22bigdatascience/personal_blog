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
  const month = searchParams.get('month') || undefined;

  useEffect(() => {
    getCategories().then((res) => {
      if (res.code === 0) setCategories(res.data);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    getPosts({ page, pageSize: 10, category, keyword, status: 'published', month })
      .then((res) => {
        if (res.code === 0) {
          setArticles(res.data.items);
          setTotal(res.data.total);
        }
      })
      .finally(() => setLoading(false));
  }, [page, category, keyword, month]);

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
