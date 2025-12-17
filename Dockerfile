# Use Python 3.11 slim image
FROM python:3.11-slim

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

# Install and build frontend
RUN npm install && npm run build

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
