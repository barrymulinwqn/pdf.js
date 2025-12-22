# Quick Start Guide: PDF Selection Transfer

This guide will help you get started with the PDF.js selection transfer feature in under 5 minutes.

## Prerequisites

- Node.js 14+ installed
- A web browser (Chrome, Firefox, Safari, or Edge)
- Basic knowledge of JavaScript

## Step 1: Install Dependencies

Navigate to the examples directory and install required packages:

```bash
cd examples
npm install
```

## Step 2: Start the Backend Server

Start the Node.js backend server:

```bash
npm start
```

You should see:
```
╔════════════════════════════════════════════════════════╗
║   PDF.js Selection Backend Server                       ║
╠════════════════════════════════════════════════════════╣
║   Server running on: http://localhost:3000              ║
...
```

## Step 3: Open the Example Client

Open your web browser and navigate to:

```
http://localhost:3000/examples/selection-manager.html
```

## Step 4: Test the Feature

1. **Load a PDF**: The viewer should display a PDF (if you have one configured)
   - Alternatively, use: `http://localhost:3000/web/viewer.html?file=path/to/your.pdf`

2. **Select Text**: 
   - Click and drag to select text in the PDF viewer

3. **Save Selection**:
   - Click the "Save Selection" button (💾 icon) in the toolbar

4. **View Results**:
   - The selected text and metadata will appear in the right sidebar
   - Check the browser console for detailed logs
   - The selection is also saved to the backend

## Step 5: Verify Backend Storage

Run the test suite to verify everything is working:

```bash
npm test
```

Expected output:
```
============================================================
  PDF.js Selection Transfer - API Test Suite
============================================================

▶ Health Check
  ✓ Backend is healthy

▶ Save Selection
  ✓ Selection saved with ID: 1

▶ Get All Selections
  ✓ Retrieved 1 selection(s)
...
```

## What Happened?

When you saved the selection:

1. **PDF.js** captured:
   - The selected text
   - Page number
   - PDF coordinates
   - Timestamp

2. **Data was sent via**:
   - `postMessage` to the parent window
   - Custom event `pdfselectioncaptured`
   - Downloaded as JSON file

3. **Backend received and stored**:
   - The selection data in memory
   - Available via REST API

## Example API Requests

Once the server is running, you can interact with the API:

### Get all selections
```bash
curl http://localhost:3000/api/selections
```

### Get specific selection
```bash
curl http://localhost:3000/api/selections/1
```

### Get statistics
```bash
curl http://localhost:3000/api/stats
```

### Save a selection (programmatically)
```bash
curl -X POST http://localhost:3000/api/selections \
  -H "Content-Type: application/json" \
  -d '{
    "page": 1,
    "text": "Selected text from PDF",
    "location": [100, 200, 300, 50],
    "timestamp": 1703250000000,
    "documentUrl": "test.pdf"
  }'
```

## Integrating Into Your Application

### Simple Embedding

```html
<!DOCTYPE html>
<html>
<head>
  <title>My PDF App</title>
</head>
<body>
  <iframe src="path/to/pdfjs/web/viewer.html" width="100%" height="600"></iframe>
  
  <script>
    // Listen for selections
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'pdfjs-selection') {
        const selection = event.data.data;
        console.log('Got selection:', selection);
        
        // Send to your backend
        fetch('/api/save-selection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(selection)
        });
      }
    });
  </script>
</body>
</html>
```

### React Integration

```jsx
import React, { useEffect, useState } from 'react';

function PDFViewer() {
  const [selections, setSelections] = useState([]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'pdfjs-selection') {
        const newSelection = event.data.data;
        setSelections(prev => [...prev, newSelection]);
        
        // Save to backend
        fetch('/api/selections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSelection)
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div>
      <iframe 
        src="/pdfjs/web/viewer.html" 
        width="100%" 
        height="600"
      />
      <div>
        <h3>Selections: {selections.length}</h3>
        {selections.map((sel, idx) => (
          <div key={idx}>
            Page {sel.page}: {sel.text.substring(0, 50)}...
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Troubleshooting

### Backend not connecting
- Ensure the server is running on port 3000
- Check for firewall issues
- Verify CORS is enabled (already configured in backend-example.js)

### Selection not captured
- Make sure text is selected (highlighted)
- Click the "Save Selection" button with 💾 icon
- Check browser console for errors

### Cross-origin issues
- If PDF.js is on different domain, update postMessage origin in app.js
- Ensure CORS headers are properly set

### No data in sidebar
- Open browser DevTools → Console
- Look for "Received selection from PDF.js" message
- Verify iframe src is correct

## Next Steps

1. **Customize the UI**: Edit `selection-manager.html` to match your design
2. **Add Database**: Replace in-memory storage with MongoDB, PostgreSQL, etc.
3. **Add Authentication**: Secure the API with JWT or session-based auth
4. **Deploy**: Use Docker, Heroku, or AWS to deploy the backend

## Additional Resources

- [Full Documentation](../SELECTION_TRANSFER_README.md)
- [Backend API Reference](backend-example.js)
- [Client Examples](selection-client-example.html)
- [PDF.js Documentation](https://github.com/mozilla/pdf.js)

## Example Files

- `selection-client-example.html` - Basic client implementation
- `selection-manager.html` - Full-featured manager with backend
- `backend-example.js` - Node.js/Express backend server
- `test-selection-transfer.js` - Automated test suite

## Support

For issues or questions:
1. Check the [Full Documentation](../SELECTION_TRANSFER_README.md)
2. Review browser console for errors
3. Run the test suite: `npm test`
4. Check server logs

---

**Happy coding!** 🚀
