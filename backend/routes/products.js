// backend/routes/products.js
import express from "express";
import db from "../db/knex.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// GET all products
router.get("/", authenticateToken, asyncHandler(async (req, res) => {
  const products = await db("products")
    .select("*")
    .orderBy("created_at", "desc");
  
  res.json(products);
}));

// GET single product by ID
router.get("/:id", authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const product = await db("products")
    .where({ id })
    .first();
  
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  
  res.json(product);
}));

// CREATE new product
router.post("/", authenticateToken, asyncHandler(async (req, res) => {
  const { name, sku, category, description, price, stock, reorder_level, supplier } = req.body;
  
  // Validation
  if (!name || !price) {
    return res.status(400).json({ error: "Name and price are required" });
  }
  
  const [newProduct] = await db("products")
    .insert({
      name,
      sku,
      category,
      description,
      price,
      stock: stock || 0,
      reorder_level: reorder_level || 10,
      supplier
    })
    .returning("*");
  
  res.status(201).json(newProduct);
}));

// UPDATE product
router.put("/:id", authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Remove fields that shouldn't be updated directly
  delete updates.id;
  delete updates.created_at;
  
  const [updatedProduct] = await db("products")
    .where({ id })
    .update({
      ...updates,
      updated_at: db.fn.now()
    })
    .returning("*");
  
  if (!updatedProduct) {
    return res.status(404).json({ error: "Product not found" });
  }
  
  res.json(updatedProduct);
}));

// DELETE product
router.delete("/:id", authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const deleted = await db("products")
    .where({ id })
    .del();
  
  if (!deleted) {
    return res.status(404).json({ error: "Product not found" });
  }
  
  res.json({ message: "Product deleted successfully" });
}));

// GET low stock products
router.get("/alerts/low-stock", authenticateToken, asyncHandler(async (req, res) => {
  const lowStockProducts = await db("products")
    .whereRaw("stock <= reorder_level")
    .select("*")
    .orderBy("stock", "asc");
  
  res.json(lowStockProducts);
}));

// GET products by category with stats
router.get("/stats/by-category", authenticateToken, asyncHandler(async (req, res) => {
  const stats = await db("products")
    .select("category")
    .count("* as total_products")
    .sum("stock as total_stock")
    .avg("price as avg_price")
    .groupBy("category")
    .orderBy("total_products", "desc");
  
  res.json(stats);
}));

export default router;