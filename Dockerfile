# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build argument for API key
ARG GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=${GEMINI_API_KEY}

# Build the application
RUN npm run build

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

# Set ownership
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

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
