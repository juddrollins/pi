/**
 * Raspberry Pi API Server
 * A RESTful API service for monitoring and managing a Raspberry Pi device.
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const si = require('systeminformation');

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Data storage file
const DATA_FILE = '/app/data/storage.json';
const DATA_DIR = path.dirname(DATA_FILE);

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

// Load data from persistent storage
async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        items: [],
        created_at: new Date().toISOString()
      };
    }
    console.error('Error loading data:', error);
    return { items: [], created_at: new Date().toISOString() };
  }
}

// Save data to persistent storage
async function saveData(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Raspberry Pi API Server',
    version: '1.0.0',
    status: 'running',
    runtime: 'Node.js',
    framework: 'Express',
    endpoints: {
      '/': 'API information',
      '/health': 'Health check',
      '/metrics': 'System metrics',
      '/api/items': 'CRUD operations for items',
      '/api/items/:id': 'Get/Delete specific item'
    }
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const uptime = process.uptime();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(uptime),
      node_version: process.version,
      platform: process.platform
    });
  } catch (error) {
    console.error('Error in health check:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// System metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const [cpu, mem, fsSize] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.fsSize()
    ]);

    const cpuUsage = await si.currentLoad();
    const disk = fsSize[0] || {};

    res.json({
      cpu: {
        percent: cpuUsage.currentLoad || 0,
        count: cpu.cores,
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        speed: cpu.speed
      },
      memory: {
        total_gb: round(mem.total / (1024 ** 3), 2),
        available_gb: round(mem.available / (1024 ** 3), 2),
        used_gb: round(mem.used / (1024 ** 3), 2),
        percent: round((mem.used / mem.total) * 100, 2)
      },
      disk: {
        total_gb: round(disk.size / (1024 ** 3), 2),
        used_gb: round(disk.used / (1024 ** 3), 2),
        free_gb: round(disk.available / (1024 ** 3), 2),
        percent: round((disk.used / disk.size) * 100, 2),
        filesystem: disk.fs || 'unknown',
        type: disk.type || 'unknown'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

// Get all items
app.get('/api/items', async (req, res) => {
  try {
    const data = await loadData();
    res.json({
      items: data.items || [],
      count: (data.items || []).length
    });
  } catch (error) {
    console.error('Error getting items:', error);
    res.status(500).json({ error: 'Failed to retrieve items' });
  }
});

// Create a new item
app.post('/api/items', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const data = await loadData();
    const items = data.items || [];
    
    const newItem = {
      id: items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1,
      name,
      description: description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    items.push(newItem);
    data.items = items;

    if (await saveData(data)) {
      console.log(`Created item: ${newItem.id}`);
      res.status(201).json(newItem);
    } else {
      res.status(500).json({ error: 'Failed to save item' });
    }
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific item by ID
app.get('/api/items/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    const data = await loadData();
    const items = data.items || [];
    const item = items.find(i => i.id === itemId);

    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    console.error('Error getting item:', error);
    res.status(500).json({ error: 'Failed to retrieve item' });
  }
});

// Delete an item by ID
app.delete('/api/items/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    const data = await loadData();
    const items = data.items || [];
    const originalCount = items.length;
    
    data.items = items.filter(i => i.id !== itemId);

    if (data.items.length < originalCount) {
      if (await saveData(data)) {
        console.log(`Deleted item: ${itemId}`);
        res.json({ message: 'Item deleted successfully' });
      } else {
        res.status(500).json({ error: 'Failed to save changes' });
      }
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Helper function to round numbers
function round(num, decimals) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Initialize and start server
async function start() {
  await ensureDataDir();
  
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log(`Node.js version: ${process.version}`);
    console.log(`Platform: ${process.platform} ${os.arch()}`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

