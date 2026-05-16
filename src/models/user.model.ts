import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface UserRow {
  id: number;
  username: string;
  email: string;
  password: string;
  avatar: string | null;
  created_at: Date;
  updated_at: Date;
}

export const UserModel = {
  async findById(id: number): Promise<UserRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return (rows[0] as UserRow) || null;
  },

  async findByUsername(username: string): Promise<UserRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return (rows[0] as UserRow) || null;
  },

  async findByEmail(email: string): Promise<UserRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return (rows[0] as UserRow) || null;
  },

  async create(data: { username: string; email: string; password: string }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [data.username, data.email, data.password]
    );
    return result.insertId;
  },
};
