import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

let pool: Pool;
let db: ReturnType<typeof drizzle>;

try {
  console.log("Initializing database connection...");
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
  console.log("Database connection established successfully");
} catch (error) {
  console.error("Failed to initialize database connection:", error);
  throw error;
}

export { pool, db };