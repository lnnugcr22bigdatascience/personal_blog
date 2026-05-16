import client from './client';

export async function getPosts(params: {
  page?: number;
  pageSize?: number;
  category?: number;
  keyword?: string;
}) {
  const res = await client.get('/posts', { params });
  return res.data;
}

export async function getPost(id: number) {
  const res = await client.get(`/posts/${id}`);
  return res.data;
}

export async function createPost(data: {
  title: string;
  content: string;
  cover?: string;
  category_id?: number;
  tags?: string[];
}) {
  const res = await client.post('/posts', data);
  return res.data;
}

export async function updatePost(
  id: number,
  data: {
    title?: string;
    content?: string;
    cover?: string;
    category_id?: number;
    tags?: string[];
  }
) {
  const res = await client.put(`/posts/${id}`, data);
  return res.data;
}

export async function deletePost(id: number) {
  const res = await client.delete(`/posts/${id}`);
  return res.data;
}
