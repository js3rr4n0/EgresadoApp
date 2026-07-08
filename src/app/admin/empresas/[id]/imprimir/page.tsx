import { db } from "@/lib/db";
import { empresas, supervisores, firmantes, organigramasEmpresa } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import PrintView from "./PrintView";

export default async function ImprimirEmpresaPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return notFound();

  // Fetch data
  const empData = await db.select().from(empresas).where(eq(empresas.id, id));
  if (empData.length === 0) return notFound();

  const empresa = empData[0];
  const sups = await db.select().from(supervisores).where(eq(supervisores.empresaId, id));
  const firms = await db.select().from(firmantes).where(eq(firmantes.empresaId, id));
  const orgs = await db.select().from(organigramasEmpresa).where(eq(organigramasEmpresa.empresaId, id));

  const data = {
    ...empresa,
    supervisores: sups,
    firmantes: firms,
    organigramas: orgs,
  };

  return <PrintView empresa={data as unknown as import("@/app/actions/empresas").EmpresaData} />;
}
