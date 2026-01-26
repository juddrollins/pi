# Dockerfile
FROM node:20-slim

# Install system dependencies for systeminformation
RUN apt-get update && apt-get install -y --no-install-recommends \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged user
RUN useradd -m appuser

# Create app directory and data directory
WORKDIR /app
RUN mkdir -p /app/data && chown -R appuser:appuser /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY index.js ./

# Set ownership
RUN chown -R appuser:appuser /app

# Expose port
EXPOSE 8080

# Switch to unprivileged user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the application
CMD ["node", "index.js"]
