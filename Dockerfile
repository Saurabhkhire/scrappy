# Dockerfile — for Fly.io, Koyeb, or any Docker host
# Includes Python 3 so Python scrapers work out of the box

FROM node:20-slim

# Install Python for scraper execution
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy server source
COPY server/ ./server/

# Create data directory for SQLite
RUN mkdir -p /app/data

WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/scrappy.db
ENV PYTHON_CMD=python3

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:3001/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "index.js"]
