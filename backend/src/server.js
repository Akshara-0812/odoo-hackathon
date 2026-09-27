const express = require('express');
const cors = require('cors');
const db = require('./db');
const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const warehousesRouter = require('./routes/warehouses');
const operationsRouter = require('./routes/operations');
const ledgerRouter = require('./routes/ledger');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend dev server
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/warehouses', warehousesRouter);
app.use('/api/operations', operationsRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/dashboard', dashboardRouter);


// Health Check & DB connection verification endpoint
app.get('/api/health', (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const warehouseCount = db.prepare('SELECT COUNT(*) as count FROM warehouses').get().count;
    const locationCount = db.prepare('SELECT COUNT(*) as count FROM locations').get().count;

    res.json({
      status: 'healthy',
      message: 'StockSense Backend API is running smoothly',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        stats: {
          users: userCount,
          products: productCount,
          warehouses: warehouseCount,
          locations: locationCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database check failed',
      error: error.message
    });
  }
});


const path = require('path');
const fs = require('fs');

// Serve static frontend files in production if dist exists
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  
  // Express 5 compatible SPA fallback middleware
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

app.listen(PORT, () => {
  console.log(`🚀 StockSense Server running on port ${PORT}`);
});

