# NesVentory Department 56 Plugin

An AI-powered inventory assistant specifically trained to identify Department 56 village collectibles using Google Gemini's computer vision capabilities for the NesVentory system.

## 🎯 What is This?

This Docker image provides a web-based application that uses Google's Gemini AI to recognize and identify Department 56 village collectibles from photos. Simply upload an image, and the AI will help identify the piece, providing details about the collectible.

## ✨ Features

- 🤖 **AI-Powered Recognition** - Uses Google Gemini's advanced vision capabilities
- 📸 **Camera Support** - Take photos directly from your device
- 🖼️ **Image Upload** - Upload existing photos of your collectibles
- 🎨 **Modern UI** - Clean, responsive interface built with React
- 🐳 **Easy Deployment** - Fully containerized with Docker
- 🔒 **Secure** - Configurable user permissions and timezone support

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. Create a `docker-compose.yml` file:

```yaml
services:
  nesventory-plugin:
    image: your-dockerhub-username/nesventory-d56:latest
    ports:
      - "8080:80"
    environment:
      - TZ=UTC
      - PUID=1000
      - PGID=1000
    volumes:
      - /etc/localtime:/etc/localtime:ro
    restart: unless-stopped
```

2. Create a `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key_here
TZ=America/New_York
PUID=1000
PGID=1000
HOST_PORT=8080
```

3. Run:

```bash
docker-compose up -d
```

4. Access at [http://localhost:8080](http://localhost:8080)

### Using Docker CLI

```bash
docker run -d \
  --name nesventory-plugin \
  -p 8080:80 \
  -e TZ=America/New_York \
  -e PUID=1000 \
  -e PGID=1000 \
  -v /etc/localtime:/etc/localtime:ro \
  your-dockerhub-username/nesventory-d56:latest
```

**⚠️ Important**: This image requires a Google Gemini API key at **build time**. See the [Building from Source](#building-from-source) section below.

## 📋 Prerequisites

- Docker 20.10 or higher
- Docker Compose 2.0 or higher (for docker-compose method)
- A Google Gemini API key ([Get one free here](https://ai.google.dev/))

## 🔑 Getting a Gemini API Key

1. Visit [Google AI Studio](https://ai.google.dev/)
2. Sign in with your Google account
3. Navigate to "Get API Key"
4. Create or select a project
5. Copy your API key

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `GEMINI_API_KEY` | ✅ | - | Your Google Gemini API key (build-time) |
| `TZ` | ❌ | `UTC` | Container timezone |
| `PUID` | ❌ | `1000` | User ID for running the process |
| `PGID` | ❌ | `1000` | Group ID for running the process |
| `UMASK` | ❌ | `022` | File permission mask |
| `HOST_PORT` | ❌ | `8080` | Host port mapping |

### Ports

- **80** - Web interface (exposed internally)
- **8080** - Default host port mapping (configurable)

### Volumes

| Volume | Purpose | Required |
| :--- | :--- | :---: |
| `/etc/localtime:/etc/localtime:ro` | Timezone sync with host | ❌ |
| `./data:/usr/share/nginx/html/data` | Persistent data storage | ❌ |

## 🏗️ Building from Source

Since the API key must be embedded at build time, you'll need to build your own image:

1. Clone the repository:

```bash
git clone https://github.com/tokendad/Plugin-Gemini.git
cd Plugin-Gemini
```

2. Create your `.env` file:

```bash
cp .env.example .env
nano .env  # Add your GEMINI_API_KEY
```

3. Build and run:

```bash
docker-compose up --build
```

### Manual Build

```bash
docker build \
  --build-arg GEMINI_API_KEY=your_actual_api_key_here \
  --build-arg TZ=America/New_York \
  --build-arg PUID=1000 \
  --build-arg PGID=1000 \
  -t nesventory-d56:latest .
```

## 🔧 Advanced Configuration

### Custom User/Group IDs

To avoid permission issues with mounted volumes, match the container's user/group to your host:

```bash
# Find your IDs
id -u  # Your user ID
id -g  # Your group ID

# Update .env file
PUID=1001
PGID=1001
```

### Timezone Configuration

Set your local timezone for proper timestamp handling:

```env
TZ=America/Chicago
```

See [list of valid timezones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).

### File Permissions

Control file permission mask with UMASK:

- `022` (default) - Standard permissions (files: 644, dirs: 755)
- `002` - Group-writable (files: 664, dirs: 775)
- `077` - Private (files: 600, dirs: 700)

## 📖 Documentation

For comprehensive documentation, see the [GitHub repository](https://github.com/tokendad/Plugin-Gemini):

- [Environment Variables Guide](https://github.com/tokendad/Plugin-Gemini/blob/main/ENVIRONMENT_VARIABLES.md) - Detailed variable documentation
- [Docker README](https://github.com/tokendad/Plugin-Gemini/blob/main/DOCKER_README.md) - Complete Docker instructions
- [API Endpoints](https://github.com/tokendad/Plugin-Gemini/blob/main/API_ENDPOINTS.md) - API reference

## 🐛 Troubleshooting

### API Key Issues

**Problem**: Application doesn't work after changing API key

**Solution**: The API key is baked in at build time. You must rebuild:

```bash
docker-compose up --build --force-recreate
```

### Permission Errors

**Problem**: Permission denied when accessing mounted volumes

**Solution**: Set PUID/PGID to match your host user:

```bash
id -u  # Get your user ID
id -g  # Get your group ID
# Update .env with these values and rebuild
```

### Port Conflicts

**Problem**: Port 8080 already in use

**Solution**: Change the port in `.env`:

```env
HOST_PORT=8081
```

### Timezone Issues

**Problem**: Wrong time in container

**Solution**: Set TZ environment variable and ensure `/etc/localtime` exists on host:

```env
TZ=Your/Timezone
```

## 🛡️ Security Notes

- ⚠️ Never commit your `.env` file with real API keys
- 🔄 Rotate API keys regularly
- 🔐 Use different keys for development and production
- 🚫 The `.env` file is automatically ignored by git

## 🏷️ Tags

- `latest` - Latest stable release
- `v1.0.0` - Specific version tags (when available)
- `main` - Latest from main branch (development)

## 🤝 Contributing

Contributions are welcome! Please visit the [GitHub repository](https://github.com/tokendad/Plugin-Gemini) to:

- Report issues
- Submit pull requests
- Request features
- Improve documentation

## 📄 License

See the [LICENSE](https://github.com/tokendad/Plugin-Gemini/blob/main/LICENSE) file in the repository.

## 🔗 Links

- **GitHub Repository**: [https://github.com/tokendad/Plugin-Gemini](https://github.com/tokendad/Plugin-Gemini)
- **Google Gemini API**: [https://ai.google.dev/](https://ai.google.dev/)
- **AI Studio App**: [https://ai.studio/apps/drive/1i3J2u9LCOt5Z29lU9woJJbiyaTlU8q7n](https://ai.studio/apps/drive/1i3J2u9LCOt5Z29lU9woJJbiyaTlU8q7n)

## 💬 Support

For support, questions, or issues:

1. Check the [documentation](https://github.com/tokendad/Plugin-Gemini)
2. Search [existing issues](https://github.com/tokendad/Plugin-Gemini/issues)
3. Open a [new issue](https://github.com/tokendad/Plugin-Gemini/issues/new)

---

**Made with ❤️ for Department 56 collectors**
