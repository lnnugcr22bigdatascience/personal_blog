import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../types';

export const AuthController = {
  async register(req: Request, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { username, email, password } = req.body;
      const user = await AuthService.register(username, email, password);
      res.status(201).json({ code: 0, message: 'Registration successful', data: user });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { username, password } = req.body;
      const result = await AuthService.login(username, password);
      res.json({ code: 0, message: 'success', data: result });
    } catch (err) {
      next(err);
    }
  },
};
