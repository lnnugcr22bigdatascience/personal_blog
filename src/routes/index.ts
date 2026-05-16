import { Router } from 'express';
import authRoutes from './auth.routes';
import articleRoutes from './article.routes';
import categoryRoutes from './category.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/posts', articleRoutes);
router.use('/categories', categoryRoutes);

export default router;
