import client from './client';

export async function getCategories() {
  const res = await client.get('/categories');
  return res.data;
}
