// backend/routes/sales.js
import express from "express";
import db from "../db/turso.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// GET sales analytics/stats (must be before /:id patterns)
router.get("/stats", authenticateToken, asyncHandler(async (req, res) => {
  const result = await db.execute(
    `SELECT DATE(sale_date) as date, COUNT(*) as total_sales,
            SUM(total_amount) as revenue, AVG(total_amount) as avg_sale_value
     FROM sales GROUP BY DATE(sale_date)
     ORDER BY date DESC LIMIT 30`
  );
  res.json(result.rows);
}));

// CREATE new sale (and update product stock)
router.post("/", authenticateToken, asyncHandler(async (req, res) => {
  const { product_id, quantity_sold, sale_price, sale_date, customer_name, customer_email, payment_method, notes } = req.body;

  if (!product_id || !quantity_sold || !sale_price) {
    return res.status(400).json({ error: "Product ID, quantity, and price are required" });
  }

  // Use a transaction for consistency
  const tx = await db.transaction();
  try {
    // Check stock
    const productResult = await tx.execute({
      sql: "SELECT * FROM products WHERE id = ?",
      args: [product_id],
    });

    const product = productResult.rows[0];
    if (!product) {
      await tx.rollback();
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.stock < quantity_sold) {
      await tx.rollback();
      return res.status(400).json({ error: `Insufficient stock. Available: ${product.stock}` });
    }

    // Create sale
    const saleResult = await tx.execute({
      sql: `INSERT INTO sales (product_id, quantity_sold, sale_price, total_amount, sale_date, customer_name, customer_email, payment_method, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        product_id, quantity_sold, sale_price,
        quantity_sold * sale_price,
        sale_date || new Date().toISOString().split("T")[0],
        customer_name || null, customer_email || null,
        payment_method || null, notes || null,
        req.user.id
      ],
    });

    // Update stock
    await tx.execute({
      sql: "UPDATE products SET stock = stock - ?, updated_at = datetime('now') WHERE id = ?",
      args: [quantity_sold, product_id],
    });

    await tx.commit();
    res.status(201).json(saleResult.rows[0]);
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}));

// GET all sales with product details
router.get("/", authenticateToken, asyncHandler(async (req, res) => {
  const result = await db.execute(
    `SELECT s.*, p.name as product_name, p.category
     FROM sales s JOIN products p ON s.product_id = p.id
     ORDER BY s.created_at DESC`
  );
  res.json(result.rows);
}));

export default router;
