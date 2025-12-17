# Use Python 3.11 slim image
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/

# Expose port 8002 (can be overridden with HOST_PORT or PORT env var)
EXPOSE 8002

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the application
# Use shell form to allow environment variable substitution
# Prefer HOST_PORT, fall back to PORT, default to 8002
CMD uvicorn src.api:app --host 0.0.0.0 --port ${HOST_PORT:-${PORT:-8002}}
