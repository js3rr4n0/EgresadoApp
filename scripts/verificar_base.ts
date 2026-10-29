// Muestra a qué base de datos apuntan las variables antes de correr migraciones o scripts.
// No imprime contraseñas: solo el inicio del endpoint de Neon, el nombre de la base y algunos conteos.
// Uso: npx tsx --env-file=.env.local scripts/verificar_base.ts
import { neon } from "@neondatabase/serverless";

function endpoint(nombre: string): string | null {
  const valor = process.env[nombre];
  if (!valor) return null;
  try {
    return new URL(valor).hostname.split(".")[0].replace(/-pooler$/, "");
  } catch {
    return null;
  }
}

function describir(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) return `${nombre}: no definida`;
  try {
    const u = new URL(valor);
    const ep = u.hostname.split(".")[0];
    return `${nombre}: endpoint ${ep.slice(0, 12)}… · base "${u.pathname.slice(1)}"`;
  } catch {
    return `${nombre}: formato no reconocido`;
  }
}

async function main() {
  const entorno = process.env.DB_ENTORNO ?? "(no declarado)";
  console.log(`Entorno declarado (DB_ENTORNO): ${entorno}`);
  console.log(describir("DATABASE_URL"));
  console.log(describir("DATABASE_URL_UNPOOLED"));

  const a = endpoint("DATABASE_URL");
  const b = endpoint("DATABASE_URL_UNPOOLED");
  if (!a) {
    console.error("DATABASE_URL no está definida o no es válida. ¿Usaste --env-file=.env.local?");
    process.exit(1);
  }
  if (b && a !== b) {
    console.warn("⚠ DATABASE_URL y DATABASE_URL_UNPOOLED apuntan a endpoints distintos: la app y las migraciones usarían bases diferentes.");
  }

  const sql = neon(process.env.DATABASE_URL!);
  const [c] = await sql`
    SELECT
      (SELECT count(*) FROM usuarios)::int AS usuarios,
      (SELECT count(*) FROM periodos)::int AS cohortes,
      (SELECT count(*) FROM propuestas)::int AS propuestas,
      (SELECT count(*) FROM propuestas WHERE estado = 'en_ejecucion')::int AS en_ejecucion,
      (SELECT count(*) FROM informes_mensuales)::int AS informes
  `;
  console.log(
    `Conteos: ${c.usuarios} usuarios · ${c.cohortes} cohortes · ${c.propuestas} propuestas (${c.en_ejecucion} en ejecución) · ${c.informes} informes`
  );

  if (entorno !== "desarrollo") {
    console.warn("⚠ Esta no está declarada como la base de desarrollo. No corras migraciones ni scripts que borren datos.");
  }
}

main().catch((e) => {
  console.error("No se pudo consultar la base:", e instanceof Error ? e.message : e);
  process.exit(1);
});
