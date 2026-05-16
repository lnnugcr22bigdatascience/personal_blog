import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export const LikeModel = {
  async create(userId: number, articleId: number): Promise<void> {
    await pool.query('INSERT INTO likes (user_id, article_id) VALUES (?, ?)', [userId, articleId]);
  },

  async delete(userId: number, articleId: number): Promise<void> {
    await pool.query('DELETE FROM likes WHERE user_id = ? AND article_id = ?', [userId, articleId]);
  },

  async exists(userId: number, articleId: number): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT 1 FROM likes WHERE user_id = ? AND article_id = ?',
      [userId, articleId]
    );
    return rows.length > 0;
  },

  async countByArticle(articleId: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM likes WHERE article_id = ?',
      [articleId]
    );
    return rows[0].count as number;
  },
};
