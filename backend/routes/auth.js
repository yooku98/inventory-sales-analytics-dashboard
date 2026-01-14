// backend/routes/auth.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import db from "../db/knex.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { authenticateToken } from "../middleware/auth.js";

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