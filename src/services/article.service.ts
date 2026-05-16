import { ArticleModel } from '../models/article.model';
import { AppError } from '../middleware/errorHandler';

export const ArticleService = {
  async list(params: { page: number; pageSize: number; category?: number; keyword?: string; status?: string; authorId?: number; month?: string }) {
    const { articles, total } = await ArticleModel.findAll({
      page: params.page,
      pageSize: params.pageSize,
      category: params.category,
      keyword: params.keyword,
      status: params.status || 'published',
      author_id: params.authorId,
      month: params.month,
    });
    return {
      items: articles,
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  },

  async getById(id: number, userId?: number) {
    const article = await ArticleModel.findById(id);
    if (!article) {
      throw new AppError(404, 'Article not found');
    }
    await ArticleModel.incrementViews(id);
    article.views += 1;
    if (userId) {
      const { LikeModel } = await import('../models/like.model');
      article.liked = await LikeModel.exists(userId, id);
    } else {
      article.liked = false;
    }
    return article;
  },

  async create(data: {
    title: string;
    content: string;
    cover?: string;
    category_id?: number;
    tags?: string[];
    author_id: number;
    status?: string;
  }) {
    const id = await ArticleModel.create(data);
    return ArticleModel.findById(id);
  },

  async update(
    id: number,
    userId: number,
    data: { title?: string; content?: string; cover?: string; category_id?: number; tags?: string[]; status?: string }
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

  async archives() {
    return ArticleModel.archives();
  },
};
