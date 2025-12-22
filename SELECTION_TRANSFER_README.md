# PDF.js Selection Transfer Feature

## Overview

The `saveSelectionButton` functionality has been refactored to enable seamless transfer of selected text JSON content from the PDF viewer to parent/client applications. This feature allows embedding applications to capture user text selections with full metadata including coordinates, page numbers, and timestamps.

## How It Works

When a user selects text in the PDF viewer and clicks the "Save Selection" button, the system now:

1. **Captures Selection Data** - Extracts text content, page number, and PDF coordinates
2. **Transfers to Parent** - Sends data via `postMessage` if embedded in an iframe
3. **Dispatches Custom Event** - Fires `pdfselectioncaptured` event for same-origin parents
4. **Downloads JSON** - Creates a downloadable JSON file as fallback

## Data Format

The selection data is transferred in the following JSON structure:

```json
{
  "page": 1,
  "text": "Selected text content from the PDF",
  "location": [x, y, width, height],
  "timestamp": 1703250000000,
  "documentUrl": "path/to/document.pdf"
}
```

### Fields Description

- **page** (number): The page number where the text was selected (1-indexed)
- **text** (string): The actual text content that was selected
- **location** (array): PDF coordinates in the format [x, y, width, height]
  - `x`: Left position in PDF coordinates
  - `y`: Top position in PDF coordinates
  - `width`: Width of the selection bounding box
  - `height`: Height of the selection bounding box
- **timestamp** (number): Unix timestamp (milliseconds) when selection was captured
- **documentUrl** (string): The URL or path of the PDF document

## Integration Methods

### Method 1: PostMessage (Cross-Origin Support)

This is the primary method for embedded viewers, especially when the viewer is in a different origin.

**Parent Window Setup:**

```javascript
// Listen for messages from the PDF viewer
window.addEventListener('message', (event) => {
  // Verify it's from PDF.js
  if (event.data && 
      event.data.type === 'pdfjs-selection' && 
      event.data.source === 'pdf.js') {
    
    const selectionData = event.data.data;
    console.log('Received selection:', selectionData);
    
    // Process the selection data
    handlePDFSelection(selectionData);
  }
}, false);

function handlePDFSelection(data) {
  // Send to backend
  fetch('/api/selections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  // Or update UI
  displaySelection(data);
}
```

**HTML Structure:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>PDF Viewer Client</title>
</head>
<body>
  <iframe src="path/to/pdfjs/web/viewer.html" width="100%" height="600"></iframe>
  <script src="selection-handler.js"></script>
</body>
</html>
```

### Method 2: Custom Event (Same-Origin)

For same-origin embedding, you can also listen to custom events.

```javascript
document.addEventListener('pdfselectioncaptured', (event) => {
  const selectionData = event.detail;
  console.log('Selection captured:', selectionData);
  
  // Process the data
  processSelection(selectionData);
}, false);
```

### Method 3: Direct Access (Same Window)

If PDF.js is loaded in the same window (not iframe):

```javascript
// Access PDFViewerApplication after it's loaded
document.addEventListener('webviewerloaded', () => {
  // You can override the saveSelectionAsJson method
  const originalMethod = PDFViewerApplication.saveSelectionAsJson;
  
  PDFViewerApplication.saveSelectionAsJson = async function() {
    // Call original
    await originalMethod.call(this);
    
    // Your custom logic
    console.log('Selection saved');
  };
});
```

## Complete Integration Example

See [examples/selection-client-example.html](examples/selection-client-example.html) for a fully working example that demonstrates:

- Embedding PDF.js viewer in an iframe
- Capturing selections via postMessage
- Displaying captured selections in a sidebar
- Sending data to a backend API
- Managing multiple selections

## Security Considerations

### PostMessage Origin

The current implementation uses `'*'` as the target origin for `postMessage`:

```javascript
window.parent.postMessage(data, '*');
```

**⚠️ For production environments**, you should restrict this to specific origins:

```javascript
// Option 1: Specific origin
window.parent.postMessage(data, 'https://yourdomain.com');

// Option 2: Using an environment variable
const PARENT_ORIGIN = process.env.PARENT_ORIGIN || '*';
window.parent.postMessage(data, PARENT_ORIGIN);
```

### Validating Incoming Messages

Always validate messages in the parent window:

```javascript
window.addEventListener('message', (event) => {
  // Check origin
  if (event.origin !== 'https://trusted-domain.com') {
    return;
  }
  
  // Verify message structure
  if (!event.data || 
      event.data.type !== 'pdfjs-selection' ||
      event.data.source !== 'pdf.js') {
    return;
  }
  
  // Validate data structure
  const data = event.data.data;
  if (!data || 
      typeof data.page !== 'number' ||
      typeof data.text !== 'string') {
    console.error('Invalid selection data structure');
    return;
  }
  
  // Process valid data
  handleSelection(data);
});
```

## Backend Integration Examples

### Node.js / Express

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/api/selections', (req, res) => {
  const selection = req.body;
  
  // Validate
  if (!selection.page || !selection.text) {
    return res.status(400).json({ error: 'Invalid selection data' });
  }
  
  // Store in database
  db.selections.insert({
    page: selection.page,
    text: selection.text,
    location: selection.location,
    timestamp: selection.timestamp,
    documentUrl: selection.documentUrl,
    userId: req.user.id // If authenticated
  });
  
  res.json({ success: true, id: selection.timestamp });
});
```

### Python / Flask

```python
from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)

@app.route('/api/selections', methods=['POST'])
def save_selection():
    data = request.json
    
    # Validate
    if not data.get('page') or not data.get('text'):
        return jsonify({'error': 'Invalid selection data'}), 400
    
    # Store in database
    selection = {
        'page': data['page'],
        'text': data['text'],
        'location': data['location'],
        'timestamp': data['timestamp'],
        'document_url': data['documentUrl'],
        'captured_at': datetime.now()
    }
    
    db.selections.insert_one(selection)
    
    return jsonify({'success': True, 'id': str(selection['_id'])})
```

## Customization Options

### Disable Auto-Download

If you want to only send data to parent without downloading:

```javascript
// In app.js, modify saveSelectionAsJson()
// Comment out or remove the download section:
/*
const jsonString = JSON.stringify(data, null, 2);
const blob = new Blob([jsonString], { type: 'application/json' });
// ... rest of download code
*/
```

### Add Additional Metadata

You can extend the data object to include more information:

```javascript
const data = {
  page: pageNumber,
  text: selectedText,
  location: location,
  timestamp: Date.now(),
  documentUrl: this.url || window.location.href,
  // Add custom fields
  userId: getCurrentUserId(),
  sessionId: getSessionId(),
  viewport: {
    scale: this.pdfViewer.currentScale,
    rotation: pageView.rotation
  },
  // Include text styling if needed
  textMetadata: getTextMetadata(range)
};
```

### Custom Event Handling

Override the event dispatch behavior:

```javascript
// Create custom event with different name
const customEvent = new CustomEvent("myapp-pdf-selection", {
  bubbles: true,
  cancelable: false,
  detail: {
    selection: data,
    // Add your custom properties
    source: 'pdf-viewer',
    version: '1.0'
  }
});
```

## Testing

### Manual Testing

1. Open the example client page:
   ```
   http://localhost:8080/examples/selection-client-example.html
   ```

2. Open browser DevTools Console

3. Select text in the PDF viewer

4. Click the "Save Selection" button

5. Verify:
   - Console shows "Received selection from PDF.js"
   - Selection appears in the sidebar
   - JSON file is downloaded

### Automated Testing

```javascript
// Example test with Jest/Puppeteer
describe('PDF Selection Transfer', () => {
  it('should send selection data to parent window', async () => {
    const page = await browser.newPage();
    
    // Setup message listener
    const messagePromise = page.evaluate(() => {
      return new Promise(resolve => {
        window.addEventListener('message', (event) => {
          if (event.data.type === 'pdfjs-selection') {
            resolve(event.data.data);
          }
        });
      });
    });
    
    await page.goto('http://localhost:8080/examples/selection-client-example.html');
    
    // Perform text selection and click save button
    // ... test logic ...
    
    const selectionData = await messagePromise;
    expect(selectionData).toHaveProperty('page');
    expect(selectionData).toHaveProperty('text');
    expect(selectionData).toHaveProperty('location');
  });
});
```

## Troubleshooting

### Selection Data Not Received

1. **Check iframe embedding**: Ensure the viewer is properly embedded
2. **Verify event listeners**: Check that message listener is registered before selection
3. **Console errors**: Look for CORS or postMessage errors in console
4. **Origin restrictions**: If using origin restrictions, verify they match

### Incorrect Coordinates

1. **PDF scale**: Coordinates are in PDF coordinate space, not screen pixels
2. **Rotation**: Check if page rotation affects coordinates
3. **Viewport**: Consider the current viewport scale when interpreting coordinates

### Cross-Origin Issues

1. **CORS headers**: Ensure proper CORS headers if loading PDF from different origin
2. **PostMessage origin**: Use specific origin instead of '*' in production
3. **iframe sandbox**: Check iframe sandbox attributes

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support  
- Safari: ✅ Full support (iOS 13+)
- Opera: ✅ Full support

## License

This feature is part of PDF.js and follows the same Apache 2.0 License.

## Related Documentation

- [PDF.js Main Documentation](README.md)
- [Embedding PDF.js](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#embedding)
- [Window.postMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [CustomEvent API](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)
