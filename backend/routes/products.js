// backend/routes/products.js
import express from "express";
import db from "../db/turso.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = express.Router();

// GET low stock products (must be before /:id)
router.get("/alerts/low-stock", authenticateToken, asyncHandler(async (req, res) => {
  const result = await db.execute(
    "SELECT * FROM products WHERE stock <= reorder_level AND archived_at IS NULL ORDER BY stock ASC"
  );
  res.json(result.rows);
}));

// GET expiring / expired products (must be before /:id)
router.get("/alerts/expiring", authenticateToken, asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 90;
  const result = await db.execute({
    sql: `SELECT * FROM products
          WHERE expiry_date IS NOT NULL
            AND archived_at IS NULL
            AND date(expiry_date) <= date('now', '+' || ? || ' days')
          ORDER BY date(expiry_date) ASC`,
    args: [days],
  });
  res.json(result.rows);
}));

// GET products by category with stats (must be before /:id)
router.get("/stats/by-category", authenticateToken, asyncHandler(async (req, res) => {
  const result = await db.execute(
    `SELECT category, COUNT(*) as total_products, SUM(stock) as total_stock,
            AVG(price) as avg_price, SUM(price * stock) as total_value
     FROM products WHERE archived_at IS NULL
     GROUP BY category ORDER BY total_products DESC`
  );
  res.json(result.rows);
}));

// GET all products (paginated + filtered)
router.get("/", authenticateToken, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const search = req.query.search?.trim() || "";
  const category = req.query.category?.trim() || "";

  const conditions = ["archived_at IS NULL"];
  const args = [];

  if (search) {
    conditions.push("(name LIKE ? OR sku LIKE ? OR batch_number LIKE ? OR supplier LIKE ?)");
    const s = `%${search}%`;
    args.push(s, s, s, s);
  }
  if (category) {
    conditions.push("category = ?");
    args.push(category);
  }

  const where = conditions.join(" AND ");

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as total FROM products WHERE ${where}`,
    args: [...args],
  });
  const total = Number(countResult.rows[0].total);

  const result = await db.execute({
    sql: `SELECT * FROM products WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  res.json({
    data: result.rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}));

// GET single product by ID
router.get("/:id", authenticateToken, asyncHandler(async (req, res) => {
  const result = await db.execute({
    sql: "SELECT * FROM products WHERE id = ? AND archived_at IS NULL",
    args: [req.params.id],
  });

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Product not found" });
  }

  res.json(result.rows[0]);
}));

// CREATE new product
router.post("/", authenticateToken, asyncHandler(async (req, res) => {
  const {
    name, sku, category, description, price, stock, reorder_level, supplier,
    expiry_date, batch_number, lot_number, is_controlled,
  } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: "Name and price are required" });
  }

  const result = await db.execute({
    sql: `INSERT INTO products
            (name, sku, category, description, price, stock, reorder_level, supplier,
             expiry_date, batch_number, lot_number, is_controlled)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    args: [
      name,
      sku || null,
      category || null,
      description || null,
      price,
      stock || 0,
      reorder_level || 10,
      supplier || null,
      expiry_date || null,
      batch_number || null,
      lot_number || null,
      is_controlled ? 1 : 0,
    ],
  });

  res.status(201).json(result.rows[0]);
}));

// UPDATE product
router.put("/:id", authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name, sku, category, description, price, stock, reorder_level, supplier,
    expiry_date, batch_number, lot_number, is_controlled,
  } = req.body;

  const result = await db.execute({
    sql: `UPDATE products SET
            name = COALESCE(?, name),
            sku = COALESCE(?, sku),
            category = COALESCE(?, category),
            description = COALESCE(?, description),
            price = COALESCE(?, price),
            stock = COALESCE(?, stock),
            reorder_level = COALESCE(?, reorder_level),
            supplier = COALESCE(?, supplier),
            expiry_date = COALESCE(?, expiry_date),
            batch_number = COALESCE(?, batch_number),
            lot_number = COALESCE(?, lot_number),
            is_controlled = COALESCE(?, is_controlled),
            updated_at = datetime('now')
          WHERE id = ? AND archived_at IS NULL RETURNING *`,
    args: [
      name, sku, category, description, price, stock, reorder_level, supplier,
      expiry_date, batch_number, lot_number,
      is_controlled === undefined ? null : (is_controlled ? 1 : 0),
      id,
    ],
  });

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Product not found" });
  }

  res.json(result.rows[0]);
}));

// ARCHIVE (soft-delete) multiple products — owner only (must be before /:id)
router.post("/bulk-delete", authenticateToken, requireRole("owner"), asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "ids array is required" });
  }
  const numericIds = ids.map((n) => parseInt(n)).filter((n) => !isNaN(n));
  if (numericIds.length === 0) {
    return res.status(400).json({ error: "No valid ids provided" });
  }
  const placeholders = numericIds.map(() => "?").join(",");
  const result = await db.execute({
    sql: `UPDATE products SET archived_at = datetime('now') WHERE id IN (${placeholders}) AND archived_at IS NULL`,
    args: numericIds,
  });
  res.json({ archived: result.rowsAffected || numericIds.length });
}));

// ARCHIVE (soft-delete) single product — owner only
router.delete("/:id", authenticateToken, requireRole("owner"), asyncHandler(async (req, res) => {
  const result = await db.execute({
    sql: "UPDATE products SET archived_at = datetime('now') WHERE id = ? AND archived_at IS NULL RETURNING id",
    args: [req.params.id],
  });

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Product not found" });
  }

  res.json({ message: "Product archived successfully" });
}));

export default router;
