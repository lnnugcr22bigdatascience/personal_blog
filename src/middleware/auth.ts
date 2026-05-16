import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import { ApiResponse } from '../types';

interface TokenPayload {
  userId: number;
  username: string;
}

export function auth(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ code: 401, message: 'Authentication required' });
    return;
  }

  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ code: 401, message: 'Invalid or expired token' });
  }
}
