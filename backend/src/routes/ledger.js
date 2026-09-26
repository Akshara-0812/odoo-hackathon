const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// 1. Get all Stock Moves (Matching wireframe columns: Product | From | To | Quantity | Status)
router.get('/moves', (req, res) => {
  const { product_id, location_id, type, search, limit = 100 } = req.query;

  try {
    // Union executed stock_moves (Done) with active operation lines (Draft/Ready) for complete Move History
    let sql = `
      SELECT 
        sm.id,
        sm.operation_id,
        sm.quantity,
        sm.move_date,
        sm.notes,
        CASE 
          WHEN o.status = 'draft' THEN 'Draft' 
          WHEN o.status = 'ready' THEN 'Ready' 
          WHEN o.status = 'waiting' THEN 'Waiting' 
          ELSE 'Done' 
        END as status,
        p.id as product_id,
        p.name as product_name,
        p.sku as product_sku,
        p.uom as product_uom,
        src.name as source_location_name,
        src.code as source_location_code,
        src.type as source_location_type,
        dst.name as dest_location_name,
        dst.code as dest_location_code,
        dst.type as dest_location_type,
        o.reference_no as operation_reference,
        o.type as operation_type,
        o.partner_name,
        u.name as validated_by_name
      FROM stock_moves sm
      JOIN products p ON sm.product_id = p.id
      JOIN locations src ON sm.source_location_id = src.id
      JOIN locations dst ON sm.dest_location_id = dst.id
      LEFT JOIN operations o ON sm.operation_id = o.id
      LEFT JOIN users u ON o.created_by = u.id

      UNION ALL

      -- Include draft operations matching wireframe: Table | Stock/Shelf1 | WH/Output | 50 | Draft
      SELECT 
        (10000 + oi.id) as id,
        o.id as operation_id,
        oi.demand_qty as quantity,
        o.created_at as move_date,
        o.notes,
        'Draft' as status,
        p.id as product_id,
        p.name as product_name,
        p.sku as product_sku,
        p.uom as product_uom,
        src.name as source_location_name,
        src.code as source_location_code,
        src.type as source_location_type,
        dst.name as dest_location_name,
        dst.code as dest_location_code,
        dst.type as dest_location_type,
        o.reference_no as operation_reference,
        o.type as operation_type,
        o.partner_name,
        u.name as validated_by_name
      FROM operations o
      JOIN operation_items oi ON oi.operation_id = o.id
      JOIN products p ON oi.product_id = p.id
      JOIN locations src ON o.source_location_id = src.id
      JOIN locations dst ON o.dest_location_id = dst.id
      LEFT JOIN users u ON o.created_by = u.id
      WHERE o.status = 'draft'
    `;

    let moves = db.prepare(sql).all();

    // In-memory filtering for clean fast response
    if (product_id) {
      moves = moves.filter(m => String(m.product_id) === String(product_id));
    }
    if (type) {
      moves = moves.filter(m => m.operation_type === type);
    }
    if (search) {
      const term = search.toLowerCase();
      moves = moves.filter(m => 
        (m.product_name && m.product_name.toLowerCase().includes(term)) ||
        (m.product_sku && m.product_sku.toLowerCase().includes(term)) ||
        (m.source_location_name && m.source_location_name.toLowerCase().includes(term)) ||
        (m.dest_location_name && m.dest_location_name.toLowerCase().includes(term)) ||
        (m.operation_reference && m.operation_reference.toLowerCase().includes(term))
      );
    }

    moves.sort((a, b) => b.id - a.id);

    const stats = {
      totalMoves: moves.length,
      inboundMoves: moves.filter(m => m.source_location_type === 'vendor').length,
      outboundMoves: moves.filter(m => m.dest_location_type === 'customer').length,
      internalMoves: moves.filter(m => m.source_location_type === 'internal' && m.dest_location_type === 'internal').length,
      adjustments: moves.filter(m => m.source_location_type === 'inventory_loss' || m.dest_location_type === 'inventory_loss').length,
    };

    res.json({ moves: moves.slice(0, Number(limit)), stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Product Audit Trail with Running Balance Calculation
router.get('/trail/:productId', (req, res) => {
  const { productId } = req.params;

  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const moves = db.prepare(`
      SELECT 
        sm.id,
        sm.quantity,
        sm.move_date,
        sm.notes,
        src.name as source_location_name,
        src.code as source_location_code,
        src.type as source_location_type,
        dst.name as dest_location_name,
        dst.code as dest_location_code,
        dst.type as dest_location_type,
        o.reference_no,
        o.type as operation_type,
        o.partner_name
      FROM stock_moves sm
      JOIN locations src ON sm.source_location_id = src.id
      JOIN locations dst ON sm.dest_location_id = dst.id
      LEFT JOIN operations o ON sm.operation_id = o.id
      WHERE sm.product_id = ?
      ORDER BY sm.id ASC
    `).all(productId);

    let runningBalance = 0;
    const progressiveTrail = moves.map(m => {
      let delta = 0;
      if (m.dest_location_type === 'internal' && m.source_location_type !== 'internal') {
        delta = m.quantity;
      } else if (m.source_location_type === 'internal' && m.dest_location_type !== 'internal') {
        delta = -m.quantity;
      } else {
        delta = 0;
      }

      runningBalance += delta;

      return {
        ...m,
        delta,
        running_balance: runningBalance
      };
    });

    res.json({
      product,
      current_stock: runningBalance,
      trail: progressiveTrail.reverse()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
