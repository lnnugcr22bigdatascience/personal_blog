import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface TagRow {
  id: number;
  name: string;
  created_at: Date;
}

export const TagModel = {
  async findAll(): Promise<TagRow[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tags ORDER BY name ASC'
    );
    return rows as TagRow[];
  },

  async findByName(name: string): Promise<TagRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tags WHERE name = ?',
      [name]
    );
    return (rows[0] as TagRow) || null;
  },

  async create(name: string): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO tags (name) VALUES (?)',
      [name]
    );
    return result.insertId;
  },
};
