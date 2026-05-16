import { Router } from 'express';
import { ArticleController } from '../controllers/article.controller';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.get(
  '/',
  validate([
    { field: 'page', in: 'query', type: 'number' },
    { field: 'pageSize', in: 'query', type: 'number' },
    { field: 'category', in: 'query', type: 'number' },
  ]),
  ArticleController.list
);

router.get('/:id', ArticleController.getById);

router.post(
  '/',
  auth,
  validate([
    { field: 'title', in: 'body', required: true, maxLength: 255 },
    { field: 'content', in: 'body', required: true },
  ]),
  ArticleController.create
);

router.put(
  '/:id',
  auth,
  validate([
    { field: 'title', in: 'body', maxLength: 255 },
  ]),
  ArticleController.update
);

router.delete('/:id', auth, ArticleController.delete);

export default router;
