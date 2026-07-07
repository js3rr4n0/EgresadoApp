import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { periodos } from "@/lib/schema";
import PeriodosManager from "@/components/PeriodosManager";
import { desc } from "drizzle-orm";

export const metadata = {
  title: "Gestión de Ciclos Académicos | Admin",
};

export default async function PeriodosPage() {
  const session = await getSession();
  
  if (!session || session.rol !== "admin") {
    redirect("/login");
  }

  // Fetch all periodos
  const periodosData = await db
    .select()
    .from(periodos)
    .orderBy(desc(periodos.id));

  return (
    <div className="w-full">
      <PeriodosManager initialPeriodos={periodosData} />
    </div>
  );
}
