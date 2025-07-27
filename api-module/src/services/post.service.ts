import { Post } from '@prisma/client';
import { PostRepository, PostFilters, PostWithAuthor } from '@/repositories/post.repository';
import { UserRepository } from '@/repositories/user.repository';
import { AppError } from '@/middleware/errorHandler';
import { PaginationOptions, PaginatedResponse } from '@/types/api';

export class PostService {
  private postRepository: PostRepository;
  private userRepository: UserRepository;

  constructor() {
    this.postRepository = new PostRepository();
    this.userRepository = new UserRepository();
  }

  async createPost(
    authorId: string,
    data: {
      title: string;
      content?: string;
      published?: boolean;
    }
  ): Promise<PostWithAuthor> {
    const authorExists = await this.userRepository.exists(authorId);
    if (!authorExists) {
      throw new AppError('Author not found', 404);
    }

    return this.postRepository.create({
      title: data.title,
      content: data.content,
      published: data.published || false,
      author: {
        connect: { id: authorId },
      },
    });
  }

  async getPostById(id: string): Promise<PostWithAuthor> {
    const post = await this.postRepository.findById(id);
    if (!post) {
      throw new AppError('Post not found', 404);
    }
    return post;
  }

  async getPosts(
    filters: PostFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<PostWithAuthor>> {
    const { posts, total } = await this.postRepository.findMany(filters, pagination);
    
    const totalPages = Math.ceil(total / pagination.limit);

    return {
      success: true,
      data: posts,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
      },
    };
  }

  async updatePost(
    id: string,
    authorId: string,
    data: {
      title?: string;
      content?: string;
      published?: boolean;
    },
    isAdmin: boolean = false
  ): Promise<PostWithAuthor> {
    const postExists = await this.postRepository.exists(id);
    if (!postExists) {
      throw new AppError('Post not found', 404);
    }

    if (!isAdmin) {
      const isOwner = await this.postRepository.isOwner(id, authorId);
      if (!isOwner) {
        throw new AppError('You can only update your own posts', 403);
      }
    }

    return this.postRepository.update(id, data);
  }

  async deletePost(id: string, userId: string, isAdmin: boolean = false): Promise<void> {
    const postExists = await this.postRepository.exists(id);
    if (!postExists) {
      throw new AppError('Post not found', 404);
    }

    if (!isAdmin) {
      const isOwner = await this.postRepository.isOwner(id, userId);
      if (!isOwner) {
        throw new AppError('You can only delete your own posts', 403);
      }
    }

    await this.postRepository.delete(id);
  }

  async getUserPosts(userId: string): Promise<Post[]> {
    const userExists = await this.userRepository.exists(userId);
    if (!userExists) {
      throw new AppError('User not found', 404);
    }

    return this.postRepository.findByAuthor(userId);
  }

  async publishPost(id: string, authorId: string, isAdmin: boolean = false): Promise<PostWithAuthor> {
    return this.updatePost(id, authorId, { published: true }, isAdmin);
  }

  async unpublishPost(id: string, authorId: string, isAdmin: boolean = false): Promise<PostWithAuthor> {
    return this.updatePost(id, authorId, { published: false }, isAdmin);
  }

  async getPublishedPosts(pagination: PaginationOptions): Promise<PaginatedResponse<PostWithAuthor>> {
    return this.getPosts({ published: true }, pagination);
  }

  async searchPosts(
    query: string,
    pagination: PaginationOptions,
    publishedOnly: boolean = true
  ): Promise<PaginatedResponse<PostWithAuthor>> {
    const filters: PostFilters = { search: query };
    if (publishedOnly) {
      filters.published = true;
    }

    return this.getPosts(filters, pagination);
  }
}