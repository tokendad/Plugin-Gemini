# Docker Instructions for NesVentory Dept 56 Plugin

This project is containerized using Docker and Nginx, providing an easy way to deploy and run the Department 56 village collectibles recognition application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Configuration Options](#configuration-options)
- [Running with Docker Compose](#running-with-docker-compose)
- [Running with Docker CLI](#running-with-docker-cli)
- [Volume Mounts](#volume-mounts)
- [User and Permission Configuration](#user-and-permission-configuration)
- [Timezone Configuration](#timezone-configuration)
- [Troubleshooting](#troubleshooting)
- [GitHub Actions Workflow](#github-actions-workflow)
- [Development](#development)

## Prerequisites

- Docker (version 20.10 or higher recommended)
- Docker Compose (version 2.0 or higher recommended)
- A Google Gemini API key ([Get one here](https://ai.google.dev/))

## Quick Start

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/tokendad/Plugin-Gemini.git
   cd Plugin-Gemini
   ```

2. **Create your environment configuration**:
   ```bash
   cp .env.example .env
   ```

3. **Edit the `.env` file** and add your Gemini API key:
   ```bash
   nano .env  # or use your preferred editor
   ```
   
   Update at minimum:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Start the application**:
   ```bash
   docker-compose up --build
   ```

5. **Access the application**:
   Open your browser to [http://localhost:8002](http://localhost:8002)

## Environment Variables

The application uses several environment variables for configuration. All variables can be set in a `.env` file.

### Required Variables

| Variable | Description | Example |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Required**. Your Google Gemini API Key | `AIzaSyABC123...` |

### Optional Variables

| Variable | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `TZ` | Container timezone | `UTC` | `America/New_York` |
| `PUID` | Process User ID | `1000` | `1000` |
| `PGID` | Process Group ID | `1000` | `1000` |
| `UMASK` | File permission mask | `022` | `022` |
| `HOST_PORT` | Host port mapping | `8080` | `8080` |

**📖 For detailed information about each variable, see [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)**

**Important Note on Runtime Configuration**:
The API key is now configured at **runtime** instead of build time. This means:
1. **No rebuild required**: You can change your API key by simply updating the `.env` file and recreating the container
2. **Both frontend and backend**: The `GEMINI_API_KEY` is used by both the Python FastAPI backend and served to the React frontend at runtime
3. **Easy updates**: Simply run `docker-compose down && docker-compose up -d` after changing the API key in your `.env` file (Note: `docker-compose restart` does not reload the `.env` file)

The provided `docker-compose.yml` file handles this automatically by passing the variable as a runtime environment variable.

## Configuration Options

### Basic Configuration

The simplest configuration requires only the API key:

```env
GEMINI_API_KEY=your_actual_api_key_here
```

### Full Configuration Example

For complete control over all options:

```env
# Required
GEMINI_API_KEY=your_actual_api_key_here

# Timezone (see list of valid timezones in ENVIRONMENT_VARIABLES.md)
TZ=America/Chicago

# User/Group IDs (run 'id -u' and 'id -g' to find yours)
PUID=1000
PGID=1000

# File permissions (022 is standard)
UMASK=022

# Port mapping
HOST_PORT=8080
```

## Running with Docker Compose

Docker Compose is the recommended way to run this application.

### Using .env file (Recommended)

1. Ensure your `.env` file is configured
2. Run:
   ```bash
   docker-compose up --build
   ```

### Passing variables inline

You can override environment variables on the command line:

```bash
GEMINI_API_KEY=your_key_here TZ=America/New_York docker-compose up --build
```

### Running in detached mode

To run the container in the background:

```bash
docker-compose up -d --build
```

### Viewing logs

```bash
docker-compose logs -f
```

### Stopping the application

```bash
docker-compose down
```

### Rebuilding after changes

### Changing the API key

If you change the API key, simply update your `.env` file and restart:

```bash
docker-compose restart
```

No rebuild is necessary since the API key is now configured at runtime.

## Running with Docker CLI

If you prefer to use Docker directly without Docker Compose:

### Build the image

```bash
docker build -t nesventory-d56 .
```

### Run the container

```bash
docker run -d \
  --name nesventory-plugin \
  -p 8002:8002 \
  -e GEMINI_API_KEY=your_actual_api_key_here \
  -e TZ=UTC \
  -e PUID=1000 \
  -e PGID=1000 \
  -v /etc/localtime:/etc/localtime:ro \
  nesventory-d56
```

### Access the application

Open your browser to [http://localhost:8002](http://localhost:8002)

## Volume Mounts

### Timezone Synchronization

The `/etc/localtime` volume is automatically mounted in docker-compose.yml:

```yaml
volumes:
  - /etc/localtime:/etc/localtime:ro
```

This ensures the container's time matches your host system time.

### Persistent Data (Future Use)

A data directory mount is available but commented out by default:

```yaml
volumes:
  - ./data:/usr/share/nginx/html/data
```

Uncomment this line in `docker-compose.yml` if you need persistent data storage.

## User and Permission Configuration

### Why Configure User/Group IDs?

When Docker creates files, they're owned by the user/group running inside the container. To prevent permission issues with mounted volumes, you can configure the container to run as your host user.

### Finding Your IDs

```bash
id -u  # Shows your user ID (PUID)
id -g  # Shows your group ID (PGID)
```

### Setting Custom IDs

Update your `.env` file:

```env
PUID=1001
PGID=1001
```

Then rebuild:

```bash
docker-compose up --build
```

### Understanding UMASK

UMASK controls default file permissions:

- `022` (default) - Files: 644 (rw-r--r--), Directories: 755 (rwxr-xr-x)
- `002` - Files: 664 (rw-rw-r--), Directories: 775 (rwxrwxr-x)
- `077` - Files: 600 (rw-------), Directories: 700 (rwx------)

## Timezone Configuration

### Method 1: TZ Environment Variable

Set in your `.env` file:

```env
TZ=America/New_York
```

### Method 2: Volume Mount

Already configured in docker-compose.yml:

```yaml
volumes:
  - /etc/localtime:/etc/localtime:ro
```

### Method 3: Both (Recommended)

Use both methods for maximum compatibility:

```env
TZ=America/New_York
```

Plus the volume mount (already in docker-compose.yml).

### Verifying Timezone

Check the container's timezone:

```bash
docker exec nesventory-plugin date
```

## Troubleshooting

### Port Already in Use

If port 8080 is already in use:

1. Change `HOST_PORT` in your `.env` file:
   ```env
   HOST_PORT=8081
   ```
2. Restart: `docker-compose up -d`

### API Key Not Working

If you change the API key:

1. Update `GEMINI_API_KEY` in `.env`
2. **Recreate the container** to reload environment variables:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

The API key is now configured at runtime, so no rebuild is necessary. Note: `docker-compose restart` does not reload the `.env` file, so you must use `down` and `up` to apply the new API key.

### Permission Denied Errors

If you see permission errors:

1. Find your user/group IDs: `id -u` and `id -g`
2. Update in `.env`:
   ```env
   PUID=your_user_id
   PGID=your_group_id
   ```
3. Rebuild: `docker-compose up --build`

### Container Won't Start

Check logs:

```bash
docker-compose logs -f
```

Common issues:
- Missing or invalid API key
- Port conflict
- Invalid timezone string

### Time/Timezone Issues

1. Verify timezone string is correct (see [list of timezones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones))
2. Check if `/etc/localtime` exists on your host
3. Verify inside container:
   ```bash
   docker exec nesventory-plugin date
   docker exec nesventory-plugin cat /etc/timezone
   ```

### Rebuilding from Scratch

To completely rebuild without cache:

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## GitHub Actions Workflow

This repository includes a GitHub Actions workflow for automatically building and pushing Docker images to a container registry.

**See [.github/workflows/README.md](.github/workflows/README.md) for detailed instructions** on using the workflow to push images to Docker Hub or GitHub Container Registry.

## Development

### Running Locally Without Docker

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the API key:
   ```bash
   # Linux/Mac
   export API_KEY=your_key
   
   # Windows (Command Prompt)
   set API_KEY=your_key
   
   # Windows (PowerShell)
   $env:API_KEY="your_key"
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

### Hot Reload Development with Docker

For development with hot reload (not yet configured), you would need to:

1. Mount the source code directory
2. Use a development Dockerfile
3. Run `npm run dev` instead of building static files

This is not currently set up but can be added if needed.

## Additional Resources

- 📖 [Environment Variables Documentation](ENVIRONMENT_VARIABLES.md) - Detailed information about all variables
- 🐳 [Docker Hub Description](DOCKER_HUB.md) - Project overview and quick start
- 🔧 [API Endpoints Documentation](API_ENDPOINTS.md) - API reference
- 📚 [Main README](README.md) - Project overview and local development

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/tokendad/Plugin-Gemini).

