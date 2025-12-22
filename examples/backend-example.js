/**
 * PDF.js Selection Backend Example
 *
 * This is a simple Node.js/Express server that demonstrates how to:
 * - Receive PDF selection data from the client
 * - Store selections in memory (or database)
 * - Provide an API to retrieve selections
 *
 * Usage:
 * 1. npm install express cors body-parser
 * 2. node examples/backend-example.js
 * 3. Server runs on http://localhost:3000
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..'))); // Serve PDF.js files

// In-memory storage (replace with database in production)
const selections = [];
let selectionIdCounter = 1;

/**
 * POST /api/selections
 * Save a new PDF selection
 */
app.post('/api/selections', (req, res) => {
  try {
    const selection = req.body;

    // Validate required fields
    if (!selection.page || !selection.text) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: page and text'
      });
    }

    // Validate data types
    if (typeof selection.page !== 'number' || typeof selection.text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data types'
      });
    }

    // Create selection record
    const selectionRecord = {
      id: selectionIdCounter++,
      page: selection.page,
      text: selection.text,
      location: selection.location || null,
      timestamp: selection.timestamp || Date.now(),
      documentUrl: selection.documentUrl || 'unknown',
      createdAt: new Date().toISOString(),
      // Add optional metadata
      metadata: {
        userAgent: req.get('user-agent'),
        ip: req.ip
      }
    };

    // Store selection
    selections.push(selectionRecord);

    console.log(`✓ Selection saved: ID=${selectionRecord.id}, Page=${selectionRecord.page}, Text length=${selectionRecord.text.length}`);

    res.json({
      success: true,
      id: selectionRecord.id,
      message: 'Selection saved successfully'
    });

  } catch (error) {
    console.error('Error saving selection:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/selections
 * Retrieve all selections or filter by document
 */
app.get('/api/selections', (req, res) => {
  try {
    const { documentUrl, page, limit } = req.query;

    let filteredSelections = [...selections];

    // Filter by document URL if provided
    if (documentUrl) {
      filteredSelections = filteredSelections.filter(
        s => s.documentUrl === documentUrl
      );
    }

    // Filter by page if provided
    if (page) {
      const pageNum = parseInt(page, 10);
      filteredSelections = filteredSelections.filter(
        s => s.page === pageNum
      );
    }

    // Limit results if specified
    if (limit) {
      const limitNum = parseInt(limit, 10);
      filteredSelections = filteredSelections.slice(-limitNum);
    }

    res.json({
      success: true,
      count: filteredSelections.length,
      selections: filteredSelections.reverse() // Most recent first
    });

  } catch (error) {
    console.error('Error retrieving selections:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/selections/:id
 * Retrieve a specific selection by ID
 */
app.get('/api/selections/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const selection = selections.find(s => s.id === id);

    if (!selection) {
      return res.status(404).json({
        success: false,
        error: 'Selection not found'
      });
    }

    res.json({
      success: true,
      selection
    });

  } catch (error) {
    console.error('Error retrieving selection:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/selections/:id
 * Delete a specific selection
 */
app.delete('/api/selections/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const index = selections.findIndex(s => s.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Selection not found'
      });
    }

    selections.splice(index, 1);
    console.log(`✓ Selection deleted: ID=${id}`);

    res.json({
      success: true,
      message: 'Selection deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting selection:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/selections/export
 * Export selections as JSON file
 */
app.post('/api/selections/export', (req, res) => {
  try {
    const { documentUrl } = req.body;

    let exportSelections = selections;
    if (documentUrl) {
      exportSelections = selections.filter(s => s.documentUrl === documentUrl);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="selections-export.json"');
    res.json({
      exportDate: new Date().toISOString(),
      totalSelections: exportSelections.length,
      selections: exportSelections
    });

  } catch (error) {
    console.error('Error exporting selections:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/stats
 * Get statistics about selections
 */
app.get('/api/stats', (req, res) => {
  try {
    // Group by document
    const byDocument = {};
    const byPage = {};

    selections.forEach(selection => {
      // Count by document
      byDocument[selection.documentUrl] = (byDocument[selection.documentUrl] || 0) + 1;

      // Count by page
      byPage[selection.page] = (byPage[selection.page] || 0) + 1;
    });

    // Calculate average text length
    const avgTextLength = selections.length > 0
      ? selections.reduce((sum, s) => sum + s.text.length, 0) / selections.length
      : 0;

    res.json({
      success: true,
      stats: {
        totalSelections: selections.length,
        uniqueDocuments: Object.keys(byDocument).length,
        uniquePages: Object.keys(byPage).length,
        averageTextLength: Math.round(avgTextLength),
        byDocument,
        byPage,
        oldestSelection: selections.length > 0 ? selections[0].createdAt : null,
        newestSelection: selections.length > 0 ? selections[selections.length - 1].createdAt : null
      }
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    selectionsCount: selections.length
  });
});

// Root endpoint - serve info
app.get('/api', (req, res) => {
  res.json({
    name: 'PDF.js Selection API',
    version: '1.0.0',
    endpoints: {
      'POST /api/selections': 'Save a new selection',
      'GET /api/selections': 'Get all selections',
      'GET /api/selections/:id': 'Get specific selection',
      'DELETE /api/selections/:id': 'Delete a selection',
      'POST /api/selections/export': 'Export selections as JSON',
      'GET /api/stats': 'Get selection statistics',
      'GET /health': 'Health check'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║   PDF.js Selection Backend Server                       ║
╠════════════════════════════════════════════════════════╣
║   Server running on: http://localhost:${PORT}              ║
║                                                         ║
║   API Endpoints:                                        ║
║   • POST   /api/selections      - Save selection       ║
║   • GET    /api/selections      - Get all selections   ║
║   • GET    /api/selections/:id  - Get one selection    ║
║   • DELETE /api/selections/:id  - Delete selection     ║
║   • POST   /api/selections/export - Export to JSON     ║
║   • GET    /api/stats           - Get statistics       ║
║   • GET    /health              - Health check         ║
║                                                         ║
║   Example Client:                                       ║
║   http://localhost:${PORT}/examples/selection-client-example.html   ║
╚════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  console.log(`Total selections saved: ${selections.length}`);
  process.exit(0);
});

module.exports = app; // For testing
