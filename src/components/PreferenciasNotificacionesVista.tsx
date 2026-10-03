import { getMisPreferenciasCorreo } from "@/app/actions/notificacionesCorreo";
import PreferenciasCorreoForm from "@/components/PreferenciasCorreoForm";

/** Página de preferencias de notificaciones del usuario en sesión (egresado o asesor). */
export default async function PreferenciasNotificacionesVista() {
  const res = await getMisPreferenciasCorreo();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900">Preferencias de notificaciones</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Elija qué notificaciones desea recibir también en su correo institucional. Las marcadas como obligatorias las define la
          administración.
        </p>
      </div>

      <div className="p-4 rounded-xl border bg-amber-50 border-amber-300 text-amber-900 text-xs font-semibold">
        Demostración: el envío real de correos aún no está conectado; sus preferencias quedan guardadas para cuando se active.
      </div>

      {!res.success ? (
        <div className="p-5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold">{res.error}</div>
      ) : res.notificaciones.length === 0 ? (
        <p className="text-xs text-slate-500 font-semibold">No hay notificaciones por correo configuradas para su rol.</p>
      ) : (
        <PreferenciasCorreoForm
          notificaciones={res.notificaciones.map((n) => ({
            id: n.id,
            nombre: n.nombre,
            descripcion: n.descripcion,
            correoHabilitado: n.correoHabilitado,
            obligatoria: n.obligatoria,
            recibirCorreo: n.recibirCorreo,
          }))}
        />
      )}
    </div>
  );
}
