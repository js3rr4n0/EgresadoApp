/**
 * db:reset — DROP all tables → push schema → seed
 * Idempotent: safe to run multiple times in a row.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function reset() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("🗑️  Dropping all tables...");

  // Drop in reverse-dependency order to avoid FK violations
  // Neon serverless v2+ requires tagged template syntax
  await sql`DROP TABLE IF EXISTS notificaciones CASCADE`;
  await sql`DROP TABLE IF EXISTS historial_estados CASCADE`;
  await sql`DROP TABLE IF EXISTS solicitudes_empresa CASCADE`;
  await sql`DROP TABLE IF EXISTS semanas_justificadas CASCADE`;
  await sql`DROP TABLE IF EXISTS actividades CASCADE`;
  await sql`DROP TABLE IF EXISTS cartas_aceptacion CASCADE`;
  await sql`DROP TABLE IF EXISTS propuestas CASCADE`;
  await sql`DROP TABLE IF EXISTS documentos_egresado CASCADE`;
  await sql`DROP TABLE IF EXISTS supervisores CASCADE`;
  await sql`DROP TABLE IF EXISTS empresas CASCADE`;
  await sql`DROP TABLE IF EXISTS periodos CASCADE`;
  await sql`DROP TABLE IF EXISTS usuarios CASCADE`;
  await sql`DROP TABLE IF EXISTS carreras CASCADE`;
  await sql`DROP TABLE IF EXISTS facultades CASCADE`;
  await sql`DROP TABLE IF EXISTS temas_historicos CASCADE`;

  console.log("  ✓ All tables dropped.\n");

  // Push schema via drizzle-kit
  console.log("📐 Applying schema (drizzle-kit push)...");
  const { execSync } = await import("child_process");
  execSync("npx drizzle-kit push --force", {
    stdio: "inherit",
    env: { ...process.env },
  });

  console.log("\n🌱 Running seed...");
  execSync("npx tsx scripts/seed.ts", {
    stdio: "inherit",
    env: { ...process.env },
  });

  console.log("\n🎉 Database reset complete!");
}

reset().catch((err) => {
  console.error("❌ Reset failed:", err);
  process.exit(1);
});
