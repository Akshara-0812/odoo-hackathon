const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function getProductsStock() {
  return db.prepare(`
    SELECT 
      p.id,
      p.sku,
      p.name,
      p.category_id,
      c.name as category_name,
      p.uom,
      p.per_unit_cost,
      p.min_stock_alert,
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
  `).all();
}

// 1. Dashboard KPIs Overview (Matching wireframe cards exactly)
router.get('/kpis', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const products = getProductsStock().map(p => ({
      ...p,
      on_hand: p.current_stock,
      free_to_use: Math.max(0, p.current_stock - p.reserved_stock),
      is_low_stock: p.current_stock <= p.min_stock_alert
    }));

    const totalProducts = products.length;
    const inStockCount = products.filter(p => p.current_stock > 0).length;
    const lowStockItems = products.filter(p => p.is_low_stock);

    // Wireframe Card 1: Receipt Stats
    const receiptToReceive = db.prepare(`
      SELECT COUNT(*) as count FROM operations 
      WHERE type = 'receipt' AND status IN ('ready', 'waiting')
    `).get().count;

    const receiptLate = db.prepare(`
      SELECT COUNT(*) as count FROM operations 
      WHERE type = 'receipt' AND status NOT IN ('done', 'canceled') AND scheduled_date < ?
    `).get(today).count;

    const receiptTotalOps = db.prepare(`
      SELECT COUNT(*) as count FROM operations WHERE type = 'receipt'
    `).get().count;

    // Wireframe Card 2: Delivery Stats
    const deliveryToDeliver = db.prepare(`
      SELECT COUNT(*) as count FROM operations 
      WHERE type = 'delivery' AND status IN ('ready', 'waiting')
    `).get().count;

    const deliveryLate = db.prepare(`
      SELECT COUNT(*) as count FROM operations 
      WHERE type = 'delivery' AND status NOT IN ('done', 'canceled') AND scheduled_date < ?
    `).get(today).count;

    const deliveryWaiting = db.prepare(`
      SELECT COUNT(*) as count FROM operations 
      WHERE type = 'delivery' AND status = 'waiting'
    `).get().count;

    const deliveryTotalOps = db.prepare(`
      SELECT COUNT(*) as count FROM operations WHERE type = 'delivery'
    `).get().count;

    const internalScheduled = db.prepare(`
      SELECT COUNT(*) as count FROM operations 
      WHERE type = 'internal' AND status IN ('draft', 'waiting', 'ready')
    `).get().count;

    const totalWarehouses = db.prepare('SELECT COUNT(*) as count FROM warehouses').get().count;

    res.json({
      kpis: {
        totalProducts,
        inStockCount,
        lowStockCount: lowStockItems.length,
        // Wireframe Specific Cards:
        receiptCard: {
          toReceive: receiptToReceive,
          late: receiptLate,
          totalOperations: receiptTotalOps
        },
        deliveryCard: {
          toDeliver: deliveryToDeliver,
          late: deliveryLate,
          waiting: deliveryWaiting,
          totalOperations: deliveryTotalOps
        },
        internalScheduled,
        totalWarehouses
      },
      lowStockAlerts: lowStockItems.slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Dynamic Operations Feed with Multi-Dimensional Filters
router.get('/feed', (req, res) => {
  const { type, status, warehouse_id, location_id, category_id, search, limit = 20 } = req.query;

  try {
    let sql = `
      SELECT 
        o.id,
        o.reference_no,
        o.type,
        o.status,
        o.partner_name,
        o.scheduled_date,
        o.notes,
        o.created_at,
        o.validated_at,
        src.name as source_location_name,
        src.code as source_location_code,
        dst.name as dest_location_name,
        dst.code as dest_location_code,
        COUNT(DISTINCT oi.id) as item_count,
        COALESCE(SUM(oi.demand_qty), 0) as total_demand_qty
      FROM operations o
      LEFT JOIN locations src ON o.source_location_id = src.id
      LEFT JOIN locations dst ON o.dest_location_id = dst.id
      LEFT JOIN operation_items oi ON oi.operation_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (type && type !== 'all') {
      sql += ' AND o.type = ?';
      params.push(type);
    }

    if (status && status !== 'all') {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (warehouse_id && warehouse_id !== 'all') {
      sql += ' AND (src.warehouse_id = ? OR dst.warehouse_id = ?)';
      params.push(warehouse_id, warehouse_id);
    }

    if (category_id && category_id !== 'all') {
      sql += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (search) {
      sql += ' AND (o.reference_no LIKE ? OR o.partner_name LIKE ? OR p.name LIKE ? OR p.sku LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' GROUP BY o.id ORDER BY o.id DESC LIMIT ?';
    params.push(Number(limit));

    const feed = db.prepare(sql).all(...params);
    res.json({ feed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
