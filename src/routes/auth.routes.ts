import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';

const router = Router();

router.post(
  '/register',
  validate([
    { field: 'username', in: 'body', required: true, minLength: 3, maxLength: 20 },
    { field: 'email', in: 'body', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' },
    { field: 'password', in: 'body', required: true, minLength: 6 },
  ]),
  AuthController.register
);

router.post(
  '/login',
  validate([
    { field: 'username', in: 'body', required: true },
    { field: 'password', in: 'body', required: true },
  ]),
  AuthController.login
);

export default router;
