// backend/db/init.js
import db from "./knex.js";

async function createTables() {
  try {
    console.log('🔄 Starting database initialization...');

    // Users Table
    const usersExists = await db.schema.hasTable("users");
    if (!usersExists) {
      console.log('📝 Creating users table...');
      await db.schema.createTable("users", (table) => {
        table.increments("id").primary();
        table.string("username", 255).notNullable().unique();
        table.string("email", 255).notNullable().unique();
        table.string("password", 255).notNullable(); // Will store hashed password
        table.enum("role", ["owner", "staff"]).defaultTo("staff");
        table.timestamps(true, true); // created_at, updated_at
        
        // Indexes for better query performance
        table.index("email");
        table.index("username");
      });
      console.log('✅ Users table created');
    } else {
      console.log('⏭️  Users table already exists');
    }

    // Products Table
    const productsExists = await db.schema.hasTable("products");
    if (!productsExists) {
      console.log('📝 Creating products table...');
      await db.schema.createTable("products", (table) => {
        table.increments("id").primary();
        table.string("name", 255).notNullable();
        table.string("sku", 100).unique(); // Stock Keeping Unit
        table.string("category", 100);
        table.text("description");
        table.decimal("price", 10, 2).notNullable().defaultTo(0);
        table.integer("stock").notNullable().defaultTo(0);
        table.integer("reorder_level").defaultTo(10); // Low stock threshold
        table.string("supplier", 255);
        table.timestamps(true, true);
        
        // Indexes
        table.index("category");
        table.index("stock");
        table.index("sku");
      });
      console.log('✅ Products table created');
    } else {
      console.log('⏭️  Products table already exists');
    }

    // Sales Table
    const salesExists = await db.schema.hasTable("sales");
    if (!salesExists) {
      console.log('📝 Creating sales table...');
      await db.schema.createTable("sales", (table) => {
        table.increments("id").primary();
        table.integer("product_id").unsigned().notNullable();
        table.integer("quantity_sold").notNullable();
        table.decimal("sale_price", 10, 2).notNullable();
        table.decimal("total_amount", 10, 2).notNullable(); // quantity * price
        table.date("sale_date").notNullable();
        table.string("customer_name", 255);
        table.string("customer_email", 255);
        table.string("payment_method", 50);
        table.text("notes");
        table.integer("created_by").unsigned(); // User who created the sale
        table.timestamps(true, true);
        
        // Foreign keys
        table.foreign("product_id").references("products.id").onDelete("CASCADE");
        table.foreign("created_by").references("users.id").onDelete("SET NULL");
        
        // Indexes
        table.index("product_id");
        table.index("sale_date");
        table.index("created_at");
      });
      console.log('✅ Sales table created');
    } else {
      console.log('⏭️  Sales table already exists');
    }

    // Upload History Table (optional - track file uploads)
    const uploadsExists = await db.schema.hasTable("upload_history");
    if (!uploadsExists) {
      console.log('📝 Creating upload_history table...');
      await db.schema.createTable("upload_history", (table) => {
        table.increments("id").primary();
        table.string("filename", 255).notNullable();
        table.string("file_type", 50); // csv, xlsx, etc.
        table.integer("rows_processed").defaultTo(0);
        table.integer("rows_successful").defaultTo(0);
        table.integer("rows_failed").defaultTo(0);
        table.text("error_log"); // JSON string of errors
        table.integer("uploaded_by").unsigned();
        table.timestamps(true, true);
        
        table.foreign("uploaded_by").references("users.id").onDelete("SET NULL");
        table.index("uploaded_by");
        table.index("created_at");
      });
      console.log('✅ Upload history table created');
    } else {
      console.log('⏭️  Upload history table already exists');
    }

    console.log('');
    console.log('✅ All tables created successfully!');
    console.log('');
    console.log('📊 Database Schema:');
    console.log('   - users');
    console.log('   - products');
    console.log('   - sales');
    console.log('   - upload_history');
    console.log('');

    // Insert default admin user if users table is empty
    const userCount = await db("users").count("id as count").first();
    if (userCount.count === "0" || userCount.count === 0) {
      console.log('👤 Creating default admin user...');
      
      // You'll need to import bcrypt and hash the password
      // For now, this is a placeholder - update with real hashed password
      await db("users").insert({
        username: "admin",
        email: "admin@example.com",
        password: "$2b$10$placeholder", // Replace with bcrypt.hash('admin123', 10)
        role: "owner"
      });
      
      console.log('✅ Default admin user created');
      console.log('   Email: admin@example.com');
      console.log('   Password: admin123 (change this!)');
    }

  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    // Close the connection
    await db.destroy();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the initialization
createTables().catch((err) => {
  console.error("❌ Migration error:", err);
  process.exit(1);
});