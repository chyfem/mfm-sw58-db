# MFM SW58 CMS — Dockerfile for Back4app Containers
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy root package.json first (for dependency caching)
COPY package*.json ./

# Install ALL dependencies from root package.json
RUN npm install --production

# Copy everything else
COPY . .

# Expose port 8000
EXPOSE 8000

# Health check so Back4app knows when app is ready
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:8000/api/health || exit 1

# Start the server
CMD ["node", "backend/server.js"]
