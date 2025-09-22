import db from "./knex.js";

async function createTables() {
  // Users
  await db.schema.hasTable("users").then((exists) => {
    if (!exists) {
      return db.schema.createTable("users", (t) => {
        t.increments("id").primary();
        t.string("username").notNullable();
        t.string("email").unique().notNullable();
        t.string("password").notNullable();
        t.string("role").defaultTo("staff"); // or owner/staff
        t.timestamps(true, true);
      });
    }
  });

  // Products
  await db.schema.hasTable("products").then((exists) => {
    if (!exists) {
      return db.schema.createTable("products", (t) => {
        t.increments("id").primary();
        t.string("name").notNullable();
        t.integer("stock").defaultTo(0);
        t.decimal("price", 10, 2);
        t.timestamps(true, true);
      });
    }
  });

  console.log("✅ Tables created or already exist");
  process.exit();
}

createTables().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
