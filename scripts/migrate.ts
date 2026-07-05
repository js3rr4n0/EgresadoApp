/**
 * db:migrate — Generate and apply migrations with drizzle-kit
 */
import "dotenv/config";
import { execSync } from "child_process";

console.log("📐 Generating migration...");
execSync("npx drizzle-kit generate", { stdio: "inherit" });

console.log("\n📐 Applying migration...");
execSync("npx drizzle-kit push --force", { stdio: "inherit" });

console.log("\n✅ Migration complete.");
