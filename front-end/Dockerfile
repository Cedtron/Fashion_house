# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.13.1

# Build stage
FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app

# Copy only package.json and package-lock.json for dependency installation
COPY --link package.json package-lock.json ./

# Install dependencies with cache for faster builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy the rest of the application source code
COPY --link . .

# Build the production-ready static files (assumes Vite or similar)
RUN --mount=type=cache,target=/root/.npm \
    npm run build

# Production stage
FROM node:${NODE_VERSION}-slim AS final
WORKDIR /app

# Create a non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Copy only the built assets and necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/index.html ./index.html

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

USER appuser

EXPOSE 5173

CMD ["npm", "start"]
