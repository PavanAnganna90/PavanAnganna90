# =============================================================================
# OpsSight API Module - Dockerfile for Production and Development
# =============================================================================
# Multi-stage build for Node.js TypeScript application
# =============================================================================

FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    ca-certificates \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development

# Install all dependencies including dev dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY prisma/ ./prisma/

# Build the application
RUN npm run build

# Expose port
EXPOSE 3001

# Start development server with hot reload
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Copy built application from development stage
COPY --from=development /app/dist ./dist
COPY --from=development /app/prisma ./prisma

# Copy source for any runtime requirements
COPY src/ ./src/

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]