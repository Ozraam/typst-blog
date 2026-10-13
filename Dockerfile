# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

# Compile SvelteKit app to Node.js standalone build
RUN npm run build
RUN npm prune --production

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV BODY_SIZE_LIMIT=25M

# Copy built application and production dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/static ./static

# Create persistent storage directories
RUN mkdir -p /app/data/uploads

VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "build"]
