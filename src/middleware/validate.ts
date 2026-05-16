import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

interface Rule {
  field: string;
  in: 'body' | 'query';
  required?: boolean;
  type?: 'string' | 'number';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  message?: string;
}

export function validate(rules: Rule[]) {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
    for (const rule of rules) {
      const source = rule.in === 'body' ? req.body : req.query;
      const value = source[rule.field];

      if (value === undefined || value === '' || value === null) {
        if (rule.required) {
          res.status(400).json({ code: 400, message: rule.message || `${rule.field} is required` });
          return;
        }
        continue;
      }

      if (rule.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          res.status(400).json({ code: 400, message: `${rule.field} must be a number` });
          return;
        }
        source[rule.field] = num;
      }

      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          res.status(400).json({
            code: 400,
            message: rule.message || `${rule.field} must be at least ${rule.minLength} characters`,
          });
          return;
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          res.status(400).json({
            code: 400,
            message: rule.message || `${rule.field} must be at most ${rule.maxLength} characters`,
          });
          return;
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          res.status(400).json({ code: 400, message: rule.message || `${rule.field} format is invalid` });
          return;
        }
      }
    }
    next();
  };
}
