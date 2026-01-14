// Example: backend/routes/products.js
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

// ============================================
// Example: backend/routes/auth.js
// ============================================

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import db from "../db/knex.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = express.Router();

// REGISTER new user
router.post("/register", [
  body("username").trim().isLength({ min: 3 }).escape(),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 })
], asyncHandler(async (req, res) => {
  // Validation check
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  // Check if user exists
  const existingUser = await db("users")
    .where({ email })
    .orWhere({ username })
    .first();

  if (existingUser) {
    return res.status(400).json({ 
      error: existingUser.email === email 
        ? "Email already registered" 
        : "Username already taken" 
    });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Insert user
  const [newUser] = await db("users")
    .insert({
      username,
      email,
      password: hashedPassword,
      role: "staff" // Default role
    })
    .returning(["id", "username", "email", "role"]);

  // Generate JWT token
  const token = jwt.sign(
    { 
      id: newUser.id, 
      username: newUser.username, 
      role: newUser.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  res.status(201).json({ 
    token, 
    user: newUser 
  });
}));

// LOGIN
router.post("/login", [
  body("email").isEmail().normalizeEmail(),
  body("password").exists()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  // Get user
  const user = await db("users")
    .where({ email })
    .first();

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Check password
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Generate token
  const token = jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
}));

// GET current user
router.get("/me", authenticateToken, asyncHandler(async (req, res) => {
  const user = await db("users")
    .where({ id: req.user.id })
    .select("id", "username", "email", "role")
    .first();

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json(user);
}));

export default router;

// ============================================
// Example: backend/routes/sales.js (if you need it)
// ============================================

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


