# Use Python 3.11 slim image
FROM python:3.11-slim

# Accept API key as build argument
ARG GEMINI_API_KEY
ARG API_KEY

WORKDIR /app

# Install system dependencies including Node.js for building frontend
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy frontend files
COPY package.json ./
COPY tsconfig.json tsconfig.node.json vite.config.ts ./
COPY index.html index.tsx App.tsx types.ts ./
COPY components/ ./components/
COPY services/ ./services/

# Install npm dependencies first
RUN npm install

# Set API_KEY environment variable for Vite build and run build
# Vite's defineConfig will read API_KEY at build time and bundle it into the frontend
# Use API_KEY if provided, otherwise use GEMINI_API_KEY
RUN if [ -n "$API_KEY" ]; then \
      export BUILD_API_KEY="$API_KEY"; \
    elif [ -n "$GEMINI_API_KEY" ]; then \
      export BUILD_API_KEY="$GEMINI_API_KEY"; \
    else \
      echo "WARNING: No API key provided during build. Frontend will require API key at runtime."; \
      export BUILD_API_KEY=""; \
    fi && \
    API_KEY="$BUILD_API_KEY" npm run build

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port 8002 (can be overridden with HOST_PORT or PORT env var)
EXPOSE 8002

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the application using entrypoint script
# The script validates HOST_PORT/PORT and defaults to 8002
CMD ["/entrypoint.sh"]
