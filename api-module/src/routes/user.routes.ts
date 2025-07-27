import { Router } from 'express';
import { UserController } from '@/controllers/user.controller';
import { validate } from '@/middleware/validation';
import { authenticate, authorize } from '@/middleware/auth';
import { conditionalAuth } from '@/middleware/authBypass';
import { authLimiter, strictLimiter } from '@/middleware/rateLimiter';
import config from '@/config/environment';
import {
  createUserSchema,
  updateUserSchema,
  getUserSchema,
  deleteUserSchema,
  getUsersSchema,
  loginSchema,
} from '@/schemas/user.schema';

const router = Router();
const userController = new UserController();

// Public routes
router.post('/register', authLimiter, validate(createUserSchema), userController.register);
router.post('/login', authLimiter, validate(loginSchema), userController.login);

// Protected routes - use conditional auth that bypasses SSO in development
const authMiddleware = config.SSO_BYPASS_DEV && config.NODE_ENV === 'development' 
  ? conditionalAuth 
  : authenticate;

router.use(authMiddleware);

// User profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateUserSchema), userController.updateProfile);
router.put('/change-password', strictLimiter, userController.changePassword);

// Admin-only routes
router.get('/', authorize(['ADMIN']), validate(getUsersSchema), userController.getUsers);
router.get('/:id', authorize(['ADMIN']), validate(getUserSchema), userController.getUser);
router.put('/:id', authorize(['ADMIN']), validate(updateUserSchema), userController.updateUser);
router.delete('/:id', authorize(['ADMIN']), validate(deleteUserSchema), userController.deleteUser);

export default router;