# Inventory Management System (IMS)

A modular Inventory Management System that digitizes and streamlines all stock-related operations within a business. IMS replaces manual registers, Excel sheets, and scattered tracking methods with a centralized, real-time, easy-to-use application.

## Overview

Businesses often rely on manual registers, spreadsheets, and disconnected tools to track inventory — leading to errors, delays, and no single source of truth. IMS solves this by providing one connected system where every stock movement (incoming, outgoing, internal, or adjusted) is tracked in real time and logged permanently.

## Target Users

- **Inventory Managers** – Manage incoming and outgoing stock, oversee dashboards, and monitor overall inventory health.
- **Warehouse Staff** – Perform day-to-day operations such as transfers, picking, shelving, and stock counting.

## Key Features

### Authentication
- Sign up / log in
- OTP-based password reset
- Redirect to Inventory Dashboard on login

### Dashboard
The landing page provides a real-time snapshot of inventory operations.

**KPIs displayed:**
- Total Products in Stock
- Low Stock / Out of Stock Items
- Pending Receipts
- Pending Deliveries
- Internal Transfers Scheduled

**Dynamic filters:**
- By document type (Receipts / Delivery / Internal / Adjustments)
- By status (Draft, Waiting, Ready, Done, Canceled)
- By warehouse or location
- By product category

### Navigation
1. **Products** – Create/update products, view stock availability per location, manage categories and reordering rules.
2. **Operations**
   - Receipts (Incoming Stock)
   - Delivery Orders (Outgoing Stock)
   - Inventory Adjustment
   - Move History
   - Dashboard
3. **Settings** – Warehouse configuration
4. **Profile Menu** – My Profile, Logout

## Core Modules

### 1. Product Management
Create products with:
- Name
- SKU / Code
- Category
- Unit of Measure
- Initial stock (optional)

### 2. Receipts (Incoming Goods)
Used when items arrive from vendors.

**Process:**
1. Create a new receipt
2. Add supplier & products
3. Input quantities received
4. Validate → stock increases automatically

**Example:** Receive 50 units of "Steel Rods" → stock +50

### 3. Delivery Orders (Outgoing Goods)
Used when stock leaves the warehouse for customer shipment.

**Process:**
1. Pick items
2. Pack items
3. Validate → stock decreases automatically

**Example:** Sales order for 10 chairs → Delivery order reduces chairs by 10

### 4. Internal Transfers
Move stock between locations within the company. Total stock is unchanged, but location is updated. Every movement is logged in the ledger.

**Examples:**
- Main Warehouse → Production Floor
- Rack A → Rack B
- Warehouse 1 → Warehouse 2

### 5. Stock Adjustments
Fix mismatches between recorded stock and physical count.

**Steps:**
1. Select product/location
2. Enter counted quantity
3. System auto-updates and logs the adjustment

## Additional Features
- Alerts for low stock
- Multi-warehouse support
- SKU search & smart filters

## Sample Inventory Flow

A simplified walkthrough of how stock moves through the system:

| Step | Action | Stock Impact |
|------|--------|--------------|
| 1 | Receive 100 kg Steel from vendor | +100 |
| 2 | Internal transfer: Main Store → Production Rack | No change (location updated only) |
| 3 | Deliver 20 finished steel frames | –20 |
| 4 | Adjust for 3 kg damaged steel | –3 |

Every step above is recorded in the **Stock Ledger**, giving full traceability of all inventory movements.

## Status

📌 *Project in planning / design phase — mockups and requirements documented, development in progress.*

## Contributing

Contribution guidelines will be added as development progresses.

## License

License to be determined.
