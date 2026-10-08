# WhatsApp Clone Backend Production Dockerfile
FROM node:20-alpine AS base

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Install dependencies with caching layer
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY . .

# Ensure uploads directory exists and is writable
RUN mkdir -p uploads && chmod 777 uploads

# Non-root user for security
USER node

# Expose server port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start backend server
CMD ["node", "src/server.js"]
