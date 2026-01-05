import { sign } from 'jsonwebtoken';
import { hash, compare } from 'bcryptjs';
import { PrismaClient } from '@brand-order-system/database';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
const TOKEN_EXPIRY = '7d';

export class AuthService {
  // Generate JWT token
  generateToken(userId: string): string {
    return sign(
      { userId, type: 'admin' },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
  }

  // Hash password
  async hashPassword(password: string): Promise<string> {
    return hash(password, 10);
  }

  // Verify password
  async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return compare(password, passwordHash);
  }

  // Login Logic
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await this.verifyPassword(password, user.password);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        brandName: user.brandName
      }
    };
  }
}
