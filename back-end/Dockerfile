# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.13.1

# --- Build Stage ---
FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app

# Install dependencies (only package.json and package-lock.json for cache efficiency)
COPY --link package.json package-lock.json ./

# Use npm cache for faster installs
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source files
COPY --link tsconfig.json nest-cli.json ./
COPY --link src ./src

# If there are other assets needed for build (e.g., public, migrations), copy them here
# COPY --link public ./public

# Build the app (NestJS compiles TypeScript to dist/)
RUN npm run build

# Remove dev dependencies and reinstall only production dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# --- Production Stage ---
FROM node:${NODE_VERSION}-slim AS final
WORKDIR /app

# Security: create non-root user
RUN addgroup --system appgroup && adduser --system appuser --ingroup appgroup

# Copy built app and production node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/nest-cli.json ./

# If you need static assets, uploads, etc., copy them here (if not .gitignored)
COPY --from=builder /app/uploads ./uploads

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]
