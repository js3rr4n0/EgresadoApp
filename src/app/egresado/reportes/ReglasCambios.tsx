/** Reglas para solicitar cambios al cronograma, visibles para el egresado antes y durante la solicitud. */
export default function ReglasCambios({
  mesActual,
  eliminacionesMesActual,
  maxEliminacionesPorMes,
  abierto = false,
}: {
  mesActual: number;
  eliminacionesMesActual: number;
  maxEliminacionesPorMes: number;
  abierto?: boolean;
}) {
  return (
    <details open={abierto} className="group bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
      <summary className="cursor-pointer select-none px-4 py-2.5 font-extrabold text-slate-700 flex items-center justify-between gap-2">
        <span>Reglas para solicitar cambios al cronograma</span>
        <span className="text-slate-400 font-bold group-open:hidden">Ver reglas</span>
        <span className="text-slate-400 font-bold hidden group-open:inline">Ocultar</span>
      </summary>
      <div className="px-4 pb-4 space-y-2 text-slate-600 font-medium">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            El cronograma fue aprobado y firmado por usted, su asesor designado y su supervisor empresarial. Solo se pueden
            solicitar cambios sobre actividades <strong>no realizadas de su período actual de 30 días</strong> (Mes {mesActual}); lo
            que ya fue enviado al asesor y las actividades de otros períodos no pueden cambiarse.
          </li>
          <li>
            Toda solicitud requiere una justificación y la <strong>nota de solicitud o aprobación del supervisor empresarial</strong>{" "}
            (PDF, PNG o JPG de máximo 5 MB). El cambio se aplica únicamente cuando su asesor designado lo aprueba.
          </li>
          <li>
            <strong>Eliminar:</strong> se permite {maxEliminacionesPorMes === 1 ? "una eliminación" : `${maxEliminacionesPorMes} eliminaciones`}{" "}
            por período de 30 días con la aprobación del asesor; eliminar otra actividad del mismo período requiere la autorización
            del decanato. Al eliminar, los códigos de las actividades siguientes del período se renumeran automáticamente.
          </li>
          <li>
            <strong>Posponer:</strong> no elimina la actividad; la deja pendiente en una semana posterior de su mismo período de 30
            días. Para enviar el informe del período debe completarla o solicitar su eliminación.
          </li>
          <li>
            <strong>Agregar:</strong> permite incorporar actividades nuevas, por ejemplo para alcanzar la extensión mínima de 20
            páginas por informe.
          </li>
          <li>
            <strong>Reubicar:</strong> adelanta una actividad del período a una semana anterior, sin duplicarla, y opcionalmente la
            intercambia con una actividad de la semana destino.
          </li>
          <li>Al aprobarse un cambio, los códigos de las actividades del período se reordenan automáticamente.</li>
          <li>No es posible programar actividades en semanas anteriores a su semana actual ni en informes ya enviados.</li>
        </ul>
        <p className="font-bold text-slate-700">
          Eliminaciones solicitadas en el Mes {mesActual}: {eliminacionesMesActual} de {maxEliminacionesPorMes}.
        </p>
      </div>
    </details>
  );
}
