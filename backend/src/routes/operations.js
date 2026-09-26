const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Helper to compute on-hand stock for a product at a specific location
function getLocationStock(productId, locationId) {
  const result = db.prepare(`
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
  `).get(locationId, locationId, productId, locationId, locationId);

  return result ? result.stock : 0;
}

// Generate sequential reference numbers like Odoo: WH/IN/0001, WH/OUT/0001, WH/INT/0001, WH/ADJ/0001
function generateReferenceNo(type) {
  const prefixMap = {
    receipt: 'WH/IN/',
    delivery: 'WH/OUT/',
    internal: 'WH/INT/',
    adjustment: 'WH/ADJ/'
  };
  const prefix = prefixMap[type] || 'WH/OP/';

  const lastOp = db.prepare(`
    SELECT reference_no FROM operations 
    WHERE reference_no LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextNum = 1;
  if (lastOp && lastOp.reference_no) {
    const parts = lastOp.reference_no.split('/');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

// 1. List Operations with filters
router.get('/', (req, res) => {
  const { type, status, search } = req.query;

  try {
    let sql = `
      SELECT 
        o.id,
        o.reference_no,
        o.type,
        o.status,
        o.partner_name,
        o.notes,
        o.created_at,
        o.validated_at,
        u.name as created_by_name,
        src.name as source_location_name,
        src.code as source_location_code,
        dst.name as dest_location_name,
        dst.code as dest_location_code,
        COUNT(oi.id) as item_count,
        COALESCE(SUM(oi.demand_qty), 0) as total_demand_qty,
        COALESCE(SUM(oi.done_qty), 0) as total_done_qty,
        COALESCE(SUM(CASE WHEN oi.good_qty > 0 THEN oi.good_qty WHEN o.status = 'done' THEN oi.done_qty ELSE 0 END), 0) as total_good_qty,
        COALESCE(SUM(oi.damaged_qty), 0) as total_damaged_qty,
        GROUP_CONCAT(p.name || ' (' || CAST(oi.demand_qty AS INT) || ' ' || p.uom || ')', ', ') as product_summary,
        GROUP_CONCAT(DISTINCT p.name) as product_names
      FROM operations o
      LEFT JOIN users u ON o.created_by = u.id
      LEFT JOIN locations src ON o.source_location_id = src.id
      LEFT JOIN locations dst ON o.dest_location_id = dst.id
      LEFT JOIN operation_items oi ON oi.operation_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      sql += ' AND o.type = ?';
      params.push(type);
    }

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (o.reference_no LIKE ? OR o.partner_name LIKE ? OR o.notes LIKE ? OR p.name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' GROUP BY o.id ORDER BY o.id DESC';

    const operations = db.prepare(sql).all(...params);
    res.json({ operations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get Single Operation details + line items
router.get('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const operation = db.prepare(`
      SELECT 
        o.*,
        u.name as created_by_name,
        src.name as source_location_name,
        src.code as source_location_code,
        src.type as source_location_type,
        dst.name as dest_location_name,
        dst.code as dest_location_code,
        dst.type as dest_location_type
      FROM operations o
      LEFT JOIN users u ON o.created_by = u.id
      LEFT JOIN locations src ON o.source_location_id = src.id
      LEFT JOIN locations dst ON o.dest_location_id = dst.id
      WHERE o.id = ?
    `).get(id);

    if (!operation) {
      return res.status(404).json({ error: 'Operation document not found.' });
    }

    // Get item lines with product info and current location stock
    const items = db.prepare(`
      SELECT 
        oi.*,
        p.name as product_name,
        p.sku as product_sku,
        p.uom as product_uom,
        p.min_stock_alert
      FROM operation_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.operation_id = ?
    `).all(id);

    // Attach available stock at source location for each item
    const itemsWithAvailability = items.map(item => ({
      ...item,
      source_stock_available: getLocationStock(item.product_id, operation.source_location_id)
    }));

    res.json({
      operation: {
        ...operation,
        items: itemsWithAvailability
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Create a new Operation
router.post('/', requireAuth, (req, res) => {
  const { type, partner_name, source_location_id, dest_location_id, notes, items } = req.body;

  if (!type || !source_location_id || !dest_location_id) {
    return res.status(400).json({ error: 'Operation type, source location, and destination location are required.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Please add at least one product item line.' });
  }

  try {
    const reference_no = generateReferenceNo(type);
    const userId = req.user.id;

    // Determine initial status:
    // Receipts usually start at 'ready' or 'draft'
    // Deliveries start at 'waiting' (check availability) or 'ready'
    let initialStatus = 'draft';
    if (type === 'receipt') {
      initialStatus = 'ready';
    } else {
      // Check if stock is available right away for outgoing/transfers
      let allAvailable = true;
      for (const itm of items) {
        const available = getLocationStock(itm.product_id, source_location_id);
        if (available < Number(itm.demand_qty)) {
          allAvailable = false;
          break;
        }
      }
      initialStatus = allAvailable ? 'ready' : 'waiting';
    }

    const createTransaction = db.transaction(() => {
      const opStmt = db.prepare(`
        INSERT INTO operations (
          reference_no, type, status, source_location_id, dest_location_id,
          partner_name, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const opResult = opStmt.run(
        reference_no,
        type,
        initialStatus,
        source_location_id,
        dest_location_id,
        partner_name ? partner_name.trim() : null,
        notes ? notes.trim() : null,
        userId
      );
      const operationId = opResult.lastInsertRowid;

      // Insert line items
      const itemStmt = db.prepare(`
        INSERT INTO operation_items (operation_id, product_id, demand_qty, done_qty)
        VALUES (?, ?, ?, ?)
      `);

      for (const item of items) {
        const demandQty = Number(item.demand_qty) || 1;
        const doneQty = item.done_qty !== undefined ? Number(item.done_qty) : 0;
        itemStmt.run(operationId, item.product_id, demandQty, doneQty);
      }

      return operationId;
    });

    const newOpId = createTransaction();
    res.status(201).json({
      message: `${type.toUpperCase()} order created successfully`,
      operation_id: newOpId,
      reference_no
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Check Availability (for Deliveries / Transfers)
router.post('/:id/check-availability', requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    const op = db.prepare('SELECT * FROM operations WHERE id = ?').get(id);
    if (!op) {
      return res.status(404).json({ error: 'Operation not found.' });
    }

    if (op.status === 'done' || op.status === 'canceled') {
      return res.status(400).json({ error: `Cannot check availability on ${op.status} order.` });
    }

    const items = db.prepare('SELECT * FROM operation_items WHERE operation_id = ?').all(id);
    let allAvailable = true;
    const availabilityReport = [];

    for (const item of items) {
      const currentStock = getLocationStock(item.product_id, op.source_location_id);
      const isOk = currentStock >= item.demand_qty;
      if (!isOk) allAvailable = false;

      availabilityReport.push({
        product_id: item.product_id,
        demand: item.demand_qty,
        available: currentStock,
        status: isOk ? 'available' : 'insufficient'
      });
    }

    const newStatus = allAvailable ? 'ready' : 'waiting';
    db.prepare('UPDATE operations SET status = ? WHERE id = ?').run(newStatus, id);

    res.json({
      status: newStatus,
      allAvailable,
      report: availabilityReport
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Validate Operation -> THE ATOMIC STOCK ENGINE
// Updates stock_moves ledger and marks document as Done!
router.post('/:id/validate', requireAuth, (req, res) => {
  const { id } = req.params;
  const { item_done_quantities, item_quality_quantities } = req.body || {}; // Support custom done & quality quantities

  try {
    const op = db.prepare(`
      SELECT o.*, src.type as src_type, dst.type as dst_type 
      FROM operations o
      JOIN locations src ON o.source_location_id = src.id
      JOIN locations dst ON o.dest_location_id = dst.id
      WHERE o.id = ?
    `).get(id);

    if (!op) {
      return res.status(404).json({ error: 'Operation not found.' });
    }

    if (op.status === 'done') {
      return res.status(400).json({ error: 'This operation has already been validated and completed.' });
    }

    if (op.status === 'canceled') {
      return res.status(400).json({ error: 'Cannot validate a canceled operation.' });
    }

    const items = db.prepare('SELECT * FROM operation_items WHERE operation_id = ?').all(id);
    if (items.length === 0) {
      return res.status(400).json({ error: 'No items in this operation to validate.' });
    }

    // Atomic execution of stock movement
    const validateTransaction = db.transaction(() => {
      const updateItemStmt = db.prepare(`
        UPDATE operation_items 
        SET done_qty = ?, good_qty = ?, damaged_qty = ? 
        WHERE id = ?
      `);

      const insertMoveStmt = db.prepare(`
        INSERT INTO stock_moves (
          operation_id, product_id, source_location_id, dest_location_id, quantity, notes
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      const lossLoc = db.prepare("SELECT id FROM locations WHERE type = 'inventory_loss' LIMIT 1").get();

      for (const item of items) {
        let goodQty = item.demand_qty;
        let damagedQty = 0;

        if (item_quality_quantities && item_quality_quantities[item.id]) {
          goodQty = Math.max(0, Number(item_quality_quantities[item.id].good_qty || 0));
          damagedQty = Math.max(0, Number(item_quality_quantities[item.id].damaged_qty || 0));
        } else if (item_done_quantities && item_done_quantities[item.id] !== undefined) {
          goodQty = Math.max(0, Number(item_done_quantities[item.id]));
        }

        const finalDoneQty = goodQty; // Usable good stock accepted into destination

        // If source is internal (outgoing delivery or transfer), verify stock sufficiency
        if (op.src_type === 'internal') {
          const available = getLocationStock(item.product_id, op.source_location_id);
          const totalNeeded = goodQty + damagedQty;
          if (available < totalNeeded) {
            throw new Error(`Insufficient stock for product ID ${item.product_id}. Available: ${available}, Required: ${totalNeeded}`);
          }
        }

        // 1. Update line item done_qty, good_qty, damaged_qty
        updateItemStmt.run(finalDoneQty, goodQty, damagedQty, item.id);

        // 2. Create ledger stock move entry for Good Products (+count into destination)
        if (goodQty > 0) {
          insertMoveStmt.run(
            op.id,
            item.product_id,
            op.source_location_id,
            op.dest_location_id,
            goodQty,
            `Validated ${op.reference_no} (${op.type}) - Good Products Received (+${goodQty})`
          );
        }

        // 3. Create ledger stock move entry for Damaged Goods (-count routed to Scrap / Loss)
        if (damagedQty > 0 && lossLoc) {
          insertMoveStmt.run(
            op.id,
            item.product_id,
            op.source_location_id,
            lossLoc.id,
            damagedQty,
            `Damaged / Defective Stock (${op.reference_no}) (-${damagedQty})`
          );
        }
      }

      // 4. Mark operation as DONE
      db.prepare(`
        UPDATE operations 
        SET status = 'done', validated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(op.id);
    });

    validateTransaction();

    res.json({
      message: `Operation ${op.reference_no} validated successfully. Stock ledger updated.`,
      reference_no: op.reference_no,
      status: 'done'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 6. Direct Quick Stock Adjustment (Prompt Step 4: Fix mismatches between recorded stock and physical count)
router.post('/quick-adjustment', requireAuth, (req, res) => {
  const { product_id, location_id, counted_qty, reason } = req.body;

  if (!product_id || !location_id || counted_qty === undefined) {
    return res.status(400).json({ error: 'Product ID, Location ID, and Counted Quantity are required.' });
  }

  try {
    const counted = Number(counted_qty);
    if (isNaN(counted) || counted < 0) {
      return res.status(400).json({ error: 'Counted quantity must be a non-negative number.' });
    }

    const currentStock = getLocationStock(product_id, location_id);
    const delta = counted - currentStock;

    if (delta === 0) {
      return res.json({ message: 'Count matches current stock. No adjustment needed.', stock: counted });
    }

    // Find Virtual Inventory Loss location
    const lossLocation = db.prepare("SELECT id FROM locations WHERE type = 'inventory_loss' LIMIT 1").get();
    if (!lossLocation) {
      return res.status(500).json({ error: 'Virtual inventory loss location not found.' });
    }

    const reference_no = generateReferenceNo('adjustment');
    const userId = req.user.id;

    // If delta > 0: Stock increase (Loss Loc -> Physical Loc)
    // If delta < 0: Stock decrease (Physical Loc -> Loss Loc)
    const sourceLocId = delta > 0 ? lossLocation.id : location_id;
    const destLocId = delta > 0 ? location_id : lossLocation.id;
    const absQty = Math.abs(delta);

    const adjTransaction = db.transaction(() => {
      // 1. Create adjustment operation
      const opStmt = db.prepare(`
        INSERT INTO operations (
          reference_no, type, status, source_location_id, dest_location_id,
          partner_name, notes, created_by, validated_at
        ) VALUES (?, 'adjustment', 'done', ?, ?, 'Inventory Audit', ?, ?, CURRENT_TIMESTAMP)
      `);
      const opResult = opStmt.run(
        reference_no,
        sourceLocId,
        destLocId,
        reason || `Physical audit count: was ${currentStock}, counted ${counted} (Δ: ${delta})`,
        userId
      );
      const opId = opResult.lastInsertRowid;

      // 2. Insert item line
      db.prepare(`
        INSERT INTO operation_items (operation_id, product_id, demand_qty, done_qty)
        VALUES (?, ?, ?, ?)
      `).run(opId, product_id, absQty, absQty);

      // 3. Insert stock ledger move
      db.prepare(`
        INSERT INTO stock_moves (
          operation_id, product_id, source_location_id, dest_location_id, quantity, notes
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        opId,
        product_id,
        sourceLocId,
        destLocId,
        absQty,
        `Stock adjustment: ${delta > 0 ? '+' : ''}${delta} (${reason || 'Count Correction'})`
      );

      return { opId, reference_no };
    });

    const result = adjTransaction();

    res.json({
      message: `Stock adjusted successfully. Ledger move recorded as ${result.reference_no}`,
      reference_no: result.reference_no,
      previous_stock: currentStock,
      new_stock: counted,
      delta
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Cancel Operation
router.post('/:id/cancel', requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    const op = db.prepare('SELECT * FROM operations WHERE id = ?').get(id);
    if (!op) {
      return res.status(404).json({ error: 'Operation not found.' });
    }

    if (op.status === 'done') {
      return res.status(400).json({ error: 'Cannot cancel an operation that has already been validated and executed in the ledger.' });
    }

    db.prepare("UPDATE operations SET status = 'canceled' WHERE id = ?").run(id);

    res.json({ message: `Operation ${op.reference_no} marked as canceled.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
