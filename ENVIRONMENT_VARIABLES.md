# Environment Variables Documentation

This document provides detailed information about all environment variables used in the NesVentory Dept 56 Plugin Docker configuration.

## Required Variables

### GEMINI_API_KEY

- **Description**: Your Google Gemini API key used for AI-powered image recognition
- **Required**: Yes
- **Default**: None
- **Example**: `GEMINI_API_KEY=AIzaSyABC123defGHI456jklMNO789pqrSTU012`
- **How to obtain**: 
  1. Visit [Google AI Studio](https://ai.google.dev/)
  2. Sign in with your Google account
  3. Navigate to "Get API Key"
  4. Create or select a project
  5. Copy your API key
- **Important Note**: This is a build-time variable. The API key is embedded into the application during the Docker build process. To change the key, you must rebuild the Docker image.

## Optional Configuration Variables

### TZ (Timezone)

- **Description**: Sets the timezone for the container
- **Required**: No
- **Default**: `UTC`
- **Format**: Standard timezone identifier (e.g., `America/New_York`, `Europe/London`, `Asia/Tokyo`)
- **Example**: `TZ=America/Chicago`
- **Common Values**:
  - `UTC` - Coordinated Universal Time
  - `America/New_York` - Eastern Time
  - `America/Chicago` - Central Time
  - `America/Denver` - Mountain Time
  - `America/Los_Angeles` - Pacific Time
  - `Europe/London` - British Time
  - `Europe/Paris` - Central European Time
  - `Asia/Tokyo` - Japan Time
  - `Australia/Sydney` - Australian Eastern Time
- **Find your timezone**: [List of tz database time zones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

### PUID (Process User ID)

- **Description**: The user ID that the nginx process will run as inside the container
- **Required**: No
- **Default**: `1000`
- **Format**: Integer (numeric user ID)
- **Example**: `PUID=1000`
- **Purpose**: Ensures that files created by the container have the same ownership as your host user, preventing permission issues
- **How to find your PUID**: 
  - Linux/Mac: Run `id -u` in your terminal
  - The default value of 1000 is typically the first non-root user on most Linux systems
- **When to change**: If you experience permission issues with mounted volumes or if your host user ID is different from 1000

### PGID (Process Group ID)

- **Description**: The group ID that the nginx process will run as inside the container
- **Required**: No
- **Default**: `1000`
- **Format**: Integer (numeric group ID)
- **Example**: `PGID=1000`
- **Purpose**: Ensures that files created by the container have the same group ownership as your host user
- **How to find your PGID**: 
  - Linux/Mac: Run `id -g` in your terminal
  - The default value of 1000 is typically the first non-root group on most Linux systems
- **When to change**: If you experience permission issues with mounted volumes or if your host group ID is different from 1000

### UMASK

- **Description**: Controls the default file permission mask for files created by the container
- **Required**: No
- **Default**: `022`
- **Format**: Three-digit octal number
- **Example**: `UMASK=022`
- **Common Values**:
  - `022` - Default, creates files with 644 (rw-r--r--) and directories with 755 (rwxr-xr-x) permissions
  - `002` - More permissive, creates files with 664 (rw-rw-r--) and directories with 775 (rwxrwxr-x) permissions
  - `077` - Restrictive, creates files with 600 (rw-------) and directories with 700 (rwx------) permissions
- **Permission Calculation**: 
  - Final permissions = Default permissions - UMASK
  - For files: 666 - 022 = 644 (rw-r--r--)
  - For directories: 777 - 022 = 755 (rwxr-xr-x)

### HOST_PORT

- **Description**: The port that the application will listen on inside the container
- **Required**: No
- **Default**: `8002`
- **Format**: Integer (1-65535)
- **Example**: `HOST_PORT=8002`
- **Purpose**: Controls which port the uvicorn server binds to inside the container. When using Docker, you also need to map this port in your docker-compose.yml or docker run command (e.g., `-p 8002:8002`)
- **When to change**: If port 8002 conflicts with other services, or if you prefer a different port
- **Note**: This takes precedence over the `PORT` environment variable if both are set

### PORT

- **Description**: Alternative environment variable for specifying the application port
- **Required**: No
- **Default**: `8002` (if HOST_PORT is not set)
- **Format**: Integer (1-65535)
- **Example**: `PORT=8002`
- **Purpose**: Alternative to HOST_PORT for controlling which port the uvicorn server binds to
- **Note**: If both HOST_PORT and PORT are set, HOST_PORT takes precedence

## Volume Mounts

### /etc/localtime

- **Description**: System timezone file mount
- **Purpose**: Alternative method to synchronize container time with host system time
- **Mount**: `/etc/localtime:/etc/localtime:ro` (read-only)
- **Note**: This is mounted in docker-compose.yml by default. Can be used instead of or in addition to the TZ environment variable

### Data Directory (Future Use)

- **Description**: Persistent data storage for the application
- **Mount**: `./data:/usr/share/nginx/html/data`
- **Status**: Commented out by default, available for future use if persistent data storage is needed
- **Purpose**: Would allow data to persist between container restarts and rebuilds

## Configuration File

All these variables can be configured in a `.env` file in the project root directory. Docker Compose will automatically load this file.

### Creating your .env file

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your preferred text editor:
   ```bash
   nano .env
   # or
   vim .env
   ```

3. Update the values as needed:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   TZ=America/New_York
   PUID=1000
   PGID=1000
   UMASK=022
   HOST_PORT=8002
   ```

4. Save the file

## Security Notes

- **Never commit your `.env` file to version control** - It contains sensitive information like your API key
- The `.env` file is automatically ignored by git (see `.gitignore`)
- Share `.env.example` instead, which contains placeholder values
- Rotate your API keys regularly
- Use different API keys for development and production environments

## Troubleshooting

### Permission Issues

If you experience permission issues with mounted volumes:
1. Find your user and group IDs: `id -u` and `id -g`
2. Update `PUID` and `PGID` in your `.env` file to match these values
3. Rebuild the container: `docker-compose up --build`

### Timezone Issues

If the container time doesn't match your local time:
1. Verify your timezone string is correct (see TZ section above)
2. Ensure `/etc/localtime` exists on your host system
3. Check the container time: `docker exec nesventory-plugin date`

### API Key Issues

If you need to change the API key:
1. Update `GEMINI_API_KEY` in your `.env` file
2. **Rebuild the image** (required for build-time variables): `docker-compose up --build`
3. Simply restarting the container is not sufficient for API key changes

## Additional Resources

- [Docker Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [Docker Volumes](https://docs.docker.com/storage/volumes/)
- [Linux File Permissions](https://www.linux.com/training-tutorials/understanding-linux-file-permissions/)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
