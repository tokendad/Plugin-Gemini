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

# Expose port 8002
EXPOSE 8002

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the application
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8002"]
