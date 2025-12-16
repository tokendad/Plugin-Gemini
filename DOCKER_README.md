# Docker Instructions for NesVentory Dept 56 Plugin

This project is containerized using Docker and Nginx.

## Environment Variables

| Variable | Description |
| :--- | :--- |
| `API_KEY` | **Required**. Your Google Gemini API Key. |

**Important Note on React & Docker**:
Because this is a static client-side application (React), environment variables like `API_KEY` are "baked in" to the JavaScript code at **build time**. They cannot be changed at runtime without rebuilding the image.

## Prerequisites

- Docker
- Docker Compose

## Quick Start (Docker Compose)

1. Create a `.env` file in the project root (optional but recommended):
   ```bash
   API_KEY=your_actual_api_key_here
   ```

2. Run with Docker Compose:
   ```bash
   # If using a .env file, Docker Compose picks it up automatically
   docker-compose up --build
   ```
   
   *Or pass the variable directly inline:*
   ```bash
   API_KEY=your_key_here docker-compose up --build
   ```

3. Open your browser to [http://localhost:8080](http://localhost:8080).

## Manual Docker CLI

1. **Build the image** (you must pass the API_KEY as a build argument):
   ```bash
   docker build --build-arg API_KEY=your_actual_api_key_here -t nesventory-d56 .
   ```

2. **Run the container**:
   ```bash
   docker run -p 8080:80 nesventory-d56
   ```

3. Access the app at [http://localhost:8080](http://localhost:8080).

## Development

To run locally without Docker:
1. `npm install`
2. `export API_KEY=your_key` (Linux/Mac) or `set API_KEY=your_key` (Windows)
3. `npm run dev`
