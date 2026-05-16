import { CategoryModel } from '../models/category.model';

export const CategoryService = {
  async list() {
    return CategoryModel.findAll();
  },
};
