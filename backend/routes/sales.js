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

  const tx = await db.transaction();
  try {
    const productResult = await tx.execute({
      sql: "SELECT * FROM products WHERE id = ? AND archived_at IS NULL",
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

    const saleResult = await tx.execute({
      sql: `INSERT INTO sales
              (product_id, product_name, quantity_sold, sale_price, total_amount,
               sale_date, customer_name, customer_email, payment_method, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        product_id,
        product.name,
        quantity_sold,
        sale_price,
        quantity_sold * sale_price,
        sale_date || new Date().toISOString().split("T")[0],
        customer_name || null,
        customer_email || null,
        payment_method || null,
        notes || null,
        req.user.id,
      ],
    });

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

// GET all sales (paginated + filtered)
router.get("/", authenticateToken, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const search = req.query.search?.trim() || "";
  const payment = req.query.payment?.trim() || "";
  const product = req.query.product?.trim() || "";
  const dateFrom = req.query.dateFrom?.trim() || "";
  const dateTo = req.query.dateTo?.trim() || "";

  const conditions = [];
  const args = [];

  if (search) {
    conditions.push("(COALESCE(s.product_name, p.name) LIKE ? OR s.customer_name LIKE ?)");
    const s = `%${search}%`;
    args.push(s, s);
  }
  if (payment) {
    conditions.push("s.payment_method = ?");
    args.push(payment);
  }
  if (product) {
    conditions.push("COALESCE(s.product_name, p.name) = ?");
    args.push(product);
  }
  if (dateFrom) {
    conditions.push("DATE(s.sale_date) >= ?");
    args.push(dateFrom);
  }
  if (dateTo) {
    conditions.push("DATE(s.sale_date) <= ?");
    args.push(dateTo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as total, SUM(s.total_amount) as total_revenue
          FROM sales s LEFT JOIN products p ON s.product_id = p.id ${where}`,
    args: [...args],
  });
  const total = Number(countResult.rows[0].total);
  const totalRevenue = Number(countResult.rows[0].total_revenue) || 0;

  const result = await db.execute({
    sql: `SELECT s.*, COALESCE(s.product_name, p.name) as product_name, p.category
          FROM sales s LEFT JOIN products p ON s.product_id = p.id
          ${where} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  res.json({
    data: result.rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    total_revenue: totalRevenue,
  });
}));

export default router;
