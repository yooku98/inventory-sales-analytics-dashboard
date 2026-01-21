// backend/db/knex.js
import knex from "knex";
import dotenv from "dotenv";

dotenv.config();

// Knex configuration with connection pooling and SSL support
const db = knex({
  client: "pg",
  connection: process.env.DATABASE_URL || {
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "inventory_dashboard",
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } 
      : false
  },
  pool: {
    min: 0,
    max: 5,
    // Time before a connection is considered idle
    idleTimeoutMillis: 30000,
    // Time to wait for a connection to become available
    acquireTimeoutMillis: 60000,
    // Check for idle connections every 1 second
    reapIntervalMillis: 1000,
  },
  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',
  // Log database queries in development
  log: {
    warn(message) {
      console.warn('⚠️ Knex Warning:', message);
    },
    error(message) {
      console.error('❌ Knex Error:', message);
    },
    deprecate(message) {
      console.warn('⚠️ Knex Deprecation:', message);
    },
    debug(message) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Knex Debug:', message);
      }
    },
  },
});

// Test database connection
const testConnection = async () => {
  try {
    await db.raw('SELECT NOW()');
    console.log('✅ Database connected successfully via Knex');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Please check your DATABASE_URL or database credentials in .env');
if (process.env.NODE_ENV !== 'production') {
  process.exit(1);
}
  }
};

// Run connection test
testConnection();

// Graceful shutdown
const closeConnection = async () => {
  try {
    await db.destroy();
    console.log('✅ Knex connection pool closed');
  } catch (error) {
    console.error('❌ Error closing Knex connection:', error);
  }
};

// Handle shutdown signals
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

export default db;
