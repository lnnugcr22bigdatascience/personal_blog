import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface ArticleRow {
  id: number;
  title: string;
  content: string;
  cover: string | null;
  category_id: number | null;
  tags: string[] | null;
  author_id: number;
  views: number;
  created_at: Date;
  updated_at: Date;
  author_name?: string;
  category_name?: string;
  status?: string;
  like_count?: number;
}

export const ArticleModel = {
  async findAll(params: {
    page: number;
    pageSize: number;
    category?: number;
    keyword?: string;
    status?: string;
    author_id?: number;
    month?: string;
  }): Promise<{ articles: ArticleRow[]; total: number }> {
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.category) {
      conditions.push('a.category_id = ?');
      values.push(params.category);
    }

    if (params.keyword) {
      conditions.push('(a.title LIKE ? OR a.content LIKE ?)');
      values.push(`%${params.keyword}%`, `%${params.keyword}%`);
    }

    if (params.status) {
      conditions.push('a.status = ?');
      values.push(params.status);
    }
    if (params.author_id) {
      conditions.push('a.author_id = ?');
      values.push(params.author_id);
    }
    if (params.month) {
      conditions.push("DATE_FORMAT(a.created_at, '%Y-%m') = ?");
      values.push(params.month);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM articles a ${where}`,
      values
    );
    const total = countRows[0].total as number;

    const offset = (params.page - 1) * params.pageSize;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, u.username AS author_name, c.name AS category_name, COUNT(DISTINCT l.id) AS like_count
       FROM articles a
       JOIN users u ON a.author_id = u.id
       LEFT JOIN categories c ON a.category_id = c.id
       LEFT JOIN likes l ON a.id = l.article_id
       ${where}
       GROUP BY a.id
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, params.pageSize, offset]
    );

    return { articles: rows as ArticleRow[], total };
  },

  async findById(id: number): Promise<ArticleRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, u.username AS author_name, c.name AS category_name, COUNT(DISTINCT l.id) AS like_count
       FROM articles a
       JOIN users u ON a.author_id = u.id
       LEFT JOIN categories c ON a.category_id = c.id
       LEFT JOIN likes l ON a.id = l.article_id
       WHERE a.id = ?
       GROUP BY a.id`,
      [id]
    );
    return (rows[0] as ArticleRow) || null;
  },

  async create(data: {
    title: string;
    content: string;
    cover?: string;
    category_id?: number;
    tags?: string[];
    author_id: number;
    status?: string;
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO articles (title, content, cover, category_id, tags, author_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.title, data.content, data.cover || null, data.category_id || null, JSON.stringify(data.tags || []), data.author_id, data.status || 'published']
    );
    return result.insertId;
  },

  async update(
    id: number,
    data: { title?: string; content?: string; cover?: string; category_id?: number; tags?: string[]; status?: string; }
  ): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content); }
    if (data.cover !== undefined) { fields.push('cover = ?'); values.push(data.cover); }
    if (data.category_id !== undefined) { fields.push('category_id = ?'); values.push(data.category_id); }
    if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE articles SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM articles WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  async incrementViews(id: number): Promise<void> {
    await pool.query('UPDATE articles SET views = views + 1 WHERE id = ?', [id]);
  },

  async archives(): Promise<{ yearMonth: string; count: number }[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS yearMonth, COUNT(*) AS count
       FROM articles
       WHERE status = 'published'
       GROUP BY yearMonth
       ORDER BY yearMonth DESC`
    );
    return rows as { yearMonth: string; count: number }[];
  },
};
