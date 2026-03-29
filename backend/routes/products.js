// backend/routes/products.js
import express from "express";
import db from "../db/turso.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// GET low stock products (must be before /:id)
router.get("/alerts/low-stock", authenticateToken, asyncHandler(async (req, res) => {
  const result = await db.execute(
    "SELECT * FROM products WHERE stock <= reorder_level ORDER BY stock ASC"
  );
  res.json(result.rows);
}));

// GET products by category with stats (must be before /:id)
router.get("/stats/by-category", authenticateToken, asyncHandler(async (req, res) => {
  const result = await db.execute(
    `SELECT category, COUNT(*) as total_products, SUM(stock) as total_stock, AVG(price) as avg_price
     FROM products GROUP BY category ORDER BY total_products DESC`
  );
  res.json(result.rows);
}));

// GET all products
router.get("/", authenticateToken, asyncHandler(async (req, res) => {
  const result = await db.execute(
    "SELECT * FROM products ORDER BY created_at DESC"
  );
  res.json(result.rows);
}));

// GET single product by ID
router.get("/:id", authenticateToken, asyncHandler(async (req, res) => {
  const result = await db.execute({
    sql: "SELECT * FROM products WHERE id = ?",
    args: [req.params.id],
  });

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Product not found" });
  }

  res.json(result.rows[0]);
}));

// CREATE new product
router.post("/", authenticateToken, asyncHandler(async (req, res) => {
  const { name, sku, category, description, price, stock, reorder_level, supplier } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: "Name and price are required" });
  }

  const result = await db.execute({
    sql: `INSERT INTO products (name, sku, category, description, price, stock, reorder_level, supplier)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    args: [name, sku || null, category || null, description || null, price, stock || 0, reorder_level || 10, supplier || null],
  });

  res.status(201).json(result.rows[0]);
}));

// UPDATE product
router.put("/:id", authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, sku, category, description, price, stock, reorder_level, supplier } = req.body;

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
            updated_at = datetime('now')
          WHERE id = ? RETURNING *`,
    args: [name, sku, category, description, price, stock, reorder_level, supplier, id],
  });

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Product not found" });
  }

  res.json(result.rows[0]);
}));

// DELETE product
router.delete("/:id", authenticateToken, asyncHandler(async (req, res) => {
  const result = await db.execute({
    sql: "DELETE FROM products WHERE id = ? RETURNING id",
    args: [req.params.id],
  });

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Product not found" });
  }

  res.json({ message: "Product deleted successfully" });
}));

export default router;
