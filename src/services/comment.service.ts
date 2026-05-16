import { CommentModel } from '../models/comment.model';
import { ArticleModel } from '../models/article.model';
import { AppError } from '../middleware/errorHandler';

export const CommentService = {
  async list(articleId: number) {
    return CommentModel.findByArticle(articleId);
  },

  async create(userId: number, articleId: number, content: string) {
    const article = await ArticleModel.findById(articleId);
    if (!article) throw new AppError(404, 'Article not found');
    const id = await CommentModel.create(userId, articleId, content);
    return CommentModel.findById(id);
  },

  async delete(commentId: number, userId: number) {
    const comment = await CommentModel.findById(commentId);
    if (!comment) throw new AppError(404, 'Comment not found');

    const article = await ArticleModel.findById(comment.article_id);
    if (!article) throw new AppError(404, 'Article not found');
    if (comment.user_id !== userId && article.author_id !== userId) {
      throw new AppError(403, 'You can only delete your own comments or comments on your articles');
    }

    await CommentModel.delete(commentId);
  },
};
