import { Post, Prisma } from '@prisma/client';
import DatabaseService from '@/config/database';
import { PaginationOptions } from '@/types/api';

export interface PostFilters {
  published?: boolean;
  authorId?: string;
  search?: string;
}

export type PostWithAuthor = Post & {
  author: {
    id: string;
    name: string;
    email: string;
  };
};

export class PostRepository {
  private db = DatabaseService.getInstance().getClient();

  async create(data: Prisma.PostCreateInput): Promise<PostWithAuthor> {
    return this.db.post.create({
      data,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<PostWithAuthor | null> {
    return this.db.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findMany(
    filters: PostFilters = {},
    pagination: PaginationOptions
  ): Promise<{ posts: PostWithAuthor[]; total: number }> {
    const where: Prisma.PostWhereInput = {};

    if (typeof filters.published === 'boolean') {
      where.published = filters.published;
    }

    if (filters.authorId) {
      where.authorId = filters.authorId;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      this.db.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.post.count({ where }),
    ]);

    return { posts, total };
  }

  async findByAuthor(authorId: string): Promise<Post[]> {
    return this.db.post.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: Prisma.PostUpdateInput): Promise<PostWithAuthor> {
    return this.db.post.update({
      where: { id },
      data,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.post.delete({
      where: { id },
    });
  }

  async exists(id: string): Promise<boolean> {
    const post = await this.db.post.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!post;
  }

  async isOwner(postId: string, userId: string): Promise<boolean> {
    const post = await this.db.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    return post?.authorId === userId;
  }

  async executeInTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.db.$transaction(operation);
  }
}