# GitHub Actions Workflow - Docker Push

This repository includes a GitHub Actions workflow for manually building and pushing Docker images to a container registry.

## Overview

The `docker-push.yml` workflow allows you to build a Docker image with your Gemini API key baked in and push it to either Docker Hub or GitHub Container Registry (GHCR).

## Prerequisites

Before using this workflow, you need to configure the following secrets in your GitHub repository:

### For Docker Hub (docker.io)
1. Go to your repository settings → Secrets and variables → Actions
2. Add the following secrets:
   - `DOCKER_USERNAME`: Your Docker Hub username
   - `DOCKER_PASSWORD`: Your Docker Hub password or access token

### For GitHub Container Registry (ghcr.io)
No additional secrets are needed. The workflow uses the built-in `GITHUB_TOKEN`.

## How to Use

1. Navigate to your repository on GitHub
2. Click on the "Actions" tab
3. Select "Docker Push" from the workflows list
4. Click "Run workflow" button
5. Fill in the required inputs:
   - **api_key**: Your Gemini API key (this will be baked into the image at build time)
   - **tag**: Docker image tag (e.g., `latest`, `v1.0.0`, `dev`)
   - **registry**: Choose between `docker.io` (Docker Hub) or `ghcr.io` (GitHub Container Registry)
6. Click "Run workflow" to start the build

## Workflow Details

The workflow performs the following steps:
1. Checks out the repository code
2. Sets up Docker Buildx for advanced build features
3. Logs into the selected container registry
4. Extracts metadata for the Docker image
5. Builds the Docker image with the provided API key as a build argument
6. Pushes the image to the selected registry
7. Displays the image digest

## Image Naming

- **Docker Hub**: Images are tagged as `<DOCKER_USERNAME>/plugin-gemini:<tag>`
- **GitHub Container Registry**: Images are tagged as `ghcr.io/<owner>/plugin-gemini:<tag>`

## Build Arguments

The Dockerfile accepts the following build argument:
- `API_KEY`: Your Gemini API key (required)

## Important Security Note

⚠️ **Warning**: The API key is baked into the Docker image at build time. This means:
- The API key will be embedded in the image layers
- Anyone with access to the image can potentially extract the API key
- Only share the image with trusted parties or use it in secure environments
- Consider using environment variables at runtime for more sensitive deployments

## Caching

The workflow uses GitHub Actions cache to speed up subsequent builds:
- Dependencies and build artifacts are cached
- This significantly reduces build time for repeated builds

## Example Usage

After the workflow completes, you can pull and run your image:

### From Docker Hub:
```bash
docker pull <your-dockerhub-username>/plugin-gemini:latest
docker run -p 8080:80 <your-dockerhub-username>/plugin-gemini:latest
```

### From GitHub Container Registry:
```bash
docker pull ghcr.io/<your-github-username>/plugin-gemini:latest
docker run -p 8080:80 ghcr.io/<your-github-username>/plugin-gemini:latest
```

Then open your browser to http://localhost:8080

## Troubleshooting

### Authentication Errors
- Verify that your Docker Hub credentials are correctly set in repository secrets
- For GHCR, ensure your repository has workflow permissions enabled

### Build Failures
- Check that your API key is valid
- Verify that all dependencies in package.json are accessible
- Review the workflow logs for specific error messages

### Image Not Found
- Wait a few minutes after the workflow completes for the image to be available
- Verify you're using the correct image name and tag
- Check that you have permission to access the registry
