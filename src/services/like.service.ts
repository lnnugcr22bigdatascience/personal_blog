import { LikeModel } from '../models/like.model';
import { AppError } from '../middleware/errorHandler';

export const LikeService = {
  async like(userId: number, articleId: number) {
    const exists = await LikeModel.exists(userId, articleId);
    if (exists) {
      throw new AppError(400, 'Already liked');
    }
    await LikeModel.create(userId, articleId);
    return LikeModel.countByArticle(articleId);
  },

  async unlike(userId: number, articleId: number) {
    const exists = await LikeModel.exists(userId, articleId);
    if (!exists) {
      throw new AppError(400, 'Not liked yet');
    }
    await LikeModel.delete(userId, articleId);
    return LikeModel.countByArticle(articleId);
  },
};
