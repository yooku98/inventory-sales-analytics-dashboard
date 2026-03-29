// backend/db/turso.js
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Test database connection
const testConnection = async () => {
  try {
    await db.execute("SELECT 1");
    console.log("Database connected successfully via Turso/LibSQL");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
  }
};

testConnection();

export default db;
