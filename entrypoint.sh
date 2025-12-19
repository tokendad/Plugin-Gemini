#!/bin/bash
set -e

# Read port from environment variable, defaulting to 8002
# Prefer HOST_PORT over PORT for backwards compatibility
PORT_VALUE="${HOST_PORT:-${PORT:-8002}}"

# Validate port is numeric and in valid range
if ! [[ "$PORT_VALUE" =~ ^[0-9]+$ ]] || [ "$PORT_VALUE" -lt 1 ] || [ "$PORT_VALUE" -gt 65535 ]; then
    echo "ERROR: Invalid port configuration: '$PORT_VALUE' is not a valid port (must be 1-65535)"
    echo "Using default port 8002"
    PORT_VALUE=8002
fi

# Start uvicorn with the validated port
exec uvicorn src.api:app --host 0.0.0.0 --port "$PORT_VALUE"
