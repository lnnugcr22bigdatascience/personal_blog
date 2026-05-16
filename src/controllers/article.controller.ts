import { Response, NextFunction } from 'express';
import { ArticleService } from '../services/article.service';
import { AuthRequest, ApiResponse } from '../types';

export const ArticleController = {
  async list(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Math.min(Number(req.query.pageSize) || 10, 50);
      const category = req.query.category ? Number(req.query.category) : undefined;
      const keyword = req.query.keyword as string | undefined;
      const status = req.query.status as string | undefined;
      const authorId = req.query.authorId ? Number(req.query.authorId) : undefined;
      const month = req.query.month as string | undefined;

      const data = await ArticleService.list({ page, pageSize, category, keyword, status, authorId, month });
      res.json({ code: 0, message: 'success', data });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const article = await ArticleService.getById(id, req.userId);
      res.json({ code: 0, message: 'success', data: article });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { title, content, cover, category_id, tags, status } = req.body;
      const article = await ArticleService.create({
        title,
        content,
        cover,
        category_id,
        tags,
        status,
        author_id: req.userId!,
      });
      res.status(201).json({ code: 0, message: 'Article created', data: article });
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const { title, content, cover, category_id, tags, status } = req.body;
      const article = await ArticleService.update(id, req.userId!, { title, content, cover, category_id, tags, status });
      res.json({ code: 0, message: 'Article updated', data: article });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      await ArticleService.delete(id, req.userId!);
      res.json({ code: 0, message: 'Article deleted' });
    } catch (err) {
      next(err);
    }
  },

  async archives(_req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const data = await ArticleService.archives();
      res.json({ code: 0, message: 'success', data });
    } catch (err) {
      next(err);
    }
  },
};
