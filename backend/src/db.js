const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'stocksense.db');
const db = new Database(dbPath);

// Enable WAL mode and foreign keys for performance and integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    -- Users table with login_id for wireframe auth requirement
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login_id TEXT UNIQUE,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'Warehouse Staff',
      otp_code TEXT,
      otp_expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Warehouses
    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Locations (Hierarchical / Multi-type)
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('internal', 'vendor', 'customer', 'inventory_loss')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
    );

    -- Categories
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Products with per_unit_cost for wireframe table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category_id INTEGER,
      uom TEXT NOT NULL DEFAULT 'units',
      per_unit_cost REAL DEFAULT 0,
      min_stock_alert REAL DEFAULT 10,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- Operations with scheduled_date for Late/Scheduled calculation
    CREATE TABLE IF NOT EXISTS operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_no TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('receipt', 'delivery', 'internal', 'adjustment')),
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'waiting', 'ready', 'done', 'canceled')),
      source_location_id INTEGER NOT NULL,
      dest_location_id INTEGER NOT NULL,
      partner_name TEXT,
      scheduled_date DATE,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      validated_at DATETIME,
      FOREIGN KEY (source_location_id) REFERENCES locations(id),
      FOREIGN KEY (dest_location_id) REFERENCES locations(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Operation Line Items
    CREATE TABLE IF NOT EXISTS operation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      demand_qty REAL NOT NULL DEFAULT 0,
      done_qty REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Stock Moves (The Immutable Stock Ledger / Move History)
    CREATE TABLE IF NOT EXISTS stock_moves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_id INTEGER,
      product_id INTEGER NOT NULL,
      source_location_id INTEGER NOT NULL,
      dest_location_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      move_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE SET NULL,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (source_location_id) REFERENCES locations(id),
      FOREIGN KEY (dest_location_id) REFERENCES locations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_stock_moves_product ON stock_moves(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_moves_locations ON stock_moves(source_location_id, dest_location_id);
    CREATE INDEX IF NOT EXISTS idx_operations_type_status ON operations(type, status);
  `);

  // Safely ensure columns exist if DB already exists
  try { db.exec('ALTER TABLE users ADD COLUMN login_id TEXT UNIQUE'); } catch (e) {}
  try { db.exec('ALTER TABLE products ADD COLUMN per_unit_cost REAL DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE operations ADD COLUMN scheduled_date DATE'); } catch (e) {}
  try { db.exec('ALTER TABLE operation_items ADD COLUMN good_qty REAL DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE operation_items ADD COLUMN damaged_qty REAL DEFAULT 0'); } catch (e) {}

  // Populate good_qty for done operations if previously 0
  try {
    db.exec(`UPDATE operation_items SET good_qty = done_qty WHERE done_qty > 0 AND (good_qty = 0 OR good_qty IS NULL)`);
    // Sample quality distribution for demonstration if no damaged_qty exists
    const hasDamaged = db.prepare('SELECT COUNT(*) as count FROM operation_items WHERE damaged_qty > 0').get().count;
    if (hasDamaged === 0) {
      db.exec(`UPDATE operation_items SET good_qty = 48, damaged_qty = 2 WHERE operation_id IN (SELECT id FROM operations WHERE reference_no = 'WH/IN/0005')`);
      db.exec(`UPDATE operation_items SET good_qty = 45, damaged_qty = 5 WHERE operation_id IN (SELECT id FROM operations WHERE reference_no = 'WH/IN/0006')`);
    }
  } catch (e) {}

  seedWireframeData();
}

function seedWireframeData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('🌱 Seeding Wireframe dataset (Desk, Table, Shelves, Operations)...');

    // 1. Warehouses
    const insertWarehouse = db.prepare('INSERT INTO warehouses (name, code, address) VALUES (?, ?, ?)');
    const wh1 = insertWarehouse.run('Main Warehouse', 'WH1', 'Central Logistics Park, Sector 4');
    const wh2 = insertWarehouse.run('Secondary Warehouse', 'WH2', 'Industrial Hub Zone B');

    // 2. Locations matching wireframe: Stock/Shelf1, WH/Output, Vendor, Customer
    const insertLoc = db.prepare('INSERT INTO locations (warehouse_id, name, code, type) VALUES (?, ?, ?, ?)');
    const locVendor = insertLoc.run(null, 'Vendor', 'VENDOR', 'vendor');
    const locCustomer = insertLoc.run(null, 'Customer', 'CUSTOMER', 'customer');
    const locLoss = insertLoc.run(null, 'Inventory Loss / Scrap', 'VIRTUAL/INVENTORY-LOSS', 'inventory_loss');
    
    const locShelf1 = insertLoc.run(wh1.lastInsertRowid, 'Stock/Shelf1', 'Stock/Shelf1', 'internal');
    const locOutput = insertLoc.run(wh1.lastInsertRowid, 'WH/Output', 'WH/Output', 'internal');
    const locRackB = insertLoc.run(wh1.lastInsertRowid, 'WH1 / Rack B', 'WH1/RACK-B', 'internal');

    // 3. Categories
    const insertCat = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
    const catFurn = insertCat.run('Furniture', 'Office and home furniture items');
    const catRaw = insertCat.run('Raw Materials', 'Wood, steel, hardware');

    // 4. Products matching wireframe EXACTLY:
    // Desk (3000 Rs, On hand: 50, Free to use: 45)
    // Table (3000 Rs, On hand: 50, Free to use: 50)
    const insertProd = db.prepare(`
      INSERT INTO products (sku, name, category_id, uom, per_unit_cost, min_stock_alert, description) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const prodDesk = insertProd.run('DSK-001', 'Desk', catFurn.lastInsertRowid, 'units', 3000, 10, 'Executive wooden work desk');
    const prodTable = insertProd.run('TBL-002', 'Table', catFurn.lastInsertRowid, 'units', 3000, 10, 'Conference and dining table');
    const prodSteel = insertProd.run('STL-003', 'Steel Rods', catRaw.lastInsertRowid, 'kg', 120, 25, 'High tensile steel rods');

    // 5. Seed Opening Stock in Stock/Shelf1 (Desk: 50, Table: 50)
    const insertMove = db.prepare(`
      INSERT INTO stock_moves (operation_id, product_id, source_location_id, dest_location_id, quantity, move_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    // Wireframe Move History exact row: Desk | Vendor | Stock/Shelf1 | 100 | Done
    insertMove.run(null, prodDesk.lastInsertRowid, locVendor.lastInsertRowid, locShelf1.lastInsertRowid, 100, '2026-09-20 10:00:00', 'Initial stock intake');
    // Wireframe scenario: Desk, Stock/Shelf1, 100, 90 (-10 units adjustment)
    insertMove.run(null, prodDesk.lastInsertRowid, locShelf1.lastInsertRowid, locLoss.lastInsertRowid, 10, '2026-09-21 11:00:00', 'Physical count audit: 100 counted to 90');
    // Outbound delivery of 40 units -> brings On Hand to exactly 50 (Free to use 45)
    insertMove.run(null, prodDesk.lastInsertRowid, locShelf1.lastInsertRowid, locCustomer.lastInsertRowid, 40, '2026-09-22 14:00:00', 'Customer order shipment');
    // Table opening intake 50 units -> On Hand 50 (Free to use 50)
    insertMove.run(null, prodTable.lastInsertRowid, locVendor.lastInsertRowid, locShelf1.lastInsertRowid, 50, '2026-09-20 10:00:00', 'Initial stock intake');

    // 6. Seed Users with Wireframe login_id
    const salt = bcrypt.genSaltSync(10);
    const passHash = bcrypt.hashSync('Admin@123', salt); // Meets validation: >8 chars, lowercase, uppercase, special
    const staffHash = bcrypt.hashSync('Staff@123', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (login_id, name, email, password_hash, role) 
      VALUES (?, ?, ?, ?, ?)
    `);
    insertUser.run('admin_user', 'Alex Morgan', 'admin@stocksense.com', passHash, 'Inventory Manager');
    insertUser.run('staff_user', 'Sam Miller', 'staff@stocksense.com', staffHash, 'Warehouse Staff');

    // 7. Seed Operations matching wireframe KPIs:
    // Receipts: 4 to receive (ready/waiting), 1 Late (scheduled_date < today), 6 total operations
    // Deliveries: 4 to Deliver, 1 Late, 2 waiting, 6 total operations
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const insertOp = db.prepare(`
      INSERT INTO operations (reference_no, type, status, source_location_id, dest_location_id, partner_name, scheduled_date, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    const insertOpItem = db.prepare(`
      INSERT INTO operation_items (operation_id, product_id, demand_qty, done_qty) VALUES (?, ?, ?, ?)
    `);

    // Receipt 1 (Late)
    const r1 = insertOp.run('WH/IN/0001', 'receipt', 'ready', locVendor.lastInsertRowid, locShelf1.lastInsertRowid, 'Global Wood Importers', yesterday, 'Urgent oak timber');
    insertOpItem.run(r1.lastInsertRowid, prodDesk.lastInsertRowid, 10, 0);

    // Receipt 2 to 4 (To receive / Scheduled)
    const r2 = insertOp.run('WH/IN/0002', 'receipt', 'ready', locVendor.lastInsertRowid, locShelf1.lastInsertRowid, 'Modern Hardware Corp', tomorrow, 'Drawer handles');
    insertOpItem.run(r2.lastInsertRowid, prodTable.lastInsertRowid, 15, 0);

    const r3 = insertOp.run('WH/IN/0003', 'receipt', 'ready', locVendor.lastInsertRowid, locShelf1.lastInsertRowid, 'Timber Direct', tomorrow, 'Pine wood blocks');
    insertOpItem.run(r3.lastInsertRowid, prodDesk.lastInsertRowid, 20, 0);

    const r4 = insertOp.run('WH/IN/0004', 'receipt', 'waiting', locVendor.lastInsertRowid, locShelf1.lastInsertRowid, 'Fastener Supplies', tomorrow, 'Screws & brackets');
    insertOpItem.run(r4.lastInsertRowid, prodTable.lastInsertRowid, 50, 0);

    // Receipt 5 & 6 (Done)
    const r5 = insertOp.run('WH/IN/0005', 'receipt', 'done', locVendor.lastInsertRowid, locShelf1.lastInsertRowid, 'Apex Suppliers', '2026-09-20', 'Desk batch 1');
    insertOpItem.run(r5.lastInsertRowid, prodDesk.lastInsertRowid, 50, 50);

    const r6 = insertOp.run('WH/IN/0006', 'receipt', 'done', locVendor.lastInsertRowid, locShelf1.lastInsertRowid, 'Apex Suppliers', '2026-09-20', 'Table batch 1');
    insertOpItem.run(r6.lastInsertRowid, prodTable.lastInsertRowid, 50, 50);

    // Deliveries:
    // Delivery 1 (Late: scheduled yesterday)
    // Reserves 5 units of Desk -> Free to Use becomes 50 - 5 = 45!
    const d1 = insertOp.run('WH/OUT/0001', 'delivery', 'ready', locShelf1.lastInsertRowid, locCustomer.lastInsertRowid, 'Acme Offices Ltd', yesterday, '5 Desks for client site');
    insertOpItem.run(d1.lastInsertRowid, prodDesk.lastInsertRowid, 5, 0);

    // Delivery 2 (Waiting for stock)
    const d2 = insertOp.run('WH/OUT/0002', 'delivery', 'waiting', locShelf1.lastInsertRowid, locCustomer.lastInsertRowid, 'Zenith Tech Labs', tomorrow, 'Custom high tables');
    insertOpItem.run(d2.lastInsertRowid, prodTable.lastInsertRowid, 80, 0); // Demand 80 but on hand 50 -> Waiting!

    // Delivery 3 (Waiting for stock)
    const d3 = insertOp.run('WH/OUT/0003', 'delivery', 'waiting', locShelf1.lastInsertRowid, locCustomer.lastInsertRowid, 'Orion Coworking', tomorrow, 'Waiting steel reinforcement');
    insertOpItem.run(d3.lastInsertRowid, prodSteel.lastInsertRowid, 100, 0);

    // Delivery 4 (Ready to deliver)
    const d4 = insertOp.run('WH/OUT/0004', 'delivery', 'ready', locShelf1.lastInsertRowid, locCustomer.lastInsertRowid, 'Metro School Board', tomorrow, 'Hardware rods delivery');
    insertOpItem.run(d4.lastInsertRowid, prodSteel.lastInsertRowid, 10, 0);

    // Delivery 5 & 6 (Done / Draft)
    const d5 = insertOp.run('WH/OUT/0005', 'delivery', 'done', locShelf1.lastInsertRowid, locCustomer.lastInsertRowid, 'Alpha Corp', '2026-09-22', 'Shipped order');
    insertOpItem.run(d5.lastInsertRowid, prodDesk.lastInsertRowid, 10, 10);

    const d6 = insertOp.run('WH/OUT/0006', 'delivery', 'draft', locShelf1.lastInsertRowid, locCustomer.lastInsertRowid, 'Beta Studio', tomorrow, 'Draft client quote');
    insertOpItem.run(d6.lastInsertRowid, prodSteel.lastInsertRowid, 5, 0);

    // Draft move matching wireframe move history example:
    // Table | Stock/Shelf1 | WH/Output | 50 | Draft
    const insertDraftOp = insertOp.run('WH/INT/0001', 'internal', 'draft', locShelf1.lastInsertRowid, locOutput.lastInsertRowid, 'Staging Output Floor', tomorrow, 'Transfer to output staging');
    insertOpItem.run(insertDraftOp.lastInsertRowid, prodTable.lastInsertRowid, 50, 0);

    console.log('✅ Wireframe dataset seeded successfully.');
  }
}

initDatabase();

module.exports = db;
