import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model';
import { AppError } from '../middleware/errorHandler';

export const AuthService = {
  async register(username: string, email: string, password: string) {
    const existingUser = await UserModel.findByUsername(username);
    if (existingUser) {
      throw new AppError(400, 'Username already exists');
    }

    const existingEmail = await UserModel.findByEmail(email);
    if (existingEmail) {
      throw new AppError(400, 'Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await UserModel.create({ username, email, password: hashedPassword });

    return { id: userId, username, email };
  },

  async login(username: string, password: string) {
    const user = await UserModel.findByUsername(username);
    if (!user) {
      throw new AppError(401, 'Invalid username or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError(401, 'Invalid username or password');
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    };
  },
};
