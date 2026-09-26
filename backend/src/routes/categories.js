const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// List categories with product counts
router.get('/', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT 
        c.id, 
        c.name, 
        c.description, 
        c.created_at,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();

    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new category
router.post('/', requireAuth, (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(name.trim());
    if (existing) {
      return res.status(400).json({ error: `Category '${name}' already exists.` });
    }

    const result = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)')
      .run(name.trim(), description ? description.trim() : null);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Category created', category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
