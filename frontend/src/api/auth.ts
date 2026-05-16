import client from './client';

export async function login(username: string, password: string) {
  const res = await client.post('/auth/login', { username, password });
  return res.data;
}

export async function register(username: string, email: string, password: string) {
  const res = await client.post('/auth/register', { username, email, password });
  return res.data;
}
