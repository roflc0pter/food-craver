# Base image with Node.js 22.14.0 on Alpine Linux
FROM node:22.14.0-alpine AS base

WORKDIR /app

# Dependency installation stage
FROM base AS deps
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/. .
COPY . .
RUN yarn build

# Production stage
FROM node:22.14.0-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules

CMD ["node", "dist/main.js"]
