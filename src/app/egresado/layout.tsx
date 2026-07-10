import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardHeader, { type NavItem } from "@/components/DashboardHeader";
import { db } from "@/lib/db";
import { documentosEgresado, usuarios } from "@/lib/schema";
import { eq } from "drizzle-orm";
import DocumentGate from "@/components/DocumentGate";

const navItems: NavItem[] = [
  { label: "Envío de Propuestas", href: "/egresado" },
  { label: "Foro y Comentarios", href: "/egresado/foro" },
];

export default async function EgresadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    redirect("/login");
  }

  // Fetch real user to get the carnet for the header
  const userRow = await db.select().from(usuarios).where(eq(usuarios.id, session.userId)).limit(1);
  const user = userRow[0];
  const roleDisplay = `Egresado ${user?.carnet || ''}`;

  // Check documents
  const docs = await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, session.userId));
  const hasServicio = docs.some(d => d.tipo === "servicio_social");
  const hasNotas = docs.some(d => d.tipo === "certificacion_notas");
  const hasPago = docs.some(d => d.tipo === "pago_tg");
  const hasAllDocs = hasServicio && hasNotas && hasPago;

  return (
    <div className="flex flex-col min-h-screen bg-muted-bg">
      <DashboardHeader
        roleName={roleDisplay}
        userName={session.nombreCompleto}
        navItems={hasAllDocs ? navItems : []}
      />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
