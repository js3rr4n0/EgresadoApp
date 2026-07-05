import { getFacultades, getCarreras } from "@/app/actions/facultades";
import FacultadesManager from "@/components/FacultadesManager";

export default async function FacultadesPage() {
  const [resFacultades, resCarreras] = await Promise.all([
    getFacultades(),
    getCarreras()
  ]);

  const facultades = resFacultades.success && resFacultades.data ? resFacultades.data : [];
  const carreras = resCarreras.success && resCarreras.data ? resCarreras.data : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-2xl font-bold text-brand-red">Gestión de Facultades y Carreras</h1>
        <p className="text-sm text-muted">Administra la estructura académica de la institución.</p>
      </div>

      <FacultadesManager 
        initialFacultades={facultades} 
        initialCarreras={carreras} 
      />
    </div>
  );
}
