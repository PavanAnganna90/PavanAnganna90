import { PostService } from '@/services/post.service';
import { PostRepository } from '@/repositories/post.repository';
import { UserRepository } from '@/repositories/user.repository';
import { AppError } from '@/middleware/errorHandler';

jest.mock('@/repositories/post.repository');
jest.mock('@/repositories/user.repository');

describe('PostService', () => {
  let postService: PostService;
  let mockPostRepository: jest.Mocked<PostRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    postService = new PostService();
    mockPostRepository = new PostRepository() as jest.Mocked<PostRepository>;
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    (postService as any).postRepository = mockPostRepository;
    (postService as any).userRepository = mockUserRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    const authorId = 'author123';
    const postData = {
      title: 'Test Post',
      content: 'Test content',
      published: true,
    };
    const mockPost = {
      id: 'post123',
      title: postData.title,
      content: postData.content,
      published: postData.published,
      authorId,
      author: {
        id: authorId,
        name: 'Test Author',
        email: 'author@example.com',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a post successfully', async () => {
      mockUserRepository.exists.mockResolvedValue(true);
      mockPostRepository.create.mockResolvedValue(mockPost as any);

      const result = await postService.createPost(authorId, postData);

      expect(mockUserRepository.exists).toHaveBeenCalledWith(authorId);
      expect(mockPostRepository.create).toHaveBeenCalledWith({
        title: postData.title,
        content: postData.content,
        published: postData.published,
        author: {
          connect: { id: authorId },
        },
      });
      expect(result).toEqual(mockPost);
    });

    it('should throw AppError when author not found', async () => {
      mockUserRepository.exists.mockResolvedValue(false);

      await expect(postService.createPost(authorId, postData)).rejects.toThrow(
        new AppError('Author not found', 404)
      );

      expect(mockUserRepository.exists).toHaveBeenCalledWith(authorId);
      expect(mockPostRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getPostById', () => {
    const postId = 'post123';
    const mockPost = {
      id: postId,
      title: 'Test Post',
      content: 'Test content',
      published: true,
      authorId: 'author123',
      author: {
        id: 'author123',
        name: 'Test Author',
        email: 'author@example.com',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return post when found', async () => {
      mockPostRepository.findById.mockResolvedValue(mockPost as any);

      const result = await postService.getPostById(postId);

      expect(mockPostRepository.findById).toHaveBeenCalledWith(postId);
      expect(result).toEqual(mockPost);
    });

    it('should throw AppError when post not found', async () => {
      mockPostRepository.findById.mockResolvedValue(null);

      await expect(postService.getPostById(postId)).rejects.toThrow(
        new AppError('Post not found', 404)
      );

      expect(mockPostRepository.findById).toHaveBeenCalledWith(postId);
    });
  });

  describe('updatePost', () => {
    const postId = 'post123';
    const authorId = 'author123';
    const updateData = {
      title: 'Updated Title',
      content: 'Updated content',
    };
    const mockUpdatedPost = {
      id: postId,
      title: updateData.title,
      content: updateData.content,
      published: true,
      authorId,
      author: {
        id: authorId,
        name: 'Test Author',
        email: 'author@example.com',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update post successfully when user is owner', async () => {
      mockPostRepository.exists.mockResolvedValue(true);
      mockPostRepository.isOwner.mockResolvedValue(true);
      mockPostRepository.update.mockResolvedValue(mockUpdatedPost as any);

      const result = await postService.updatePost(postId, authorId, updateData);

      expect(mockPostRepository.exists).toHaveBeenCalledWith(postId);
      expect(mockPostRepository.isOwner).toHaveBeenCalledWith(postId, authorId);
      expect(mockPostRepository.update).toHaveBeenCalledWith(postId, updateData);
      expect(result).toEqual(mockUpdatedPost);
    });

    it('should update post successfully when user is admin', async () => {
      mockPostRepository.exists.mockResolvedValue(true);
      mockPostRepository.update.mockResolvedValue(mockUpdatedPost as any);

      const result = await postService.updatePost(postId, authorId, updateData, true);

      expect(mockPostRepository.exists).toHaveBeenCalledWith(postId);
      expect(mockPostRepository.isOwner).not.toHaveBeenCalled();
      expect(mockPostRepository.update).toHaveBeenCalledWith(postId, updateData);
      expect(result).toEqual(mockUpdatedPost);
    });

    it('should throw AppError when post not found', async () => {
      mockPostRepository.exists.mockResolvedValue(false);

      await expect(postService.updatePost(postId, authorId, updateData)).rejects.toThrow(
        new AppError('Post not found', 404)
      );

      expect(mockPostRepository.exists).toHaveBeenCalledWith(postId);
      expect(mockPostRepository.update).not.toHaveBeenCalled();
    });

    it('should throw AppError when user is not owner and not admin', async () => {
      mockPostRepository.exists.mockResolvedValue(true);
      mockPostRepository.isOwner.mockResolvedValue(false);

      await expect(postService.updatePost(postId, authorId, updateData)).rejects.toThrow(
        new AppError('You can only update your own posts', 403)
      );

      expect(mockPostRepository.exists).toHaveBeenCalledWith(postId);
      expect(mockPostRepository.isOwner).toHaveBeenCalledWith(postId, authorId);
      expect(mockPostRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deletePost', () => {
    const postId = 'post123';
    const userId = 'user123';

    it('should delete post successfully when user is owner', async () => {
      mockPostRepository.exists.mockResolvedValue(true);
      mockPostRepository.isOwner.mockResolvedValue(true);
      mockPostRepository.delete.mockResolvedValue();

      await postService.deletePost(postId, userId);

      expect(mockPostRepository.exists).toHaveBeenCalledWith(postId);
      expect(mockPostRepository.isOwner).toHaveBeenCalledWith(postId, userId);
      expect(mockPostRepository.delete).toHaveBeenCalledWith(postId);
    });

    it('should delete post successfully when user is admin', async () => {
      mockPostRepository.exists.mockResolvedValue(true);
      mockPostRepository.delete.mockResolvedValue();

      await postService.deletePost(postId, userId, true);

      expect(mockPostRepository.exists).toHaveBeenCalledWith(postId);
      expect(mockPostRepository.isOwner).not.toHaveBeenCalled();
      expect(mockPostRepository.delete).toHaveBeenCalledWith(postId);
    });

    it('should throw AppError when post not found', async () => {
      mockPostRepository.exists.mockResolvedValue(false);

      await expect(postService.deletePost(postId, userId)).rejects.toThrow(
        new AppError('Post not found', 404)
      );

      expect(mockPostRepository.exists).toHaveBeenCalledWith(postId);
      expect(mockPostRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw AppError when user is not owner and not admin', async () => {
      mockPostRepository.exists.mockResolvedValue(true);
      mockPostRepository.isOwner.mockResolvedValue(false);

      await expect(postService.deletePost(postId, userId)).rejects.toThrow(
        new AppError('You can only delete your own posts', 403)
      );

      expect(mockPostRepository.exists).toHaveBeenCalledWith(postId);
      expect(mockPostRepository.isOwner).toHaveBeenCalledWith(postId, userId);
      expect(mockPostRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getUserPosts', () => {
    const userId = 'user123';
    const mockPosts = [
      {
        id: 'post1',
        title: 'Post 1',
        content: 'Content 1',
        published: true,
        authorId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'post2',
        title: 'Post 2',
        content: 'Content 2',
        published: false,
        authorId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return user posts successfully', async () => {
      mockUserRepository.exists.mockResolvedValue(true);
      mockPostRepository.findByAuthor.mockResolvedValue(mockPosts as any);

      const result = await postService.getUserPosts(userId);

      expect(mockUserRepository.exists).toHaveBeenCalledWith(userId);
      expect(mockPostRepository.findByAuthor).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockPosts);
    });

    it('should throw AppError when user not found', async () => {
      mockUserRepository.exists.mockResolvedValue(false);

      await expect(postService.getUserPosts(userId)).rejects.toThrow(
        new AppError('User not found', 404)
      );

      expect(mockUserRepository.exists).toHaveBeenCalledWith(userId);
      expect(mockPostRepository.findByAuthor).not.toHaveBeenCalled();
    });
  });
});