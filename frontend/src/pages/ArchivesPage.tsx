import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getArchives } from '../api/posts';
import type { ArchiveMonth } from '../types';

export default function ArchivesPage() {
  const [archives, setArchives] = useState<ArchiveMonth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getArchives()
      .then((res) => {
        if (res.code === 0) setArchives(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-gray-500 py-12">加载中...</p>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">文章归档</h1>
      {archives.length === 0 ? (
        <p className="text-gray-500">暂无文章</p>
      ) : (
        <div className="space-y-3">
          {archives.map((item) => {
            const [year, month] = item.yearMonth.split('-');
            return (
              <Link
                key={item.yearMonth}
                to={`/?month=${item.yearMonth}`}
                className="flex items-center justify-between p-4 bg-white rounded-lg border hover:border-indigo-300 transition-colors"
              >
                <span className="text-lg font-medium">
                  {year} 年 {Number(month)} 月
                </span>
                <span className="text-sm text-gray-500">{item.count} 篇文章</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
