# PDF.js Highlights Transfer Feature

## Overview

The PDF Filter Viewer has been enhanced to receive highlights data from parent/client applications that embed viewer.html. This enables dynamic highlight injection without relying solely on static JSON files.

## How It Works

The filter viewer now supports three methods for loading highlights data (in priority order):

1. **External Data (Direct)** - Pass data directly when triggering the event
2. **Parent Window (PostMessage)** - Receive data from embedding parent via postMessage
3. **Static File (Fallback)** - Load from `config/highlights.json` as fallback

## Highlights Data Format

```json
[
  {
    "page": 1,
    "text": "Important highlight text",
    "location": [x, y, width, height],
    "color": "#FFFF00",
    "note": "Optional annotation",
    "timestamp": 1703250000000,
    "author": "John Doe"
  },
  {
    "page": 2,
    "text": "Another highlight",
    "location": [x, y, width, height],
    "color": "#00FF00"
  }
]
```

### Field Descriptions

- **page** (number, required): Page number (1-indexed)
- **text** (string, required): The highlighted text content
- **location** (array, required): [x, y, width, height] in PDF coordinates
- **color** (string, optional): Highlight color in hex format (default: #FFFF00)
- **note** (string, optional): Annotation or comment about the highlight
- **timestamp** (number, optional): When the highlight was created (Unix timestamp in ms)
- **author** (string, optional): Who created the highlight

## Integration Methods

### Method 1: PostMessage (Recommended for Cross-Origin)

**Parent Window (Client):**

```javascript
// Send highlights data to PDF viewer
const highlights = [
  {
    page: 1,
    text: "Highlighted text from page 1",
    location: [100, 200, 300, 50],
    color: "#FFFF00"
  },
  {
    page: 2,
    text: "Another highlight",
    location: [150, 300, 250, 40],
    color: "#00FF00",
    note: "Important section"
  }
];

// Get the iframe
const pdfFrame = document.getElementById('pdfViewer');

// Send highlights
pdfFrame.contentWindow.postMessage({
  type: 'pdfjs-highlights',
  source: 'pdf.js-client',
  data: highlights
}, '*'); // Replace '*' with specific origin in production
```

**HTML Structure:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>PDF Viewer with Highlights</title>
</head>
<body>
  <button onclick="sendHighlights()">Load Highlights</button>
  <iframe id="pdfViewer" src="path/to/pdfjs/web/viewer.html" width="100%" height="600"></iframe>
  
  <script>
    function sendHighlights() {
      const highlights = [/* your highlights data */];
      const iframe = document.getElementById('pdfViewer');
      
      iframe.contentWindow.postMessage({
        type: 'pdfjs-highlights',
        source: 'pdf.js-client',
        data: highlights
      }, '*');
    }
    
    // Listen for highlight requests from PDF viewer
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'pdfjs-request-highlights') {
        console.log('PDF viewer requesting highlights');
        sendHighlights();
      }
    });
  </script>
</body>
</html>
```

### Method 2: Custom Event (Same-Origin)

For same-origin scenarios:

```javascript
// Dispatch custom event with highlights data
const highlightsEvent = new CustomEvent('pdfhighlightsdatareceived', {
  detail: [
    {
      page: 1,
      text: "Highlighted text",
      location: [100, 200, 300, 50]
    }
  ]
});

document.dispatchEvent(highlightsEvent);
```

### Method 3: Direct Event Dispatch

If you have access to the PDFViewerApplication:

```javascript
// Wait for viewer to load
document.addEventListener('webviewerloaded', () => {
  const highlights = [/* your data */];
  
  // Dispatch event with data
  PDFViewerApplication.eventBus.dispatch('filterviewactivated', {
    source: this,
    highlightsData: highlights
  });
});
```

### Method 4: Static JSON File (Fallback)

Create `config/highlights.json` in your PDF.js directory:

```json
[
  {
    "page": 1,
    "text": "Highlighted text",
    "location": [100, 200, 300, 50],
    "color": "#FFFF00"
  }
]
```

## Complete Integration Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PDF Viewer with Dynamic Highlights</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    .controls {
      margin-bottom: 20px;
      padding: 15px;
      background: #f0f0f0;
      border-radius: 5px;
    }
    button {
      padding: 10px 20px;
      margin-right: 10px;
      cursor: pointer;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 4px;
    }
    button:hover {
      background: #005a9e;
    }
    iframe {
      width: 100%;
      height: 80vh;
      border: 2px solid #ccc;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <div class="controls">
    <h2>PDF Highlights Manager</h2>
    <button onclick="loadHighlights1()">Load Set 1</button>
    <button onclick="loadHighlights2()">Load Set 2</button>
    <button onclick="clearHighlights()">Clear Highlights</button>
    <button onclick="loadFromServer()">Load from Server</button>
  </div>

  <iframe id="pdfViewer" src="../web/viewer.html?file=sample.pdf"></iframe>

  <script>
    const iframe = document.getElementById('pdfViewer');

    // Predefined highlight sets
    const highlightSet1 = [
      {
        page: 1,
        text: "Introduction paragraph",
        location: [50, 100, 400, 80],
        color: "#FFFF00",
        note: "Key introduction"
      },
      {
        page: 1,
        text: "Important definition",
        location: [50, 200, 300, 40],
        color: "#00FF00",
        note: "Remember this"
      }
    ];

    const highlightSet2 = [
      {
        page: 2,
        text: "Critical section",
        location: [50, 150, 450, 100],
        color: "#FF0000",
        note: "Very important!"
      }
    ];

    function sendHighlights(highlights) {
      iframe.contentWindow.postMessage({
        type: 'pdfjs-highlights',
        source: 'pdf.js-client',
        data: highlights
      }, '*');
      console.log('Sent highlights:', highlights);
    }

    function loadHighlights1() {
      sendHighlights(highlightSet1);
    }

    function loadHighlights2() {
      sendHighlights(highlightSet2);
    }

    function clearHighlights() {
      sendHighlights([]);
    }

    async function loadFromServer() {
      try {
        const response = await fetch('/api/highlights/document123');
        const highlights = await response.json();
        sendHighlights(highlights);
      } catch (error) {
        console.error('Failed to load highlights from server:', error);
      }
    }

    // Listen for highlight requests from PDF viewer
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'pdfjs-request-highlights') {
        console.log('PDF viewer requesting highlights - sending default set');
        loadHighlights1();
      }
    });

    // Auto-load highlights when iframe loads
    iframe.addEventListener('load', () => {
      setTimeout(() => {
        loadHighlights1();
      }, 1000); // Wait for PDF.js to initialize
    });
  </script>
</body>
</html>
```

## Backend Integration

### Node.js/Express Example

```javascript
const express = require('express');
const app = express();

// Store highlights in database
const highlightsDB = {
  'document123': [
    {
      page: 1,
      text: "Server-side highlight",
      location: [100, 200, 300, 50],
      color: "#FFFF00",
      author: "admin",
      timestamp: Date.now()
    }
  ]
};

// Get highlights for a document
app.get('/api/highlights/:documentId', (req, res) => {
  const { documentId } = req.params;
  const highlights = highlightsDB[documentId] || [];
  res.json(highlights);
});

// Save new highlight
app.post('/api/highlights/:documentId', (req, res) => {
  const { documentId } = req.params;
  const highlight = req.body;
  
  if (!highlightsDB[documentId]) {
    highlightsDB[documentId] = [];
  }
  
  highlightsDB[documentId].push({
    ...highlight,
    timestamp: Date.now()
  });
  
  res.json({ success: true, id: highlightsDB[documentId].length });
});

app.listen(3000, () => {
  console.log('Highlights server running on port 3000');
});
```

### Python/Flask Example

```python
from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)

highlights_db = {
    'document123': [
        {
            'page': 1,
            'text': 'Python-generated highlight',
            'location': [100, 200, 300, 50],
            'color': '#FFFF00',
            'author': 'admin'
        }
    ]
}

@app.route('/api/highlights/<document_id>', methods=['GET'])
def get_highlights(document_id):
    highlights = highlights_db.get(document_id, [])
    return jsonify(highlights)

@app.route('/api/highlights/<document_id>', methods=['POST'])
def add_highlight(document_id):
    highlight = request.json
    
    if document_id not in highlights_db:
        highlights_db[document_id] = []
    
    highlight['timestamp'] = datetime.now().timestamp() * 1000
    highlights_db[document_id].append(highlight)
    
    return jsonify({'success': True, 'id': len(highlights_db[document_id])})

if __name__ == '__main__':
    app.run(port=3000)
```

## React Integration

```jsx
import React, { useEffect, useRef, useState } from 'react';

function PDFHighlightViewer() {
  const iframeRef = useRef(null);
  const [highlights, setHighlights] = useState([]);

  useEffect(() => {
    // Listen for highlight requests
    const handleMessage = (event) => {
      if (event.data?.type === 'pdfjs-request-highlights') {
        sendHighlights(highlights);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [highlights]);

  const sendHighlights = (highlightsData) => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.postMessage({
        type: 'pdfjs-highlights',
        source: 'pdf.js-client',
        data: highlightsData
      }, '*');
    }
  };

  const loadHighlightsFromServer = async () => {
    try {
      const response = await fetch('/api/highlights/doc123');
      const data = await response.json();
      setHighlights(data);
      sendHighlights(data);
    } catch (error) {
      console.error('Failed to load highlights:', error);
    }
  };

  const addHighlight = (highlight) => {
    const newHighlights = [...highlights, highlight];
    setHighlights(newHighlights);
    sendHighlights(newHighlights);
  };

  return (
    <div>
      <div>
        <button onClick={loadHighlightsFromServer}>Load Highlights</button>
        <button onClick={() => addHighlight({
          page: 1,
          text: 'New highlight',
          location: [100, 200, 300, 50],
          color: '#FFFF00'
        })}>Add Sample Highlight</button>
      </div>
      <iframe
        ref={iframeRef}
        src="/pdfjs/web/viewer.html"
        style={{ width: '100%', height: '600px' }}
      />
    </div>
  );
}

export default PDFHighlightViewer;
```

## Security Considerations

### PostMessage Origin Validation

**In Production**, update the origin checks:

**In pdf_filter_viewer.js:**
```javascript
window.addEventListener("message", event => {
  // Validate origin
  const ALLOWED_ORIGINS = ['https://yourdomain.com', 'https://app.yourdomain.com'];
  if (!ALLOWED_ORIGINS.includes(event.origin)) {
    return;
  }
  
  if (event.data?.type === 'pdfjs-highlights' && event.data?.source === 'pdf.js-client') {
    this.setHighlights(event.data.data);
  }
}, false);
```

**In parent window:**
```javascript
iframe.contentWindow.postMessage(data, 'https://your-pdfjs-domain.com');
```

### Data Validation

Always validate highlights data:

```javascript
function validateHighlight(highlight) {
  return (
    typeof highlight.page === 'number' &&
    typeof highlight.text === 'string' &&
    Array.isArray(highlight.location) &&
    highlight.location.length === 4 &&
    highlight.location.every(n => typeof n === 'number')
  );
}

function validateHighlights(highlights) {
  return Array.isArray(highlights) && highlights.every(validateHighlight);
}

// Use before sending
if (validateHighlights(highlights)) {
  sendHighlights(highlights);
} else {
  console.error('Invalid highlights data');
}
```

## Troubleshooting

### Highlights Not Appearing

1. **Check console** for errors or messages
2. **Verify data format** - must be an array of objects
3. **Confirm timing** - ensure PDF viewer is loaded before sending
4. **Check filter view** - make sure filter sidebar is activated

### PostMessage Not Working

1. **Verify iframe src** is correct
2. **Check origin** - cross-origin restrictions may apply
3. **Inspect message** in browser DevTools Network tab
4. **Test with '*'** origin first, then restrict

### Request-Response Pattern Not Working

```javascript
// Make sure to wait for iframe to load
iframe.addEventListener('load', () => {
  // Wait for PDF.js to initialize
  setTimeout(() => {
    // Now PDF.js is ready to receive messages
    sendHighlights(highlights);
  }, 1000);
});
```

## Advanced Features

### Two-Way Communication

Enable the parent to receive updates when user modifies highlights:

```javascript
// In parent window
window.addEventListener('message', (event) => {
  if (event.data?.type === 'pdfjs-highlight-updated') {
    const updatedHighlight = event.data.data;
    console.log('Highlight updated:', updatedHighlight);
    // Save to server
    saveToServer(updatedHighlight);
  }
});
```

### Lazy Loading

Load highlights only when filter view is activated:

```javascript
// In parent window
window.addEventListener('message', (event) => {
  if (event.data?.type === 'pdfjs-request-highlights') {
    // Load from server only when needed
    fetchHighlights().then(highlights => {
      sendHighlights(highlights);
    });
  }
});
```

### Batch Updates

Send multiple highlight sets:

```javascript
const documentHighlights = {
  user1: [/* highlights from user 1 */],
  user2: [/* highlights from user 2 */],
  admin: [/* admin highlights */]
};

// Send combined highlights
const allHighlights = [
  ...documentHighlights.user1,
  ...documentHighlights.user2,
  ...documentHighlights.admin
];

sendHighlights(allHighlights);
```

## Browser Compatibility

| Browser | PostMessage | Custom Events | Static JSON |
|---------|-------------|---------------|-------------|
| Chrome  | ✅ Full     | ✅ Full       | ✅ Full     |
| Firefox | ✅ Full     | ✅ Full       | ✅ Full     |
| Safari  | ✅ Full     | ✅ Full       | ✅ Full     |
| Edge    | ✅ Full     | ✅ Full       | ✅ Full     |

## API Reference

### PDFFilterViewer Methods

#### `loadHighlights(externalData)`
Loads highlights from various sources
- **Parameters**: `externalData` (Array, optional) - Highlights array
- **Returns**: Promise<void>

#### `setHighlights(highlightsData)`
Directly sets highlights data
- **Parameters**: `highlightsData` (Array, required) - Highlights array
- **Returns**: void

#### `reset()`
Clears all highlights
- **Returns**: void

### Events

#### Outgoing (from PDF.js)
- `pdfjs-request-highlights` - Requests highlights from parent

#### Incoming (to PDF.js)
- `pdfjs-highlights` - Receives highlights data
- `pdfhighlightsdatareceived` - Custom event for same-origin

## License

Apache 2.0 (same as PDF.js)

---

**Version**: 1.0.0  
**Last Updated**: December 22, 2025
