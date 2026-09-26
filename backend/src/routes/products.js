const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Helper to compute on-hand stock and free-to-use for products
function getStockSql() {
  return `
    SELECT 
      p.id,
      p.sku,
      p.name,
      p.category_id,
      c.name as category_name,
      p.uom,
      p.per_unit_cost,
      p.min_stock_alert,
      p.description,
      p.created_at,
      -- On Hand Stock across all internal locations
      COALESCE(
        (
          SELECT SUM(
            CASE 
              WHEN sm.dest_location_id = l.id THEN sm.quantity
              WHEN sm.source_location_id = l.id THEN -sm.quantity
              ELSE 0
            END
          )
          FROM stock_moves sm
          JOIN locations l ON (l.id = sm.dest_location_id OR l.id = sm.source_location_id)
          WHERE sm.product_id = p.id AND l.type = 'internal'
        ), 0
      ) as current_stock,
      -- Reserved demand in ready/pending deliveries
      COALESCE(
        (
          SELECT SUM(oi.demand_qty - oi.done_qty)
          FROM operation_items oi
          JOIN operations o ON oi.operation_id = o.id
          WHERE oi.product_id = p.id AND o.type = 'delivery' AND o.status IN ('ready', 'draft')
        ), 0
      ) as reserved_stock
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
  `;
}

// 1. List all products with On Hand & Free to Use calculation matching wireframe
router.get('/', (req, res) => {
  const { search, category_id, low_stock } = req.query;

  try {
    let query = getStockSql() + ' WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(category_id);
    }

    query += ' ORDER BY p.name ASC';

    let products = db.prepare(query).all(...params);

    // Compute free to use
    products = products.map(p => {
      const freeToUse = Math.max(0, p.current_stock - p.reserved_stock);
      return {
        ...p,
        on_hand: p.current_stock,
        free_to_use: freeToUse,
        is_low_stock: p.current_stock <= p.min_stock_alert
      };
    });

    if (low_stock === 'true') {
      products = products.filter(p => p.is_low_stock);
    }

    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get single product details + Stock breakdown per location
router.get('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const product = db.prepare(getStockSql() + ' WHERE p.id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const freeToUse = Math.max(0, product.current_stock - product.reserved_stock);

    const locationBreakdown = db.prepare(`
      SELECT 
        l.id as location_id,
        l.name as location_name,
        l.code as location_code,
        w.name as warehouse_name,
        COALESCE(
          SUM(
            CASE 
              WHEN sm.dest_location_id = l.id THEN sm.quantity
              WHEN sm.source_location_id = l.id THEN -sm.quantity
              ELSE 0
            END
          ), 0
        ) as stock_qty
      FROM locations l
      LEFT JOIN warehouses w ON l.warehouse_id = w.id
      LEFT JOIN stock_moves sm ON (sm.dest_location_id = l.id OR sm.source_location_id = l.id) AND sm.product_id = ?
      WHERE l.type = 'internal'
      GROUP BY l.id
      ORDER BY w.name ASC, l.name ASC
    `).all(id);

    res.json({
      product: {
        ...product,
        on_hand: product.current_stock,
        free_to_use: freeToUse,
        is_low_stock: product.current_stock <= product.min_stock_alert,
        locations: locationBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. User update stock directly from Stock table (Wireframe annotation: "User must be able to update the stock from here")
router.post('/:id/update-stock', requireAuth, (req, res) => {
  const { id } = req.params;
  const { new_on_hand, location_id, reason } = req.body;

  if (new_on_hand === undefined) {
    return res.status(400).json({ error: 'New on-hand quantity is required.' });
  }

  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Default to main internal shelf location if not specified
    let targetLocId = location_id;
    if (!targetLocId) {
      const defaultLoc = db.prepare("SELECT id FROM locations WHERE type = 'internal' LIMIT 1").get();
      targetLocId = defaultLoc.id;
    }

    const currentLocStock = db.prepare(`
      SELECT COALESCE(
        SUM(
          CASE 
            WHEN dest_location_id = ? THEN quantity
            WHEN source_location_id = ? THEN -quantity
            ELSE 0
          END
        ), 0
      ) as stock
      FROM stock_moves
      WHERE product_id = ? AND (dest_location_id = ? OR source_location_id = ?)
    `).get(targetLocId, targetLocId, id, targetLocId, targetLocId).stock;

    const delta = Number(new_on_hand) - currentLocStock;
    if (delta !== 0) {
      const lossLoc = db.prepare("SELECT id FROM locations WHERE type = 'inventory_loss' LIMIT 1").get();
      const sourceLoc = delta > 0 ? lossLoc.id : targetLocId;
      const destLoc = delta > 0 ? targetLocId : lossLoc.id;

      db.prepare(`
        INSERT INTO stock_moves (product_id, source_location_id, dest_location_id, quantity, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        id, 
        sourceLoc, 
        destLoc, 
        Math.abs(delta), 
        reason || `Manual stock update from Stock table (was ${currentLocStock}, set to ${new_on_hand})`
      );
    }

    res.json({
      message: `Stock for ${product.name} updated to ${new_on_hand}`,
      new_on_hand: Number(new_on_hand)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Create a new product
router.post('/', requireAuth, (req, res) => {
  const { name, sku, category_id, uom, per_unit_cost, min_stock_alert, description, initial_stock, initial_location_id } = req.body;

  if (!name || !sku) {
    return res.status(400).json({ error: 'Product name and SKU are required.' });
  }

  try {
    const existingSku = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku.trim().toUpperCase());
    if (existingSku) {
      return res.status(400).json({ error: `SKU '${sku}' is already in use by another product.` });
    }

    const insertTransaction = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO products (sku, name, category_id, uom, per_unit_cost, min_stock_alert, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        sku.trim().toUpperCase(),
        name.trim(),
        category_id ? Number(category_id) : null,
        uom ? uom.trim().toLowerCase() : 'units',
        per_unit_cost !== undefined ? Number(per_unit_cost) : 0,
        min_stock_alert !== undefined ? Number(min_stock_alert) : 10,
        description ? description.trim() : null
      );

      const productId = result.lastInsertRowid;

      const initialQty = Number(initial_stock);
      if (initialQty > 0) {
        let targetLocationId = initial_location_id;
        if (!targetLocationId) {
          const defaultLoc = db.prepare("SELECT id FROM locations WHERE type = 'internal' LIMIT 1").get();
          targetLocationId = defaultLoc ? defaultLoc.id : null;
        }

        const virtualVendorLoc = db.prepare("SELECT id FROM locations WHERE type = 'vendor' LIMIT 1").get();

        if (targetLocationId && virtualVendorLoc) {
          db.prepare(`
            INSERT INTO stock_moves (product_id, source_location_id, dest_location_id, quantity, notes)
            VALUES (?, ?, ?, ?, ?)
          `).run(productId, virtualVendorLoc.id, targetLocationId, initialQty, 'Initial opening stock balance');
        }
      }

      return productId;
    });

    const newProductId = insertTransaction();
    const createdProduct = db.prepare(getStockSql() + ' WHERE p.id = ?').get(newProductId);

    res.status(201).json({
      message: 'Product created successfully',
      product: createdProduct
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Update an existing product
router.put('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { name, sku, category_id, uom, per_unit_cost, min_stock_alert, description } = req.body;

  try {
    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    db.prepare(`
      UPDATE products 
      SET 
        name = COALESCE(?, name),
        sku = COALESCE(?, sku),
        category_id = COALESCE(?, category_id),
        uom = COALESCE(?, uom),
        per_unit_cost = COALESCE(?, per_unit_cost),
        min_stock_alert = COALESCE(?, min_stock_alert),
        description = COALESCE(?, description)
      WHERE id = ?
    `).run(
      name ? name.trim() : null,
      sku ? sku.trim().toUpperCase() : null,
      category_id ? Number(category_id) : null,
      uom ? uom.trim().toLowerCase() : null,
      per_unit_cost !== undefined ? Number(per_unit_cost) : null,
      min_stock_alert !== undefined ? Number(min_stock_alert) : null,
      description !== undefined ? description : null,
      id
    );

    const updated = db.prepare(getStockSql() + ' WHERE p.id = ?').get(id);
    res.json({ message: 'Product updated successfully', product: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
