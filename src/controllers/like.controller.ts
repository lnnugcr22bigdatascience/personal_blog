import { Response, NextFunction } from 'express';
import { LikeService } from '../services/like.service';
import { AuthRequest, ApiResponse } from '../types';

export const LikeController = {
  async like(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const articleId = Number(req.params.id);
      const count = await LikeService.like(req.userId!, articleId);
      res.json({ code: 0, message: 'Liked', data: { like_count: count } });
    } catch (err) {
      next(err);
    }
  },

  async unlike(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const articleId = Number(req.params.id);
      const count = await LikeService.unlike(req.userId!, articleId);
      res.json({ code: 0, message: 'Unliked', data: { like_count: count } });
    } catch (err) {
      next(err);
    }
  },
};
