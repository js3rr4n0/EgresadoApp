import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Neon HTTP driver — works in serverless (Vercel Edge, Node, etc.)
 * Uses the pooled connection string from .env.local
 */
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
