import { User, UserRole } from '@prisma/client';
import prisma from '../utils/database';
import { hashPassword, comparePassword, generateToken, generateRefreshToken } from '../utils/auth';
import { UserRegistrationInput, UserLoginInput } from '../utils/validation';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: UserRole;
    profile?: any;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(userData: UserRegistrationInput): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash the password
    const passwordHash = await hashPassword(userData.password);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        passwordHash,
        role: userData.role,
        profile: userData.profile || undefined
      }
    });

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      role: user.role,
      email: user.email
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt
      },
      accessToken,
      refreshToken
    };
  }

  /**
   * Login a user
   */
  static async login(loginData: UserLoginInput): Promise<AuthResponse> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: loginData.email }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await comparePassword(loginData.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      role: user.role,
      email: user.email
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt
      },
      accessToken,
      refreshToken
    };
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id: userId }
    });
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, profileData: any): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        profile: profileData,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Delete user account
   */
  static async deleteUser(userId: string): Promise<void> {
    await prisma.user.delete({
      where: { id: userId }
    });
  }

  /**
   * Check if user exists by email
   */
  static async userExists(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    return !!user;
  }
}