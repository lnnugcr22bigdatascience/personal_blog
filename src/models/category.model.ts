import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export interface CategoryRow {
  id: number;
  name: string;
  description: string | null;
  created_at: Date;
}

export const CategoryModel = {
  async findAll(): Promise<CategoryRow[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categories ORDER BY id ASC'
    );
    return rows as CategoryRow[];
  },

  async findById(id: number): Promise<CategoryRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    return (rows[0] as CategoryRow) || null;
  },
};
