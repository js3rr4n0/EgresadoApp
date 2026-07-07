import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import EmpresasManager from "@/components/EmpresasManager";
import { getEmpresas } from "@/app/actions/empresas";

export const metadata = {
  title: "Gestión de Empresas | Admin",
};

export default async function EmpresasPage() {
  const session = await getSession();
  
  if (!session || session.rol !== "admin") {
    redirect("/login");
  }

  const { success, data, error } = await getEmpresas();

  if (!success) {
    return (
      <div className="w-full text-center py-20 text-red-500 font-bold">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full">
      <EmpresasManager initialEmpresas={data || []} />
    </div>
  );
}
