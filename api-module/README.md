# Express.js API Module

A production-ready Express.js API module built with TypeScript, featuring comprehensive architecture patterns and enterprise-grade practices.

## 🏗️ Architecture

### Layer Separation
- **Controller Layer**: Request/response handling and validation
- **Service Layer**: Business logic and transaction management  
- **Repository Layer**: Data access and database operations
- **Middleware Layer**: Cross-cutting concerns (auth, logging, rate limiting)

### Key Features
- ✅ **Environment Configuration**: Zod-validated environment variables
- ✅ **Request/Response Validation**: Comprehensive Zod schemas
- ✅ **Global Middleware**: Logging, CORS, JSON parsing, rate limiting
- ✅ **Database Integration**: Prisma ORM with PostgreSQL
- ✅ **Authentication**: JWT-based auth with role-based access control
- ✅ **Error Handling**: Centralized error management with custom error types
- ✅ **Testing**: Unit tests (Jest) and integration tests for all endpoints
- ✅ **API Response Format**: Consistent `{ success, data?, error? }` structure

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

```bash
# Clone and install dependencies
cd api-module
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and other settings

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database with sample data
npm run prisma:seed

# Start development server
npm run dev
```

### Environment Variables

Required environment variables (see `.env.example`):

```env
DATABASE_URL="postgresql://username:password@localhost:5432/apidb"
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CORS_ORIGIN=http://localhost:3000
```

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication
Most endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Response Format
All responses follow this consistent structure:
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### Core Endpoints

#### Health Check
```http
GET /api/health
```

#### User Management
```http
POST /api/users/register
POST /api/users/login
GET /api/users/profile (authenticated)
PUT /api/users/profile (authenticated)
PUT /api/users/change-password (authenticated)

# Admin only
GET /api/users (admin)
GET /api/users/:id (admin)
PUT /api/users/:id (admin)
DELETE /api/users/:id (admin)
```

#### Post Management
```http
# Public
GET /api/posts/published
GET /api/posts/search?q=query
GET /api/posts/:id

# Authenticated
POST /api/posts (authenticated)
GET /api/posts (authenticated)
GET /api/posts/my/posts (authenticated)
PUT /api/posts/:id (authenticated)
DELETE /api/posts/:id (authenticated)
PATCH /api/posts/:id/publish (authenticated)
PATCH /api/posts/:id/unpublish (authenticated)
```

### Example Requests

#### Register User
```bash
curl -X POST http://localhost:3001/api/users/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "SecurePass123"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3001/api/users/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

#### Create Post
```bash
curl -X POST http://localhost:3001/api/posts \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "title": "My First Post",
    "content": "This is the content of my post",
    "published": true
  }'
```

## 🧪 Testing

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### All Tests with Coverage
```bash
npm run test:coverage
```

### Test Structure
- **Unit Tests**: Service layer business logic testing
- **Integration Tests**: End-to-end API endpoint testing
- **Test Database**: Separate test database for isolation

## 🏛️ Database Schema

### User Model
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  posts     Post[]
}
```

### Post Model
```prisma
model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 🔒 Security Features

- **Input Validation**: Zod schemas for all request data
- **Authentication**: JWT-based authentication system
- **Authorization**: Role-based access control (USER/ADMIN)
- **Rate Limiting**: Configurable rate limits per endpoint
- **Password Security**: bcrypt hashing with configurable rounds
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers middleware
- **Error Handling**: No sensitive data exposure in error responses

## 📁 Project Structure

```
src/
├── __tests__/           # Test files
│   ├── integration/     # Integration tests
│   ├── unit/           # Unit tests
│   └── setup.ts        # Test configuration
├── config/             # Configuration files
│   ├── database.ts     # Database connection
│   └── environment.ts  # Environment validation
├── controllers/        # Request handlers
├── middleware/         # Express middleware
├── repositories/       # Data access layer
├── routes/            # Route definitions
├── schemas/           # Zod validation schemas
├── services/          # Business logic
├── types/             # TypeScript types
├── utils/             # Utility functions
├── app.ts             # Express app setup
└── index.ts           # Server entry point
```

## 🔧 Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run prisma:studio # Open Prisma Studio
```

## 🚢 Production Deployment

### Build and Start
```bash
npm run build
npm start
```

### Environment Considerations
- Set `NODE_ENV=production`
- Use strong JWT secrets (32+ characters)
- Configure proper CORS origins
- Set up SSL/TLS certificates
- Use a production database
- Configure logging levels appropriately
- Set up monitoring and health checks

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## 📊 Monitoring

### Health Endpoint
The `/api/health` endpoint provides:
- Server status
- Database connectivity
- Memory usage
- Uptime information
- Environment details

### Logging
- Structured logging with Winston
- Request/response logging
- Error tracking
- Performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details.

---

Built with ❤️ using Express.js, TypeScript, Prisma, and enterprise-grade patterns.