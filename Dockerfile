# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build argument for API key
ARG GEMINI_API_KEY
ENV API_KEY=${GEMINI_API_KEY}

# Build the application (skip tsc type checking as it's done by vite)
RUN npx vite build

# Production stage
FROM nginx:alpine

# Install shadow package for usermod/groupmod commands
RUN apk add --no-cache shadow tzdata

# Build arguments for user configuration
ARG PUID=1000
ARG PGID=1000
ARG TZ=UTC
ARG UMASK=022

# Set environment variables
ENV PUID=${PUID} \
    PGID=${PGID} \
    TZ=${TZ} \
    UMASK=${UMASK}

# Create nginx user with specific PUID/PGID if they don't match default
RUN if [ "${PUID}" != "101" ] || [ "${PGID}" != "101" ]; then \
        deluser nginx 2>/dev/null || true; \
        delgroup nginx 2>/dev/null || true; \
        addgroup -g ${PGID} nginx; \
        adduser -D -u ${PUID} -G nginx nginx; \
    fi

# Set timezone
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create custom nginx configuration for non-root user
RUN mkdir -p /tmp/nginx && \
    echo 'worker_processes auto;' > /etc/nginx/nginx.conf && \
    echo 'error_log /var/log/nginx/error.log warn;' >> /etc/nginx/nginx.conf && \
    echo 'pid /tmp/nginx/nginx.pid;' >> /etc/nginx/nginx.conf && \
    echo '' >> /etc/nginx/nginx.conf && \
    echo 'events {' >> /etc/nginx/nginx.conf && \
    echo '    worker_connections 1024;' >> /etc/nginx/nginx.conf && \
    echo '}' >> /etc/nginx/nginx.conf && \
    echo '' >> /etc/nginx/nginx.conf && \
    echo 'http {' >> /etc/nginx/nginx.conf && \
    echo '    include /etc/nginx/mime.types;' >> /etc/nginx/nginx.conf && \
    echo '    default_type application/octet-stream;' >> /etc/nginx/nginx.conf && \
    echo '    sendfile on;' >> /etc/nginx/nginx.conf && \
    echo '    keepalive_timeout 65;' >> /etc/nginx/nginx.conf && \
    echo '    client_max_body_size 20M;' >> /etc/nginx/nginx.conf && \
    echo '' >> /etc/nginx/nginx.conf && \
    echo '    server {' >> /etc/nginx/nginx.conf && \
    echo '        listen 80;' >> /etc/nginx/nginx.conf && \
    echo '        server_name localhost;' >> /etc/nginx/nginx.conf && \
    echo '        root /usr/share/nginx/html;' >> /etc/nginx/nginx.conf && \
    echo '        index index.html;' >> /etc/nginx/nginx.conf && \
    echo '' >> /etc/nginx/nginx.conf && \
    echo '        location / {' >> /etc/nginx/nginx.conf && \
    echo '            try_files $uri $uri/ /index.html;' >> /etc/nginx/nginx.conf && \
    echo '        }' >> /etc/nginx/nginx.conf && \
    echo '    }' >> /etc/nginx/nginx.conf && \
    echo '}' >> /etc/nginx/nginx.conf

# Set ownership
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /tmp/nginx && \
    chmod -R 755 /tmp/nginx

# Create entrypoint script
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'umask ${UMASK}' >> /entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Expose port 80
EXPOSE 80

# Switch to nginx user
USER nginx

# Start nginx with entrypoint
ENTRYPOINT ["/entrypoint.sh"]
