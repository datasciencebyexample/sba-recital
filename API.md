# API Documentation

This document describes the API endpoints needed for the recital program system to sync across multiple devices/browsers.

## Overview

The system uses two API endpoints to manage the current program state:
- **POST** endpoint for admin to update current program
- **GET** endpoint for public display to fetch current program

## Configuration

In both `admin.js` and `script.js`, update the API configuration:

```javascript
const API_CONFIG = {
    endpoint: '/api/current-program',  // Your API endpoint URL
    useAPI: true  // Set to false to use localStorage only
};
```

## Endpoints

### 1. GET /api/current-program

**Purpose:** Public display fetches the current program index

**Method:** `GET`

**Request:** No body needed

**Response:**

Success (200):
```json
{
  "currentProgramIndex": "3",
  "timestamp": "2025-11-01T22:30:15.000Z"
}
```

No current program:
```json
{
  "currentProgramIndex": "-1",
  "timestamp": "2025-11-01T22:30:15.000Z"
}
```

**Notes:**
- When `currentProgramIndex` is `"-1"`, it means no program is currently active
- The `timestamp` field is optional but recommended for debugging
- Public display polls this endpoint every 2 seconds

---

### 2. POST /api/current-program

**Purpose:** Admin panel updates which program is currently playing

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**

Set program as current:
```json
{
  "currentProgramIndex": "3",
  "timestamp": "2025-11-01T22:30:15.000Z"
}
```

Clear current program (none playing):
```json
{
  "currentProgramIndex": "-1",
  "timestamp": "2025-11-01T22:30:15.000Z"
}
```

**Response:**

Success (200):
```json
{
  "success": true,
  "currentProgramIndex": "3",
  "message": "Current program updated"
}
```

Error (4xx/5xx):
```json
{
  "success": false,
  "message": "Error message here"
}
```

**Notes:**
- `currentProgramIndex` should match the `index` column in `programs.csv`
- Use `"-1"` to indicate no program is currently active
- The system will fallback to localStorage if the API request fails

## Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `currentProgramIndex` | string | ✅ Yes | Program index from CSV (e.g., "1", "2", "3") or "-1" for no program |
| `timestamp` | string (ISO 8601) | Optional | When the change was made |

## Implementation Examples

### Node.js / Express

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// In-memory storage (use database in production)
let currentProgram = {
  currentProgramIndex: '-1',
  timestamp: new Date().toISOString()
};

// GET endpoint
app.get('/api/current-program', (req, res) => {
  res.json(currentProgram);
});

// POST endpoint
app.post('/api/current-program', (req, res) => {
  const { currentProgramIndex, timestamp } = req.body;

  if (!currentProgramIndex) {
    return res.status(400).json({
      success: false,
      message: 'currentProgramIndex is required'
    });
  }

  currentProgram = {
    currentProgramIndex,
    timestamp: timestamp || new Date().toISOString()
  };

  res.json({
    success: true,
    currentProgramIndex: currentProgram.currentProgramIndex,
    message: 'Current program updated'
  });
});

app.listen(3000);
```

### Python / Flask

```python
from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)

# In-memory storage (use database in production)
current_program = {
    'currentProgramIndex': '-1',
    'timestamp': datetime.utcnow().isoformat()
}

@app.route('/api/current-program', methods=['GET'])
def get_current_program():
    return jsonify(current_program)

@app.route('/api/current-program', methods=['POST'])
def set_current_program():
    data = request.get_json()

    if 'currentProgramIndex' not in data:
        return jsonify({
            'success': False,
            'message': 'currentProgramIndex is required'
        }), 400

    current_program['currentProgramIndex'] = data['currentProgramIndex']
    current_program['timestamp'] = data.get('timestamp', datetime.utcnow().isoformat())

    return jsonify({
        'success': True,
        'currentProgramIndex': current_program['currentProgramIndex'],
        'message': 'Current program updated'
    })

if __name__ == '__main__':
    app.run(port=3000)
```

### Go / Gin

```go
package main

import (
    "net/http"
    "time"
    "github.com/gin-gonic/gin"
)

type ProgramState struct {
    CurrentProgramIndex string `json:"currentProgramIndex"`
    Timestamp          string `json:"timestamp"`
}

var currentProgram = ProgramState{
    CurrentProgramIndex: "-1",
    Timestamp:          time.Now().Format(time.RFC3339),
}

func main() {
    r := gin.Default()

    // GET endpoint
    r.GET("/api/current-program", func(c *gin.Context) {
        c.JSON(http.StatusOK, currentProgram)
    })

    // POST endpoint
    r.POST("/api/current-program", func(c *gin.Context) {
        var req ProgramState
        if err := c.BindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{
                "success": false,
                "message": "Invalid request",
            })
            return
        }

        if req.CurrentProgramIndex == "" {
            c.JSON(http.StatusBadRequest, gin.H{
                "success": false,
                "message": "currentProgramIndex is required",
            })
            return
        }

        currentProgram.CurrentProgramIndex = req.CurrentProgramIndex
        if req.Timestamp != "" {
            currentProgram.Timestamp = req.Timestamp
        } else {
            currentProgram.Timestamp = time.Now().Format(time.RFC3339)
        }

        c.JSON(http.StatusOK, gin.H{
            "success": true,
            "currentProgramIndex": currentProgram.CurrentProgramIndex,
            "message": "Current program updated",
        })
    })

    r.Run(":3000")
}
```

## Testing Without API

If you don't have a backend API yet, you can test the system using localStorage:

1. In both `admin.js` and `script.js`, set:
   ```javascript
   const API_CONFIG = {
       endpoint: '/api/current-program',
       useAPI: false  // Disable API, use localStorage
   };
   ```

2. Both admin and public pages must be open in the same browser

3. Changes will sync across tabs but not across different browsers/devices

## CORS Configuration

If your API is on a different domain, enable CORS:

**Node.js/Express:**
```javascript
const cors = require('cors');
app.use(cors());
```

**Python/Flask:**
```python
from flask_cors import CORS
CORS(app)
```

**Go/Gin:**
```go
import "github.com/gin-contrib/cors"
r.Use(cors.Default())
```

## Storage Recommendations

For production, store the current program state in:
- **Redis** - Fast, in-memory (recommended for real-time updates)
- **Database** - PostgreSQL, MySQL, MongoDB
- **File** - JSON file (simple but not recommended for multiple servers)

## Security Considerations

- Add authentication for the POST endpoint
- Validate `currentProgramIndex` matches valid program indices
- Rate limit API requests
- Use HTTPS in production
- Consider adding an admin API key

Example with API key:
```javascript
app.post('/api/current-program', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  // ... rest of the code
});
```

Update admin.js:
```javascript
const response = await fetch(API_CONFIG.endpoint, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your-admin-api-key'
    },
    body: JSON.stringify({ ... })
});
```
