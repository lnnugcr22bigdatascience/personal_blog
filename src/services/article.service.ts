import { ArticleModel } from '../models/article.model';
import { AppError } from '../middleware/errorHandler';

export const ArticleService = {
  async list(params: { page: number; pageSize: number; category?: number; keyword?: string }) {
    const { articles, total } = await ArticleModel.findAll(params);
    return {
      items: articles,
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  },

  async getById(id: number) {
    const article = await ArticleModel.findById(id);
    if (!article) {
      throw new AppError(404, 'Article not found');
    }
    await ArticleModel.incrementViews(id);
    article.views += 1;
    return article;
  },

  async create(data: {
    title: string;
    content: string;
    cover?: string;
    category_id?: number;
    tags?: string[];
    author_id: number;
  }) {
    const id = await ArticleModel.create(data);
    return ArticleModel.findById(id);
  },

  async update(
    id: number,
    userId: number,
    data: { title?: string; content?: string; cover?: string; category_id?: number; tags?: string[] }
  ) {
    const article = await ArticleModel.findById(id);
    if (!article) {
      throw new AppError(404, 'Article not found');
    }
    if (article.author_id !== userId) {
      throw new AppError(403, 'You can only edit your own articles');
    }
    await ArticleModel.update(id, data);
    return ArticleModel.findById(id);
  },

  async delete(id: number, userId: number) {
    const article = await ArticleModel.findById(id);
    if (!article) {
      throw new AppError(404, 'Article not found');
    }
    if (article.author_id !== userId) {
      throw new AppError(403, 'You can only delete your own articles');
    }
    await ArticleModel.delete(id);
  },
};
