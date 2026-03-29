// backend/db/init.js
import db from "./turso.js";
import bcrypt from "bcrypt";

async function createTables() {
  try {
    console.log("Starting database initialization...");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('owner', 'staff')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    console.log("Users table ready");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sku TEXT UNIQUE,
        category TEXT,
        description TEXT,
        price REAL NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        reorder_level INTEGER DEFAULT 10,
        supplier TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    console.log("Products table ready");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        quantity_sold INTEGER NOT NULL,
        sale_price REAL NOT NULL,
        total_amount REAL NOT NULL,
        sale_date TEXT NOT NULL,
        customer_name TEXT,
        customer_email TEXT,
        payment_method TEXT,
        notes TEXT,
        created_by INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log("Sales table ready");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS upload_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        file_type TEXT,
        rows_processed INTEGER DEFAULT 0,
        rows_successful INTEGER DEFAULT 0,
        rows_failed INTEGER DEFAULT 0,
        error_log TEXT,
        uploaded_by INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log("Upload history table ready");

    // Create indexes
    await db.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_upload_history_uploaded_by ON upload_history(uploaded_by)");

    console.log("All tables and indexes created successfully");

    // Insert default admin user if users table is empty
    const result = await db.execute("SELECT COUNT(*) as count FROM users");
    if (result.rows[0].count === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await db.execute({
        sql: "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
        args: ["admin", "admin@example.com", hashedPassword, "owner"],
      });
      console.log("Default admin user created (admin@example.com / admin123)");
    }

    console.log("Database initialization complete");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

createTables()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  });
