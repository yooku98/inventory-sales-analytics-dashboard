// backend/routes/sales.js
import express from "express";
import db from "../db/knex.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// CREATE new sale (and update product stock)
router.post("/", authenticateToken, asyncHandler(async (req, res) => {
  const { product_id, quantity_sold, sale_price, sale_date, customer_name, customer_email, payment_method, notes } = req.body;

  // Validation
  if (!product_id || !quantity_sold || !sale_price) {
    return res.status(400).json({ error: "Product ID, quantity, and price are required" });
  }

  // Use transaction to ensure data consistency
  const result = await db.transaction(async (trx) => {
    // Check if product has enough stock
    const product = await trx("products")
      .where({ id: product_id })
      .first();

    if (!product) {
      throw new Error("Product not found");
    }

    if (product.stock < quantity_sold) {
      throw new Error(`Insufficient stock. Available: ${product.stock}`);
    }

    // Create sale record
    const [sale] = await trx("sales")
      .insert({
        product_id,
        quantity_sold,
        sale_price,
        total_amount: quantity_sold * sale_price,
        sale_date: sale_date || db.fn.now(),
        customer_name,
        customer_email,
        payment_method,
        notes,
        created_by: req.user.id
      })
      .returning("*");

    // Update product stock
    await trx("products")
      .where({ id: product_id })
      .decrement("stock", quantity_sold)
      .update({ updated_at: db.fn.now() });

    return sale;
  });

  res.status(201).json(result);
}));

// GET all sales with product details
router.get("/", authenticateToken, asyncHandler(async (req, res) => {
  const sales = await db("sales")
    .join("products", "sales.product_id", "products.id")
    .select(
      "sales.*",
      "products.name as product_name",
      "products.category"
    )
    .orderBy("sales.created_at", "desc");

  res.json(sales);
}));

// GET sales analytics/stats
router.get("/stats", authenticateToken, asyncHandler(async (req, res) => {
  const stats = await db("sales")
    .select(
      db.raw("DATE(sale_date) as date"),
      db.raw("COUNT(*) as total_sales"),
      db.raw("SUM(total_amount) as revenue"),
      db.raw("AVG(total_amount) as avg_sale_value")
    )
    .groupBy(db.raw("DATE(sale_date)"))
    .orderBy("date", "desc")
    .limit(30); // Last 30 days

  res.json(stats);
}));

export default router;