import { UserService } from '@/services/user.service';
import { UserRepository } from '@/repositories/user.repository';
import { PasswordService } from '@/utils/password';
import { JwtService } from '@/utils/jwt';
import { AppError } from '@/middleware/errorHandler';

jest.mock('@/repositories/user.repository');
jest.mock('@/utils/password');
jest.mock('@/utils/jwt');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    userService = new UserService();
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    (userService as any).userRepository = mockUserRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'Password123',
      role: 'USER' as const,
    };

    const hashedPassword = 'hashedPassword123';
    const mockUser = {
      id: 'user123',
      email: userData.email,
      name: userData.name,
      role: userData.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockToken = 'mockJwtToken';

    it('should create a new user successfully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (PasswordService.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUserRepository.create.mockResolvedValue(mockUser as any);
      (JwtService.generateToken as jest.Mock).mockReturnValue(mockToken);

      const result = await userService.createUser(userData);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(PasswordService.hash).toHaveBeenCalledWith(userData.password);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        role: userData.role,
      });
      expect(JwtService.generateToken).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result).toEqual({
        user: mockUser,
        token: mockToken,
      });
    });

    it('should throw AppError if user already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);

      await expect(userService.createUser(userData)).rejects.toThrow(
        new AppError('User with this email already exists', 409)
      );

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(PasswordService.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    const userId = 'user123';
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return user when found', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser as any);

      const result = await userService.getUserById(userId);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should throw AppError when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserById(userId)).rejects.toThrow(
        new AppError('User not found', 404)
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('login', () => {
    const email = 'test@example.com';
    const password = 'Password123';
    const hashedPassword = 'hashedPassword123';
    const mockUser = {
      id: 'user123',
      email,
      name: 'Test User',
      password: hashedPassword,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockToken = 'mockJwtToken';

    it('should login successfully with valid credentials', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);
      (PasswordService.compare as jest.Mock).mockResolvedValue(true);
      (JwtService.generateToken as jest.Mock).mockReturnValue(mockToken);

      const result = await userService.login(email, password);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(PasswordService.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(JwtService.generateToken).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
        token: mockToken,
      });
    });

    it('should throw AppError when user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(userService.login(email, password)).rejects.toThrow(
        new AppError('Invalid credentials', 401)
      );

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(PasswordService.compare).not.toHaveBeenCalled();
    });

    it('should throw AppError when password is invalid', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);
      (PasswordService.compare as jest.Mock).mockResolvedValue(false);

      await expect(userService.login(email, password)).rejects.toThrow(
        new AppError('Invalid credentials', 401)
      );

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(PasswordService.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(JwtService.generateToken).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    const userId = 'user123';
    const updateData = {
      name: 'Updated Name',
      email: 'updated@example.com',
    };
    const mockUpdatedUser = {
      id: userId,
      email: updateData.email,
      name: updateData.name,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update user successfully', async () => {
      mockUserRepository.exists.mockResolvedValue(true);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(mockUpdatedUser as any);

      const result = await userService.updateUser(userId, updateData);

      expect(mockUserRepository.exists).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(updateData.email);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateData);
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should throw AppError when user not found', async () => {
      mockUserRepository.exists.mockResolvedValue(false);

      await expect(userService.updateUser(userId, updateData)).rejects.toThrow(
        new AppError('User not found', 404)
      );

      expect(mockUserRepository.exists).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should throw AppError when email already exists', async () => {
      const existingUser = { id: 'other123', email: updateData.email };
      mockUserRepository.exists.mockResolvedValue(true);
      mockUserRepository.findByEmail.mockResolvedValue(existingUser as any);

      await expect(userService.updateUser(userId, updateData)).rejects.toThrow(
        new AppError('Email already in use', 409)
      );

      expect(mockUserRepository.exists).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(updateData.email);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    const userId = 'user123';

    it('should delete user successfully', async () => {
      mockUserRepository.exists.mockResolvedValue(true);
      mockUserRepository.delete.mockResolvedValue();

      await userService.deleteUser(userId);

      expect(mockUserRepository.exists).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
    });

    it('should throw AppError when user not found', async () => {
      mockUserRepository.exists.mockResolvedValue(false);

      await expect(userService.deleteUser(userId)).rejects.toThrow(
        new AppError('User not found', 404)
      );

      expect(mockUserRepository.exists).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });
  });
});