# Plugin Integration Guide for NesVentory

This document provides detailed instructions for integrating the NesVentory Gemini Plugin with your NesVentory installation.

## Overview

The NesVentory Gemini Plugin is a Google Gemini AI-powered backend service that provides intelligent identification of Department 56 village collectibles from images. It implements the [NesVentory Plugin API Specification](https://github.com/tokendad/NesVentory/blob/main/PLUGINS.md).

## Prerequisites

- Docker and docker-compose installed on your system
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))
- NesVentory v6.0.0 or later installed and running

## Installation Steps

### 1. Deploy the Plugin

#### Option A: Using Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/tokendad/Plugin-Gemini.git
   cd Plugin-Gemini
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your API key:
   ```bash
   nano .env  # or use your preferred editor
   ```
   
   Set:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. Start the plugin:
   ```bash
   docker-compose up -d
   ```

5. Verify it's running:
   ```bash
   curl http://localhost:8002/health
   ```
   
   Expected response:
   ```json
   {
     "status": "healthy",
     "version": "1.0.0",
     "gemini_configured": true
   }
   ```

#### Option B: Manual Docker Run

```bash
docker run -d \
  --name nesventory-gemini-plugin \
  -p 8002:8002 \
  -e GEMINI_API_KEY=your_api_key_here \
  --restart unless-stopped \
  tokendad/plugin-gemini:latest
```

### 2. Configure in NesVentory

1. Open your NesVentory installation in a web browser

2. Navigate to **Admin → Plugins**

3. Click **+ Add Plugin**

4. Fill in the plugin details:

   **Basic Information:**
   - **Name**: `Gemini Plugin` (or any descriptive name you prefer)
   - **Description**: `Google Gemini AI-powered item identification for Department 56 collectibles`

   **Connection Settings:**
   
   If both NesVentory and the plugin are running in Docker on the same network:
   - **Endpoint URL**: `http://nesventory-gemini-plugin:8002`
   
   If running on different systems or not using Docker networking:
   - **Endpoint URL**: `http://<plugin-server-ip>:8002`
   
   Replace `<plugin-server-ip>` with the actual IP address of the server running the plugin.

   **Authentication:**
   - **API Key**: Leave empty (this plugin doesn't require authentication)

   **Plugin Settings:**
   - ✓ **Enabled**: Check this box
   - ✓ **Use for AI Scan Operations**: Check this box
   - ✓ **Supports Image Processing**: Check this box (auto-detected)
   - **Priority**: `100` (lower numbers = higher priority)

5. Click **Test Connection** to verify the setup
   - You should see a success message if everything is configured correctly

6. Click **Save** to save the plugin configuration

## Network Configuration

### Docker Networking

If both NesVentory and the plugin are running in Docker:

1. **Same docker-compose.yml** (Easiest):
   Add the plugin service to your NesVentory docker-compose.yml:
   ```yaml
   services:
     nesventory:
       # ... your existing nesventory config
     
     gemini-plugin:
       image: tokendad/plugin-gemini:latest
       container_name: nesventory-gemini-plugin
       environment:
         - GEMINI_API_KEY=${GEMINI_API_KEY}
       restart: unless-stopped
   ```
   
   Use endpoint: `http://gemini-plugin:8002`

2. **Separate docker-compose files** (Connect networks):
   ```bash
   # Find NesVentory's network
   docker network ls | grep nesventory
   
   # Connect plugin to that network
   docker network connect <nesventory_network> nesventory-gemini-plugin
   ```
   
   Use endpoint: `http://nesventory-gemini-plugin:8002`

3. **Using host IP** (Always works):
   Find your host machine's IP address:
   ```bash
   # On Linux/Mac
   ip addr show | grep inet
   
   # On Windows
   ipconfig
   ```
   
   Use endpoint: `http://192.168.x.x:8002` (replace with your actual IP)

## Testing the Integration

### Test 1: Health Check

From your NesVentory server, test the plugin is reachable:
```bash
curl http://nesventory-gemini-plugin:8002/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "gemini_configured": true
}
```

### Test 2: Item Identification

Upload a test image through NesVentory's AI scan feature:

1. Go to **Inventory → Add Item**
2. Click **AI Scan** or **Upload Image**
3. Select an image of a Department 56 item
4. The plugin should identify the item and return results

### Test 3: Check Logs

Monitor plugin activity:
```bash
# If using docker-compose
docker-compose logs -f nesventory-gemini-plugin

# If using docker run
docker logs -f nesventory-gemini-plugin
```

Look for log entries showing successful API calls from NesVentory.

## Troubleshooting

### Plugin Not Connecting

**Symptom**: "Connection refused" or "Host not found" error in NesVentory

**Solutions**:
1. Verify plugin is running: `docker ps | grep gemini-plugin`
2. Check if you can access health endpoint from NesVentory container:
   ```bash
   docker exec -it <nesventory-container> curl http://nesventory-gemini-plugin:8002/health
   ```
3. If above fails, use host IP instead of container name
4. Check firewall rules if using different machines

### Service Unavailable (503)

**Symptom**: Plugin responds but returns 503 errors

**Cause**: Gemini API key not configured or invalid

**Solutions**:
1. Check `.env` file has correct API key
2. Verify API key is valid at Google AI Studio
3. Restart plugin: `docker-compose restart nesventory-gemini-plugin`
4. Check logs: `docker-compose logs nesventory-gemini-plugin`

### No Items Detected

**Symptom**: Plugin works but returns empty results

**Possible causes**:
- Image quality is poor (blurry, dark, too small)
- Item is not a Department 56 collectible
- Item branding/packaging not visible in image

**Solutions**:
- Use clear, well-lit images
- Include original packaging/boxes if available
- Try multiple angles of the item
- Ensure Department 56 branding is visible

### High Response Times

**Symptom**: AI scan takes very long to complete

**Causes**:
- Large image files
- Gemini API rate limiting
- Network latency

**Solutions**:
- Resize images to reasonable size (< 5MB)
- Set appropriate plugin priority if using multiple plugins
- Check network latency between services

## API Endpoints

The plugin exposes these endpoints:

- `GET /` - Root endpoint with API information
- `GET /health` - Health check
- `GET /docs` - Interactive API documentation (Swagger UI)
- `POST /nesventory/identify/image` - Identify items from images
- `POST /parse-data-tag` - Parse product data tags
- `POST /lookup-barcode` - Look up products by barcode

## Updating the Plugin

To update to the latest version:

```bash
cd Plugin-Gemini
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

Or if using pre-built images:

```bash
docker-compose down
docker-compose pull
docker-compose up -d
```

## Security Considerations

1. **API Key Protection**: Never commit your `.env` file to git. Use `.env.example` as a template.

2. **CORS Configuration**: For production, update `src/api.py` to restrict CORS to your NesVentory domain:
   ```python
   allow_origins=["https://your-nesventory-domain.com"]
   ```

3. **Network Security**: Run plugin on a private network if possible, or use HTTPS and authentication for production deployments.

## Support

- Plugin Issues: [GitHub Issues](https://github.com/tokendad/Plugin-Gemini/issues)
- NesVentory Documentation: [NesVentory Repo](https://github.com/tokendad/NesVentory)
- Plugin API Spec: [PLUGINS.md](https://github.com/tokendad/NesVentory/blob/main/PLUGINS.md)

## License

MIT License - see LICENSE file for details
