"""
FastAPI server for the NesVentory Gemini Plugin.

This plugin uses Google Gemini AI to identify Department 56 collectibles
from images.
"""

import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import google.generativeai as genai
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Version
__version__ = "1.0.0"

# Path to built frontend
DIST_PATH = Path(__file__).parent.parent / "dist"


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    gemini_configured: bool


class DetectedItem(BaseModel):
    """Represents a detected item in an image."""
    name: str = Field(..., description="Clear, specific name for the item")
    description: Optional[str] = Field(None, description="Brief description including color, size, or notable features")
    brand: Optional[str] = Field(None, description="The brand/manufacturer if identifiable")
    item_number: Optional[str] = Field(None, description="Official Department 56 item number or SKU")
    model_number: Optional[str] = Field(None, description="Model number if different from item number")
    retired_status: Optional[str] = Field(None, description="Retirement status: 'Active', 'Retired', or 'Unknown'")
    estimated_value: Optional[float] = Field(None, description="Approximate value in USD")
    confidence: Optional[float] = Field(None, description="Confidence in identification (0.0 to 1.0)")
    estimation_date: Optional[str] = Field(None, description="Date when value was estimated (MM/DD/YY format)")


class ItemIdentificationResponse(BaseModel):
    """Response from item identification endpoint."""
    items: list[DetectedItem] = Field(..., description="Array of detected item objects")
    raw_response: Optional[str] = Field(None, description="Raw response text for debugging")


class DataTagResponse(BaseModel):
    """Response from data tag parsing endpoint."""
    manufacturer: Optional[str] = Field(None, description="Manufacturer name")
    brand: Optional[str] = Field(None, description="Brand name")
    model_number: Optional[str] = Field(None, description="Model number")
    serial_number: Optional[str] = Field(None, description="Serial number")
    production_date: Optional[str] = Field(None, description="Production date")
    estimated_value: Optional[float] = Field(None, description="Estimated value in USD")
    additional_info: Optional[dict] = Field(None, description="Additional information extracted")
    raw_response: Optional[str] = Field(None, description="Raw response text")


class BarcodeRequest(BaseModel):
    """Request model for barcode lookup."""
    barcode: str = Field(..., description="Barcode value")
    upc: Optional[str] = Field(None, description="UPC value")


class BarcodeResponse(BaseModel):
    """Response from barcode lookup endpoint."""
    found: bool = Field(..., description="Whether the barcode was found")
    name: Optional[str] = Field(None, description="Product name")
    description: Optional[str] = Field(None, description="Product description")
    brand: Optional[str] = Field(None, description="Brand name")
    model_number: Optional[str] = Field(None, description="Model number")
    estimated_value: Optional[float] = Field(None, description="Estimated value in USD")
    estimation_date: Optional[str] = Field(None, description="Date of estimation")
    category: Optional[str] = Field(None, description="Product category")
    raw_response: Optional[str] = Field(None, description="Raw response text")


# Global Gemini model instance
gemini_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize Gemini on startup."""
    global gemini_model
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            genai.configure(api_key=api_key)
            gemini_model = genai.GenerativeModel("gemini-2.0-flash-exp")
            logger.info("Gemini AI configured successfully")
        except Exception as e:
            logger.error(f"Failed to configure Gemini: {e}")
            gemini_model = None
    else:
        logger.warning("GEMINI_API_KEY not set - plugin will not be functional")
    
    yield
    
    # Cleanup
    gemini_model = None


app = FastAPI(
    title="NesVentory Gemini Plugin",
    description="Google Gemini AI-powered plugin for Department 56 collectibles identification",
    version=__version__,
    lifespan=lifespan,
)

# Enable CORS for integration with NesVentory
# Note: In production, configure allow_origins with specific domain(s) instead of "*"
# Example: allow_origins=["https://your-nesventory-domain.com"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files if dist directory exists (built frontend)
if DIST_PATH.exists():
    # Mount static assets (JS, CSS, etc.)
    app.mount("/assets", StaticFiles(directory=str(DIST_PATH / "assets")), name="assets")


@app.get("/")
async def root():
    """Root endpoint - serves frontend UI if available, otherwise returns API info."""
    # Check if frontend is built
    index_path = DIST_PATH / "index.html"
    
    if index_path.exists():
        # Serve the frontend HTML
        return FileResponse(str(index_path))
    else:
        # Return API information (fallback for when frontend is not built)
        return {
            "message": "NesVentory Gemini Plugin API",
            "version": __version__,
            "endpoints": {
                "health": "/health",
                "identify_image": "/nesventory/identify/image",
                "parse_data_tag": "/parse-data-tag",
                "lookup_barcode": "/lookup-barcode"
            }
        }


@app.get("/api")
async def api_info():
    """API info endpoint - always returns JSON."""
    return {
        "message": "NesVentory Gemini Plugin API",
        "version": __version__,
        "endpoints": {
            "health": "/health",
            "identify_image": "/nesventory/identify/image",
            "parse_data_tag": "/parse-data-tag",
            "lookup_barcode": "/lookup-barcode"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check the health status of the plugin."""
    return HealthResponse(
        status="healthy",
        version=__version__,
        gemini_configured=gemini_model is not None
    )


@app.post("/nesventory/identify/image", response_model=ItemIdentificationResponse)
async def identify_item_from_image(
    file: UploadFile = File(..., description="Image file containing Department 56 items"),
):
    """Identify Department 56 items from an image.
    
    This endpoint analyzes an uploaded image and returns identified Department 56
    collectible items with their details and estimated values.
    """
    if not gemini_model:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Service unavailable",
                "message": "Gemini AI is not configured. Please set GEMINI_API_KEY environment variable.",
                "error_code": "GEMINI_NOT_CONFIGURED",
            },
        )
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Invalid file type",
                "message": f"File type '{file.content_type}' is not supported. Only image files are accepted.",
                "error_code": "INVALID_FILE_TYPE",
            },
        )
    
    try:
        # Read image data
        image_data = await file.read()
        
        if not image_data or len(image_data) == 0:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Empty file",
                    "message": "The uploaded file is empty",
                    "error_code": "EMPTY_FILE",
                },
            )
        
        # Open image with PIL
        try:
            image = Image.open(BytesIO(image_data))
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid image data",
                    "message": f"Unable to process image: {str(e)}",
                    "error_code": "INVALID_IMAGE_DATA",
                },
            )
        
        # Prepare prompt for Gemini
        prompt = """Analyze this image for Department 56 collectibles inventory.

Your task is to identify ALL Department 56 items visible in the image.

Department 56 Collections include:
- The Original Snow Village (glossy finish, ceramic, brighter colors)
- Heritage Village Collection (matte finish porcelain):
  * Dickens' Village (Victorian England style)
  * New England Village (Colonial/coastal style)
  * Alpine Village (Bavarian/Swiss style)
  * Christmas in the City (Urban, cityscapes)
  * North Pole Series (Fantasy, Santa oriented)
  * Little Town of Bethlehem
- Specialty Series: Halloween, Disney, Grinch, Harry Potter

For EACH item you identify, provide:
1. Specific name (use box text if visible)
2. Brief physical description (color, architectural style, notable features)
3. Brand confirmation (must be "Department 56" or note if different)
4. Item number or SKU if visible on box, base, or labels (often formats like '5544-0' or '56.58302')
5. Model number if different from item number
6. Retirement status: 'Retired' if you know the item is retired, 'Active' if still in production, or 'Unknown'
7. Estimated market value in USD based on condition
8. Your confidence level (0.0 to 1.0)

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "items": [
    {
      "name": "specific item name",
      "description": "brief physical description",
      "brand": "Department 56",
      "item_number": "5544-0",
      "model_number": null,
      "retired_status": "Retired",
      "estimated_value": 45.00,
      "confidence": 0.92,
      "estimation_date": "12/16/24"
    }
  ]
}

If you don't see any Department 56 items, return: {"items": []}
"""
        
        # Call Gemini API
        try:
            response = gemini_model.generate_content(
                [prompt, image],
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                )
            )
            
            # Parse response
            result_text = response.text
            
            # Try to parse JSON response
            try:
                result_data = json.loads(result_text)
                items = result_data.get("items", [])
                
                # Convert to DetectedItem objects
                detected_items = []
                for item in items:
                    detected_items.append(DetectedItem(
                        name=item.get("name", "Unknown Item"),
                        description=item.get("description"),
                        brand=item.get("brand"),
                        item_number=item.get("item_number"),
                        model_number=item.get("model_number"),
                        retired_status=item.get("retired_status"),
                        estimated_value=item.get("estimated_value"),
                        confidence=item.get("confidence"),
                        estimation_date=item.get("estimation_date")
                    ))
                
                return ItemIdentificationResponse(
                    items=detected_items,
                    raw_response=result_text[:500]  # Include truncated raw response
                )
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Gemini response as JSON: {e}")
                logger.error(f"Response text: {result_text}")
                # Return empty result if parsing fails
                return ItemIdentificationResponse(
                    items=[],
                    raw_response=result_text[:500]
                )
        
        except Exception as e:
            logger.exception("Gemini API call failed")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "AI processing failed",
                    "message": f"Failed to process image with Gemini: {str(e)}",
                    "error_code": "GEMINI_API_ERROR",
                },
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Image identification failed")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Image identification failed",
                "message": f"An unexpected error occurred: {str(e)}",
                "error_code": "UNEXPECTED_ERROR",
            },
        )


@app.post("/parse-data-tag", response_model=DataTagResponse)
async def parse_data_tag(
    file: UploadFile = File(..., description="Image file containing a data tag"),
):
    """Parse manufacturer data tag from an image.
    
    Extracts manufacturer, model, serial number, and other information
    from product data tags or labels.
    """
    if not gemini_model:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Service unavailable",
                "message": "Gemini AI is not configured",
                "error_code": "GEMINI_NOT_CONFIGURED",
            },
        )
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Invalid file type",
                "message": "Only image files are accepted",
                "error_code": "INVALID_FILE_TYPE",
            },
        )
    
    try:
        # Read image data
        image_data = await file.read()
        if not image_data:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Open image
        image = Image.open(BytesIO(image_data))
        
        # Prepare prompt
        prompt = """Analyze this image of a product data tag/label and extract all available information.

Extract the following if visible:
- Manufacturer name
- Brand name
- Model number
- Serial number
- Production/manufacturing date
- Any voltage, wattage, or technical specifications
- Country of origin

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "manufacturer": "manufacturer name or null",
  "brand": "brand name or null",
  "model_number": "model number or null",
  "serial_number": "serial number or null",
  "production_date": "date or null",
  "estimated_value": null,
  "additional_info": {
    "voltage": "voltage or null",
    "wattage": "wattage or null",
    "country": "country or null"
  }
}

Use null for any field you cannot determine from the image.
"""
        
        # Call Gemini
        response = gemini_model.generate_content(
            [prompt, image],
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        
        # Parse response
        result_data = json.loads(response.text)
        
        return DataTagResponse(
            manufacturer=result_data.get("manufacturer"),
            brand=result_data.get("brand"),
            model_number=result_data.get("model_number"),
            serial_number=result_data.get("serial_number"),
            production_date=result_data.get("production_date"),
            estimated_value=result_data.get("estimated_value"),
            additional_info=result_data.get("additional_info"),
            raw_response=response.text[:500]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Data tag parsing failed")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Parsing failed",
                "message": str(e),
                "error_code": "PARSE_ERROR",
            },
        )


@app.post("/lookup-barcode", response_model=BarcodeResponse)
async def lookup_barcode(request: BarcodeRequest):
    """Look up product information by barcode.
    
    Note: This is a basic implementation using Gemini's knowledge.
    For production use, consider integrating with a barcode database API.
    """
    if not gemini_model:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Service unavailable",
                "message": "Gemini AI is not configured",
                "error_code": "GEMINI_NOT_CONFIGURED",
            },
        )
    
    try:
        barcode = request.barcode or request.upc
        
        # Prepare prompt
        prompt = f"""Look up information for barcode/UPC: {barcode}

If you can identify this product, provide:
- Product name
- Brand/manufacturer
- Brief description
- Estimated current market value
- Product category

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{{
  "found": true or false,
  "name": "product name or null",
  "description": "description or null",
  "brand": "brand name or null",
  "model_number": "model number or null",
  "estimated_value": value_in_usd or null,
  "estimation_date": "12/16/24" or null,
  "category": "category or null"
}}

If you cannot identify the barcode, return: {{"found": false}}
"""
        
        # Call Gemini
        response = gemini_model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        
        # Parse response
        result_data = json.loads(response.text)
        
        return BarcodeResponse(
            found=result_data.get("found", False),
            name=result_data.get("name"),
            description=result_data.get("description"),
            brand=result_data.get("brand"),
            model_number=result_data.get("model_number"),
            estimated_value=result_data.get("estimated_value"),
            estimation_date=result_data.get("estimation_date"),
            category=result_data.get("category"),
            raw_response=response.text[:500]
        )
    
    except Exception as e:
        logger.exception("Barcode lookup failed")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Lookup failed",
                "message": str(e),
                "error_code": "LOOKUP_ERROR",
            },
        )


# Catch-all route for frontend client-side routing (must be last)
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """Serve frontend for any non-API routes (client-side routing)."""
    # List of API route prefixes to exclude from frontend serving
    api_prefixes = ("health", "nesventory", "parse-data-tag", "lookup-barcode", "docs", "redoc", "openapi.json", "api")
    
    # Don't catch API routes
    if full_path.startswith(api_prefixes):
        raise HTTPException(status_code=404, detail="Not found")
    
    # Serve the frontend HTML for all other routes
    index_path = DIST_PATH / "index.html"
    
    if index_path.exists():
        return FileResponse(str(index_path))
    else:
        raise HTTPException(status_code=404, detail="Frontend not built")


if __name__ == "__main__":
    import uvicorn
    # Read port from environment variable, defaulting to 8002
    # Prefer HOST_PORT over PORT for backwards compatibility
    try:
        port = int(os.environ.get("HOST_PORT", os.environ.get("PORT", "8002")))
        if port < 1 or port > 65535:
            raise ValueError(f"Port must be between 1 and 65535, got {port}")
    except ValueError as e:
        logger.error(f"Invalid port configuration: {e}")
        logger.error("Using default port 8002")
        port = 8002
    uvicorn.run(app, host="0.0.0.0", port=port)
