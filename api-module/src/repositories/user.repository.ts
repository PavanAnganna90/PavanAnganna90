import { User, Prisma } from '@prisma/client';
import DatabaseService from '@/config/database';
import { PaginationOptions } from '@/types/api';

export interface UserFilters {
  role?: string;
  search?: string;
}

export class UserRepository {
  private db = DatabaseService.getInstance().getClient();

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.db.user.create({
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        githubId: true,
        githubLogin: true,
        avatar: true,
        company: true,
        location: true,
        bio: true,
        publicRepos: true,
        followers: true,
        following: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as Promise<User>;
  }

  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        githubId: true,
        githubLogin: true,
        avatar: true,
        company: true,
        location: true,
        bio: true,
        publicRepos: true,
        followers: true,
        following: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as Promise<User | null>;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        githubId: true,
        githubLogin: true,
        avatar: true,
        company: true,
        location: true,
        bio: true,
        publicRepos: true,
        followers: true,
        following: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as Promise<User | null>;
  }

  async findByGithubId(githubId: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { githubId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        githubId: true,
        githubLogin: true,
        avatar: true,
        company: true,
        location: true,
        bio: true,
        publicRepos: true,
        followers: true,
        following: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as Promise<User | null>;
  }

  async findByGithubLogin(githubLogin: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { githubLogin },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        githubId: true,
        githubLogin: true,
        githubAccessToken: true,
        avatar: true,
        company: true,
        location: true,
        bio: true,
        publicRepos: true,
        followers: true,
        following: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as Promise<User | null>;
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        githubId: true,
        githubLogin: true,
        avatar: true,
        company: true,
        location: true,
        bio: true,
        publicRepos: true,
        followers: true,
        following: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as Promise<User>;
  }

  async findMany(
    filters: UserFilters = {},
    pagination: PaginationOptions
  ): Promise<{ users: User[]; total: number }> {
    const where: Prisma.UserWhereInput = {};

    if (filters.role) {
      where.role = filters.role as any;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.user.count({ where }),
    ]);

    return { users: users as User[], total };
  }


  async delete(id: string): Promise<void> {
    await this.db.user.delete({
      where: { id },
    });
  }

  async exists(id: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!user;
  }

  async executeInTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.db.$transaction(operation);
  }
}