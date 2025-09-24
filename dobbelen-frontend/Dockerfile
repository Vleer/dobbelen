# Build stage - using Alpine for smaller size and ARM64 support
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Set Node.js memory limits for Raspberry Pi
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Copy package files
COPY package*.json ./

# Install all dependencies with reduced memory usage for Raspberry Pi
RUN npm ci --legacy-peer-deps --no-audit --no-fund --maxsockets 1 --prefer-offline

# Copy source code
COPY . .

# Build the application with reduced memory
RUN npm run build

# Production stage - using Alpine for smaller size and ARM64 support
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]