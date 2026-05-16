export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
}

export interface Article {
  id: number;
  title: string;
  content: string;
  cover: string | null;
  category_id: number | null;
  tags: string[];
  author_id: number;
  views: number;
  author_name: string;
  category_name: string | null;
  status: 'draft' | 'published';
  like_count: number;
  liked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface ArchiveMonth {
  yearMonth: string;
  count: number;
}
