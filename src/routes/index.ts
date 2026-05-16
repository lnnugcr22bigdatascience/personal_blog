import { Router } from 'express';
import authRoutes from './auth.routes';
import articleRoutes from './article.routes';
import categoryRoutes from './category.routes';
import { LikeController } from '../controllers/like.controller';
import { auth } from '../middleware/auth';

const router = Router();

router.use('/auth', authRoutes);
router.use('/posts', articleRoutes);
router.use('/categories', categoryRoutes);

router.post('/posts/:id/like', auth, LikeController.like);
router.delete('/posts/:id/like', auth, LikeController.unlike);

export default router;
