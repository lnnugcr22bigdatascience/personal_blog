import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface CommentRow {
  id: number;
  content: string;
  user_id: number;
  username: string;
  article_id: number;
  created_at: Date;
}

export const CommentModel = {
  async findByArticle(articleId: number): Promise<CommentRow[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, u.username
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.article_id = ?
       ORDER BY c.created_at ASC`,
      [articleId]
    );
    return rows as CommentRow[];
  },

  async create(userId: number, articleId: number, content: string): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO comments (user_id, article_id, content) VALUES (?, ?, ?)',
      [userId, articleId, content]
    );
    return result.insertId;
  },

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM comments WHERE id = ?', [id]);
  },

  async findById(id: number): Promise<CommentRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, u.username
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [id]
    );
    return (rows[0] as CommentRow) || null;
  },

  async countByArticle(articleId: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM comments WHERE article_id = ?',
      [articleId]
    );
    return rows[0].count as number;
  },
};
