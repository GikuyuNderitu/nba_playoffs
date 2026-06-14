# ==========================================
# STAGE 1: Production Dependencies Builder
# ==========================================
FROM node:22-slim AS deps-builder

WORKDIR /app
# Install build dependencies to compile sqlite3 from source
RUN apt-get update && apt-get install -y build-essential python3 && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev --build-from-source

# ==========================================
# STAGE 2: Frontend Builder
# ==========================================
FROM node:22-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Copy full source code
COPY . .

# Build Vite React frontend (outputs static assets to /app/dist)
RUN npm run build

# ==========================================
# STAGE 3: Production Runtime Runner
# ==========================================
FROM node:22-slim

WORKDIR /app
COPY package*.json ./

# Copy pre-compiled production dependencies from Stage 1
COPY --from=deps-builder /app/node_modules ./node_modules

# Copy Express server source code
COPY server/ ./server/

# Copy compiled frontend assets from Stage 2
COPY --from=builder /app/dist ./dist

# Create a dedicated directory for persistent SQLite data
RUN mkdir -p /data && chown -R node:node /data
VOLUME [ "/data" ]

# Make the start script executable
RUN chmod +x server/start.sh

# Build the pre-seeded SQLite database file during build time
RUN DATABASE_PATH=/app/seed_database.sqlite node server/seed.js

# Configure execution environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/database.sqlite

EXPOSE 3000
USER node

CMD ["/bin/sh", "server/start.sh"]
