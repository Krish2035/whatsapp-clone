# WhatsApp Clone Frontend Production Dockerfile
FROM node:20-alpine AS base

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Install dependencies based on package-lock.json
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Build arguments and environment variables for Next.js build
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
ARG NEXT_PUBLIC_AGORA_APP_ID=4876b5d9bc3741ec9cb33b3dcfdbca91

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
ENV NEXT_PUBLIC_AGORA_APP_ID=${NEXT_PUBLIC_AGORA_APP_ID}
ENV NODE_ENV=production
ENV PORT=3000

# Build Next.js application
RUN npm run build

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start Next.js production server
CMD ["npm", "start"]
