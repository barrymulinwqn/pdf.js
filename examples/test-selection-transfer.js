/**
 * Simple test script to verify PDF selection transfer functionality
 * Run with: node examples/test-selection-transfer.js
 */

const http = require('http');

// Test configuration
const TEST_SELECTION = {
  page: 1,
  text: "This is a test selection from the PDF document.",
  location: [100, 200, 300, 50],
  timestamp: Date.now(),
  documentUrl: "test-document.pdf"
};

const API_BASE = 'http://localhost:3000/api';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  console.log(`\n${colors.cyan}▶ ${name}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`  ${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`  ${colors.red}✗ ${message}${colors.reset}`);
}

// Helper to make HTTP requests
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: method,
      headers: {}
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsedBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  logTest('Health Check');
  try {
    const result = await makeRequest('http://localhost:3000/health');
    if (result.status === 200 && result.data.status === 'ok') {
      logSuccess('Backend is healthy');
      return true;
    } else {
      logError('Backend health check failed');
      return false;
    }
  } catch (error) {
    logError(`Failed to connect: ${error.message}`);
    return false;
  }
}

async function testSaveSelection() {
  logTest('Save Selection');
  try {
    const result = await makeRequest(`${API_BASE}/selections`, 'POST', TEST_SELECTION);
    if (result.status === 200 && result.data.success) {
      logSuccess(`Selection saved with ID: ${result.data.id}`);
      return result.data.id;
    } else {
      logError(`Failed to save: ${JSON.stringify(result.data)}`);
      return null;
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return null;
  }
}

async function testGetSelections() {
  logTest('Get All Selections');
  try {
    const result = await makeRequest(`${API_BASE}/selections`);
    if (result.status === 200 && result.data.success) {
      logSuccess(`Retrieved ${result.data.count} selection(s)`);
      return result.data.selections;
    } else {
      logError(`Failed to get selections: ${JSON.stringify(result.data)}`);
      return null;
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return null;
  }
}

async function testGetSelectionById(id) {
  logTest(`Get Selection by ID (${id})`);
  try {
    const result = await makeRequest(`${API_BASE}/selections/${id}`);
    if (result.status === 200 && result.data.success) {
      logSuccess(`Retrieved selection: "${result.data.selection.text.substring(0, 30)}..."`);
      return result.data.selection;
    } else {
      logError(`Failed to get selection: ${JSON.stringify(result.data)}`);
      return null;
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return null;
  }
}

async function testGetStats() {
  logTest('Get Statistics');
  try {
    const result = await makeRequest(`${API_BASE}/stats`);
    if (result.status === 200 && result.data.success) {
      const stats = result.data.stats;
      logSuccess(`Total selections: ${stats.totalSelections}`);
      logSuccess(`Unique documents: ${stats.uniqueDocuments}`);
      logSuccess(`Average text length: ${stats.averageTextLength}`);
      return stats;
    } else {
      logError(`Failed to get stats: ${JSON.stringify(result.data)}`);
      return null;
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return null;
  }
}

async function testDeleteSelection(id) {
  logTest(`Delete Selection (${id})`);
  try {
    const result = await makeRequest(`${API_BASE}/selections/${id}`, 'DELETE');
    if (result.status === 200 && result.data.success) {
      logSuccess('Selection deleted successfully');
      return true;
    } else {
      logError(`Failed to delete: ${JSON.stringify(result.data)}`);
      return false;
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return false;
  }
}

async function testValidation() {
  logTest('Validation Tests');

  // Test invalid data (missing required fields)
  try {
    const result = await makeRequest(`${API_BASE}/selections`, 'POST', { page: 1 });
    if (result.status === 400) {
      logSuccess('Correctly rejected invalid data');
    } else {
      logError('Should have rejected invalid data');
    }
  } catch (error) {
    logError(`Validation test failed: ${error.message}`);
  }
}

// Run all tests
async function runTests() {
  console.log('\n' + '='.repeat(60));
  log('  PDF.js Selection Transfer - API Test Suite', 'blue');
  console.log('='.repeat(60));

  // Check if backend is running
  const isHealthy = await testHealthCheck();
  if (!isHealthy) {
    log('\n⚠ Backend server is not running!', 'yellow');
    log('Please start the server first: node examples/backend-example.js\n', 'yellow');
    process.exit(1);
  }

  // Run tests
  const selectionId = await testSaveSelection();
  await testGetSelections();

  if (selectionId) {
    await testGetSelectionById(selectionId);
    await testGetStats();
    await testValidation();
    await testDeleteSelection(selectionId);
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  log('  Test Suite Completed', 'green');
  console.log('='.repeat(60) + '\n');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
