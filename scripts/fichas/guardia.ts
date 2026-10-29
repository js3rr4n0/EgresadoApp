// Impide que un script que escribe en la base corra fuera de la base de desarrollo por descuido.
// Ver specs/fichas/ENTREGA_0.md: la base de desarrollo se declara con DB_ENTORNO=desarrollo en .env.local.

export function exigirBaseDesarrollo(nombreScript: string) {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL no está definida. Ejecuta el script con --env-file=.env.local.");
    process.exit(1);
  }
  const entorno = process.env.DB_ENTORNO ?? "(no declarado)";
  if (entorno === "desarrollo") return;
  if (process.argv.includes("--confirmo-base-principal")) {
    console.warn(`⚠ ${nombreScript}: se ejecuta sobre una base no declarada como desarrollo (${entorno}), con confirmación explícita.`);
    return;
  }
  console.error(
    `${nombreScript}: la base no está declarada como desarrollo (DB_ENTORNO=${entorno}). ` +
      "Revisa .env.local. Para la base principal, agrega --confirmo-base-principal solo después de probar en desarrollo."
  );
  process.exit(1);
}
