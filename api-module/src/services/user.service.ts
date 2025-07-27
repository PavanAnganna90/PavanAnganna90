import { User } from '@prisma/client';
import { UserRepository, UserFilters } from '@/repositories/user.repository';
import { PasswordService } from '@/utils/password';
import { JwtService, JwtPayload } from '@/utils/jwt';
import { AppError } from '@/middleware/errorHandler';
import { PaginationOptions, PaginatedResponse } from '@/types/api';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async createUser(data: {
    email: string;
    name: string;
    password?: string;
    role?: 'USER' | 'ADMIN';
    githubId?: string;
    githubLogin?: string;
    githubAccessToken?: string;
    avatar?: string;
    company?: string;
    location?: string;
    bio?: string;
    publicRepos?: number;
    followers?: number;
    following?: number;
  }): Promise<{ user: Omit<User, 'password'>; token: string }> {
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Hash password only if provided (GitHub OAuth users might not have passwords)
    const hashedPassword = data.password ? await PasswordService.hash(data.password) : null;

    const user = await this.userRepository.create({
      email: data.email,
      name: data.name,
      password: hashedPassword,
      role: data.role || 'USER',
      githubId: data.githubId,
      githubLogin: data.githubLogin,
      githubAccessToken: data.githubAccessToken,
      avatar: data.avatar,
      company: data.company,
      location: data.location,
      bio: data.bio,
      publicRepos: data.publicRepos,
      followers: data.followers,
      following: data.following,
    });

    const token = JwtService.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, token };
  }

  // Helper methods for SSO integration
  async create(data: {
    email: string;
    name: string;
    role?: 'USER' | 'ADMIN';
    githubId?: string;
    githubLogin?: string;
    githubAccessToken?: string;
  }): Promise<Omit<User, 'password'>> {
    return await this.userRepository.create({
      email: data.email,
      name: data.name,
      password: null, // No password for OAuth users
      role: data.role || 'USER',
      githubId: data.githubId,
      githubLogin: data.githubLogin,
      githubAccessToken: data.githubAccessToken,
    });
  }

  async findByEmail(email: string): Promise<Omit<User, 'password'> | null> {
    return await this.userRepository.findByEmail(email);
  }

  async update(id: string, data: {
    name?: string;
    githubId?: string;
    githubLogin?: string;
    githubAccessToken?: string;
    avatar?: string;
    company?: string;
    location?: string;
    bio?: string;
    publicRepos?: number;
    followers?: number;
    following?: number;
  }): Promise<Omit<User, 'password'>> {
    return await this.userRepository.update(id, data);
  }

  async findByGithubId(githubId: string): Promise<Omit<User, 'password'> | null> {
    return await this.userRepository.findByGithubId(githubId);
  }

  async getUserById(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async getUsers(
    filters: UserFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<Omit<User, 'password'>>> {
    const { users, total } = await this.userRepository.findMany(filters, pagination);
    
    const totalPages = Math.ceil(total / pagination.limit);

    return {
      success: true,
      data: users,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
      },
    };
  }

  async updateUser(
    id: string,
    data: {
      email?: string;
      name?: string;
      role?: 'USER' | 'ADMIN';
    }
  ): Promise<Omit<User, 'password'>> {
    const userExists = await this.userRepository.exists(id);
    if (!userExists) {
      throw new AppError('User not found', 404);
    }

    if (data.email) {
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser && existingUser.id !== id) {
        throw new AppError('Email already in use', 409);
      }
    }

    return this.userRepository.update(id, data);
  }

  async deleteUser(id: string): Promise<void> {
    const userExists = await this.userRepository.exists(id);
    if (!userExists) {
      throw new AppError('User not found', 404);
    }

    await this.userRepository.delete(id);
  }

  async findByGitHubLogin(githubLogin: string): Promise<User | null> {
    return this.userRepository.findByGithubLogin(githubLogin);
  }

  async login(email: string, password: string): Promise<{ user: Omit<User, 'password'>; token: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await PasswordService.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = JwtService.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const userWithPassword = await this.userRepository.findByEmail(user.email);
    if (!userWithPassword) {
      throw new AppError('User not found', 404);
    }

    const isCurrentPasswordValid = await PasswordService.compare(
      currentPassword,
      userWithPassword.password
    );
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    const passwordValidation = PasswordService.validate(newPassword);
    if (!passwordValidation.isValid) {
      throw new AppError(passwordValidation.errors.join(', '), 400);
    }

    const hashedNewPassword = await PasswordService.hash(newPassword);
    await this.userRepository.update(userId, { password: hashedNewPassword });
  }
}