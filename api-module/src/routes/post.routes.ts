import { Router } from 'express';
import { PostController } from '@/controllers/post.controller';
import { validate } from '@/middleware/validation';
import { authenticate, authorize } from '@/middleware/auth';
import {
  createPostSchema,
  updatePostSchema,
  getPostSchema,
  deletePostSchema,
  getPostsSchema,
} from '@/schemas/post.schema';

const router = Router();
const postController = new PostController();

// Public routes
router.get('/published', validate(getPostsSchema), postController.getPublishedPosts);
router.get('/search', postController.searchPosts);
router.get('/:id', validate(getPostSchema), postController.getPost);

// Protected routes
router.use(authenticate);

// User routes
router.post('/', validate(createPostSchema), postController.createPost);
router.get('/', validate(getPostsSchema), postController.getPosts);
router.get('/my/posts', postController.getMyPosts);
router.put('/:id', validate(updatePostSchema), postController.updatePost);
router.delete('/:id', validate(deletePostSchema), postController.deletePost);
router.patch('/:id/publish', validate(getPostSchema), postController.publishPost);
router.patch('/:id/unpublish', validate(getPostSchema), postController.unpublishPost);

export default router;