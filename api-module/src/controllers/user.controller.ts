import { Request, Response, NextFunction } from 'express';
import { UserService } from '@/services/user.service';
import { ApiResponse } from '@/types/api';
import { AuthRequest } from '@/middleware/auth';
import {
  CreateUserInput,
  UpdateUserInput,
  GetUserInput,
  DeleteUserInput,
  GetUsersInput,
  LoginInput,
} from '@/schemas/user.schema';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  register = async (
    req: Request<{}, {}, CreateUserInput['body']>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { user, token } = await this.userService.createUser(req.body);

      const response: ApiResponse = {
        success: true,
        data: { user, token },
        message: 'User registered successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request<{}, {}, LoginInput['body']>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, password } = req.body;
      const { user, token } = await this.userService.login(email, password);

      const response: ApiResponse = {
        success: true,
        data: { user, token },
        message: 'Login successful',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await this.userService.getUserById(req.user!.id);

      const response: ApiResponse = {
        success: true,
        data: user,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getUser = async (
    req: Request<GetUserInput['params']>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await this.userService.getUserById(req.params.id);

      const response: ApiResponse = {
        success: true,
        data: user,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getUsers = async (
    req: Request<{}, {}, {}, GetUsersInput['query']>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { page, limit, role, search } = req.query;
      
      const result = await this.userService.getUsers(
        { role, search },
        { page, limit }
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  updateUser = async (
    req: Request<UpdateUserInput['params'], {}, UpdateUserInput['body']>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await this.userService.updateUser(req.params.id, req.body);

      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'User updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (
    req: AuthRequest<{}, {}, Partial<UpdateUserInput['body']>>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await this.userService.updateUser(req.user!.id, req.body);

      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'Profile updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  deleteUser = async (
    req: Request<DeleteUserInput['params']>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.userService.deleteUser(req.params.id);

      const response: ApiResponse = {
        success: true,
        message: 'User deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (
    req: AuthRequest<{}, {}, { currentPassword: string; newPassword: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      await this.userService.changePassword(
        req.user!.id,
        currentPassword,
        newPassword
      );

      const response: ApiResponse = {
        success: true,
        message: 'Password changed successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}