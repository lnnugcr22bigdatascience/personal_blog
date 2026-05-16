import { Response, NextFunction } from 'express';
import { CommentService } from '../services/comment.service';
import { AuthRequest, ApiResponse } from '../types';

export const CommentController = {
  async list(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const articleId = Number(req.params.id);
      const comments = await CommentService.list(articleId);
      res.json({ code: 0, message: 'success', data: comments });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const articleId = Number(req.params.id);
      const { content } = req.body;
      const comment = await CommentService.create(req.userId!, articleId, content);
      res.status(201).json({ code: 0, message: 'Comment created', data: comment });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const commentId = Number(req.params.id);
      await CommentService.delete(commentId, req.userId!);
      res.json({ code: 0, message: 'Comment deleted' });
    } catch (err) {
      next(err);
    }
  },
};
