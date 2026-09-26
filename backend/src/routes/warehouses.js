const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// List all warehouses with their locations & total item counts
router.get('/', (req, res) => {
  try {
    const warehouses = db.prepare('SELECT * FROM warehouses ORDER BY name ASC').all();
    const locations = db.prepare(`
      SELECT 
        l.id, 
        l.warehouse_id, 
        l.name, 
        l.code, 
        l.type, 
        w.name as warehouse_name
      FROM locations l
      LEFT JOIN warehouses w ON l.warehouse_id = w.id
      ORDER BY l.type ASC, l.name ASC
    `).all();

    // Group locations under each warehouse
    const structured = warehouses.map(wh => ({
      ...wh,
      locations: locations.filter(loc => loc.warehouse_id === wh.id)
    }));

    // Also include virtual/external locations (vendor, customer, loss)
    const virtualLocations = locations.filter(loc => !loc.warehouse_id);

    res.json({
      warehouses: structured,
      virtualLocations,
      allLocations: locations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new Warehouse
router.post('/', requireAuth, (req, res) => {
  const { name, code, address } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Warehouse name and unique code are required.' });
  }

  try {
    const existing = db.prepare('SELECT id FROM warehouses WHERE code = ?').get(code.trim().toUpperCase());
    if (existing) {
      return res.status(400).json({ error: `Warehouse code '${code}' is already in use.` });
    }

    const result = db.prepare('INSERT INTO warehouses (name, code, address) VALUES (?, ?, ?)')
      .run(name.trim(), code.trim().toUpperCase(), address ? address.trim() : null);

    const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Warehouse created', warehouse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new Location / Rack in a Warehouse
router.post('/locations', requireAuth, (req, res) => {
  const { warehouse_id, name, code, type } = req.body;
  if (!warehouse_id || !name || !code) {
    return res.status(400).json({ error: 'Warehouse ID, location name, and location code are required.' });
  }

  try {
    const existing = db.prepare('SELECT id FROM locations WHERE code = ?').get(code.trim().toUpperCase());
    if (existing) {
      return res.status(400).json({ error: `Location code '${code}' already exists.` });
    }

    const locType = type || 'internal';
    const result = db.prepare('INSERT INTO locations (warehouse_id, name, code, type) VALUES (?, ?, ?, ?)')
      .run(warehouse_id, name.trim(), code.trim().toUpperCase(), locType);

    const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Location created', location });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
