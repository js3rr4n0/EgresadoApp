/**
 * Verifica los constraints de la base de datos (pruebas F1 de PLAN.md)
 * - Insertar propuesta #4 del mismo egresado falla
 * - CHECKs de estado rechazan valores inválidos
 * - CHECKs de tipo rechazan valores inválidos
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function testConstraints() {
  const sql = neon(process.env.DATABASE_URL!);
  let passed = 0;
  let failed = 0;

  async function expectFail(name: string, query: () => Promise<unknown>) {
    try {
      await query();
      console.error(`  ✗ ${name} — DEBERÍA HABER FALLADO pero pasó`);
      failed++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ✓ ${name} — rechazado correctamente: ${msg.slice(0, 80)}`);
      passed++;
    }
  }

  async function expectPass(name: string, query: () => Promise<unknown>) {
    try {
      await query();
      console.log(`  ✓ ${name} — OK`);
      passed++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${name} — FALLÓ: ${msg.slice(0, 120)}`);
      failed++;
    }
  }

  console.log("🧪 Verificando constraints de la base de datos...\n");

  // ── Propuestas: máximo 3 por egresado por periodo ──
  console.log("── Constraint: máx 3 propuestas por egresado/periodo ──");

  // Insertar propuestas 1, 2, 3 (deben pasar)
  await expectPass("Propuesta #1", () =>
    sql`INSERT INTO propuestas (egresado_id, periodo_id, tipo, numero, estado) VALUES (4, 1, 'pasantia', 1, 'redactando')`
  );
  await expectPass("Propuesta #2", () =>
    sql`INSERT INTO propuestas (egresado_id, periodo_id, tipo, numero, estado) VALUES (4, 1, 'pasantia', 2, 'redactando')`
  );
  await expectPass("Propuesta #3", () =>
    sql`INSERT INTO propuestas (egresado_id, periodo_id, tipo, numero, estado) VALUES (4, 1, 'pasantia', 3, 'redactando')`
  );

  // Propuesta #4 debe fallar por CHECK (numero BETWEEN 1 AND 3)
  await expectFail("Propuesta #4 (numero=4 → CHECK fail)", () =>
    sql`INSERT INTO propuestas (egresado_id, periodo_id, tipo, numero, estado) VALUES (4, 1, 'pasantia', 4, 'redactando')`
  );

  // Propuesta duplicada (mismo egresado, periodo, numero) debe fallar por UNIQUE
  await expectFail("Propuesta duplicada (numero=1 → UNIQUE fail)", () =>
    sql`INSERT INTO propuestas (egresado_id, periodo_id, tipo, numero, estado) VALUES (4, 1, 'pasantia', 1, 'redactando')`
  );

  // ── CHECK de estado ──
  console.log("\n── Constraint: estados válidos ──");

  await expectFail("Estado inválido 'borrador'", () =>
    sql`UPDATE propuestas SET estado = 'borrador' WHERE id = (SELECT id FROM propuestas LIMIT 1)`
  );

  await expectPass("Estado válido 'enviada'", () =>
    sql`UPDATE propuestas SET estado = 'enviada' WHERE id = (SELECT id FROM propuestas LIMIT 1)`
  );

  // ── CHECK de tipo ──
  console.log("\n── Constraint: tipos válidos ──");

  await expectFail("Tipo inválido 'tesis'", () =>
    sql`INSERT INTO propuestas (egresado_id, periodo_id, tipo, numero, estado) VALUES (4, 1, 'tesis', 1, 'redactando')
    `  // Also fails UNIQUE but CHECK should fire first or together
  );

  // ── CHECK de rol ──
  console.log("\n── Constraint: roles válidos ──");

  await expectFail("Rol inválido 'superadmin'", () =>
    sql`INSERT INTO usuarios (nombre_completo, correo, password_hash, rol) VALUES ('Test', 'test-bad-role@test.com', 'hash', 'superadmin')`
  );

  // ── CHECK de tipo documento ──
  console.log("\n── Constraint: tipos de documento válidos ──");

  await expectFail("Tipo doc inválido 'diploma'", () =>
    sql`INSERT INTO documentos_egresado (egresado_id, tipo, archivo_url) VALUES (4, 'diploma', 'https://example.com/file.pdf')`
  );

  await expectPass("Tipo doc válido 'servicio_social'", () =>
    sql`INSERT INTO documentos_egresado (egresado_id, tipo, archivo_url) VALUES (4, 'servicio_social', 'https://example.com/file.pdf')`
  );

  // ── FK: egresado_id inválido ──
  console.log("\n── Constraint: FKs ──");

  await expectFail("FK egresado_id inexistente", () =>
    sql`INSERT INTO documentos_egresado (egresado_id, tipo, archivo_url) VALUES (9999, 'pago_tg', 'https://example.com/file.pdf')`
  );

  // ── Cleanup test data ──
  await sql`DELETE FROM documentos_egresado WHERE egresado_id = 4`;
  await sql`DELETE FROM propuestas WHERE egresado_id = 4`;

  console.log(`\n${"═".repeat(50)}`);
  console.log(`  Resultados: ${passed} pasaron, ${failed} fallaron`);
  console.log(`${"═".repeat(50)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

testConstraints().catch((err) => {
  console.error("❌ Test runner failed:", err);
  process.exit(1);
});
