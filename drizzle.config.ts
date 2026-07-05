import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Use unpooled for migrations (DDL requires direct connection, not pgbouncer)
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
  verbose: true,
  strict: true,
});
