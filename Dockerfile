# Stage 1: build
FROM node:22-alpine AS builder

WORKDIR /app

# Toolchain for the better-sqlite3 native module
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

# Stage 2: runtime
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV BODY_SIZE_LIMIT=26M

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build

# Database, uploads and Typst fonts (downloaded on first start) live in the volume
RUN mkdir -p /app/data/uploads /app/data/fonts
VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "build"]
