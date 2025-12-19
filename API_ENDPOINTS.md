# NesVentory Department 56 Plugin - API Documentation

This document outlines the API endpoints required by the NesVentory Dept 56 Recognizer plugin. The plugin communicates with the backend for two primary purposes: Adding items to inventory and providing training feedback for the AI model.

## Base URL
All requests are made to: `https://api.nesventory.com`

---

## 1. Add Item to Inventory

Adds a confirmed Department 56 item to the user's active inventory.

- **Endpoint**: `/v1/inventory/items`
- **Method**: `POST`
- **Content-Type**: `application/json`

### Request Body
The body matches the `D56Item` TypeScript interface found in the frontend.

```json
{
  "name": "Stone Cottage",
  "series": "Dickens' Village Series",
  "itemNumber": "5544-0",
  "modelNumber": null,
  "yearIntroduced": 1985,
  "yearRetired": 1991,
  "retiredStatus": "Retired",
  "estimatedCondition": "Excellent - No Chips",
  "estimatedValueRange": "$45 - $65",
  "description": "A porcelain cottage with snow-covered roof...",
  "isDepartment56": true,
  "confidenceScore": 95,
  "isLimitedEdition": false,
  "isSigned": false
}
```

### Response
- **201 Created**: Item successfully added.
- **400 Bad Request**: Validation failed (e.g., missing required fields).
- **500 Internal Server Error**: Database error.

---

## 2. Submit AI Training Feedback

Submits user feedback to improve future AI identification accuracy. This is triggered when a user explicitly Accepts, Rejects, or Corrects an AI prediction.

- **Endpoint**: `/v1/training/submit`
- **Method**: `POST`
- **Content-Type**: `application/json`

### Request Body

```json
{
  "itemData": {
    // ... D56Item properties (same as above)
  },
  "imageMeta": {
    "mimeType": "image/jpeg",
    "size": 102400
  },
  "timestamp": "2023-10-27T14:30:00.000Z",
  "userAction": "ACCEPTED", // or "REJECTED"
  "source": "web-plugin"
}
```

- **userAction**:
  - `ACCEPTED`: User confirmed the AI's initial guess.
  - `REJECTED`: User rejected the AI's guess.
  - If the user selects an Alternative match, the payload sends the *corrected* item data with `ACCEPTED`.

### Response
- **200 OK**: Feedback received.
- **202 Accepted**: Feedback queued for processing.

---

## Error Handling

The frontend plugin implements a "soft fail" mechanism. If these endpoints are unreachable (e.g., during local development or network outage), the UI will simulate a successful response to prevent blocking the user's workflow, while logging the error to the console.
