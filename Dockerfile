# ==========================================
# STAGE 1: Frontend Builder
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
# STAGE 2: Production Runtime Runner
# ==========================================
FROM node:22-slim

WORKDIR /app
COPY package*.json ./
# Install only production dependencies
RUN npm ci --omit=dev

# Copy Express server source code
COPY server/ ./server/

# Copy compiled frontend assets from Stage 1
COPY --from=builder /app/dist ./dist

# Create a dedicated directory for persistent SQLite data
RUN mkdir -p /data && chown -R node:node /data
VOLUME [ "/data" ]

# Configure execution environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/database.sqlite

EXPOSE 3000
USER node

CMD ["node", "server/index.js"]
