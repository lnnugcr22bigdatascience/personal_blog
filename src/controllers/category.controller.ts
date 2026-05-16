import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { ApiResponse } from '../types';

export const CategoryController = {
  async list(_req: Request, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const categories = await CategoryService.list();
      res.json({ code: 0, message: 'success', data: categories });
    } catch (err) {
      next(err);
    }
  },
};
