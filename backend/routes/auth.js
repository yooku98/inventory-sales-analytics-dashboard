// backend/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import db from "../db/turso.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// REGISTER new user
router.post("/register", [
  body("username").trim().isLength({ min: 3 }).escape(),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  // Check if user exists
  const existing = await db.execute({
    sql: "SELECT id, email, username FROM users WHERE email = ? OR username = ?",
    args: [email, username],
  });

  if (existing.rows.length > 0) {
    const match = existing.rows[0];
    return res.status(400).json({
      error: match.email === email
        ? "Email already registered"
        : "Username already taken"
    });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const result = await db.execute({
    sql: "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?) RETURNING id, username, email, role",
    args: [username, email, hashedPassword, "staff"],
  });

  const newUser = result.rows[0];

  const token = jwt.sign(
    { id: newUser.id, username: newUser.username, role: newUser.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  res.status(201).json({ token, user: newUser });
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

  const result = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });

  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role }
  });
}));

// GET current user
router.get("/me", authenticateToken, asyncHandler(async (req, res) => {
  const result = await db.execute({
    sql: "SELECT id, username, email, role FROM users WHERE id = ?",
    args: [req.user.id],
  });

  const user = result.rows[0];
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json(user);
}));

export default router;
