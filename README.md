# NesVentory Gemini Plugin

A Google Gemini AI-powered plugin for the NesVentory inventory management system. This plugin provides intelligent identification of Department 56 village collectibles from images and supports data tag parsing and barcode lookup.

## Features

- **Item Identification**: Analyze images to identify Department 56 collectible items with estimated values
- **Data Tag Parsing**: Extract manufacturer, model, and serial information from product labels
- **Barcode Lookup**: Search product information by barcode/UPC
- **RESTful API**: FastAPI-based server with automatic OpenAPI documentation
- **Docker Support**: Easy deployment with Docker and docker-compose

## NesVentory Integration

This plugin implements the [NesVentory Plugin API Specification](https://github.com/tokendad/NesVentory/blob/main/PLUGINS.md) and can be configured in the NesVentory Admin panel under "Plugins".

### Required Endpoints

- `GET /health` - Health check endpoint
- `POST /nesventory/identify/image` - Identify items from images
- `POST /parse-data-tag` - Parse product data tags
- `POST /lookup-barcode` - Look up products by barcode

## Setup

### Prerequisites

- Docker and docker-compose installed
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Quick Start with Docker

1. Clone this repository:
   ```bash
   git clone https://github.com/tokendad/Plugin-Gemini.git
   cd Plugin-Gemini
   ```

2. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. Start the plugin server:
   ```bash
   docker-compose up -d
   ```

5. The plugin will be available at `http://localhost:8002`

### Testing the Plugin

Test the health endpoint:
```bash
curl http://localhost:8002/health
```

Test with an image:
```bash
curl -X POST http://localhost:8002/nesventory/identify/image \
  -F "file=@/path/to/your/image.jpg"
```

View API documentation:
```
http://localhost:8002/docs
```

## Configuration in NesVentory

1. Open NesVentory and navigate to **Admin → Plugins**
2. Click **+ Add Plugin**
3. Configure the plugin:
   - **Name**: Gemini Plugin
   - **Description**: Google Gemini AI-powered item identification
   - **Endpoint URL**: `http://nesventory-gemini-plugin:8002` (if using Docker network) or `http://<your-host-ip>:8002`
   - **API Key**: Leave empty (authentication not required for this plugin)
   - **Enabled**: ✓
   - **Use for AI Scan Operations**: ✓
   - **Supports Image Processing**: ✓ (automatically detected)
   - **Priority**: 100 (or lower for higher priority)

4. Click **Test Connection** to verify the setup
5. **Save** the configuration

## Development

### Running Locally (without Docker)

1. Install Python 3.11+
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set your API key:
   ```bash
   export GEMINI_API_KEY=your_api_key_here
   ```

4. Run the server:
   ```bash
   uvicorn src.api:app --reload --host 0.0.0.0 --port 8002
   ```

## API Endpoints

### Health Check
- **GET** `/health`
- Returns plugin status and configuration

### Identify Items from Image
- **POST** `/nesventory/identify/image`
- Upload an image to identify Department 56 collectibles
- Returns array of identified items with names, descriptions, and estimated values

### Parse Data Tag
- **POST** `/parse-data-tag`
- Upload an image of a product label/data tag
- Returns extracted manufacturer, model, and serial information

### Lookup Barcode
- **POST** `/lookup-barcode`
- Submit a barcode/UPC for product lookup
- Returns product information if found

## Architecture

This plugin uses:
- **FastAPI**: Modern Python web framework for building APIs
- **Google Generative AI (Gemini)**: For image analysis and item identification
- **Pillow (PIL)**: For image processing
- **Pydantic**: For data validation and serialization

## Troubleshooting

### Plugin Not Connecting
- Ensure the plugin container is running: `docker-compose ps`
- Check Docker networks if running NesVentory in Docker - use container name instead of localhost
- Verify the endpoint URL in NesVentory matches your plugin's address

### 503 Service Unavailable
- Check that `GEMINI_API_KEY` is set in your `.env` file
- Verify your API key is valid at Google AI Studio

### No Items Detected
- Ensure images are clear and well-lit
- Try images that clearly show Department 56 branding or packaging
- Check logs: `docker-compose logs -f nesventory-gemini-plugin`

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Plugin issues: Open an issue in this repository
- NesVentory integration: See [NesVentory documentation](https://github.com/tokendad/NesVentory)
