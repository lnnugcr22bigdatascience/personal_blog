import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

async function migrate() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'blog_dev',
  });
  const sql = readFileSync('scripts/migration-002.sql', 'utf-8');
  await c.query(sql);
  console.log('Migration 002 applied successfully.');
  await c.end();
}
migrate().catch((err) => { console.error(err); process.exit(1); });
