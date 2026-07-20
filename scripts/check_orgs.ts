import { db } from "../src/lib/db";
import { empresas, organigramasEmpresa } from "../src/lib/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  const emps = await db.select().from(empresas);
  console.log("Empresas:", emps.map(e => ({ id: e.id, nombre: e.nombre, organigramaUrl: e.organigramaUrl, mapaUrl: e.mapaUrl })));
  
  const orgs = await db.select().from(organigramasEmpresa).orderBy(desc(organigramasEmpresa.subidoEn));
  console.log("Orgs:", orgs);
  
  process.exit(0);
}

main();
