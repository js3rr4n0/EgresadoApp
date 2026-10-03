"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { crearSolicitudCambioActividad, getDocumentoSupervisorSolicitud } from "@/app/actions/cambiosActividad";
import { openDocument } from "@/lib/pdfViewer";
import ReglasCambios from "./ReglasCambios";

type Tipo = "agregar" | "modificar" | "eliminar" | "posponer" | "reubicar";

const TAMANO_MAXIMO_DOCUMENTO = 5 * 1024 * 1024;
const TIPOS_DOCUMENTO = ["application/pdf", "image/png", "image/jpeg"];

const TIPO_LABEL: Record<Tipo, string> = {
  agregar: "Agregar actividad nueva",
  modificar: "Modificar actividad existente (opción retirada)",
  eliminar: "Eliminar actividad",
  posponer: "Posponer actividad",
  reubicar: "Intercambiar / reubicar actividad existente",
};

const TIPOS_DISPONIBLES: Tipo[] = ["agregar", "eliminar", "posponer", "reubicar"];

const TIPO_AYUDA: Record<Tipo, string> = {
  agregar: "Crea una actividad que no estaba contemplada en el cronograma.",
  modificar: "",
  eliminar:
    "Retira una actividad que aún no ha sido realizada. Los códigos de las actividades siguientes del período se renumeran automáticamente. Se permite una eliminación por período de 30 días; una segunda requiere autorización del decanato.",
  posponer:
    "Mueve una actividad aún no realizada a una semana posterior dentro de su mismo período de 30 días. No es posible posponerla más allá del período.",
  reubicar:
    "Adelanta una actividad existente (aún no enviada) a una semana anterior, sin duplicarla. Opcionalmente puede intercambiarla con una actividad de la semana destino.",
};

const ESTADO_SOLICITUD: Record<string, { label: string; badge: string }> = {
  pendiente: { label: "Pendiente", badge: "bg-slate-100 text-slate-700 border-slate-300" },
  aprobada: { label: "Aprobada", badge: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  rechazada: { label: "Rechazada", badge: "bg-red-100 text-red-800 border-red-300" },
};

interface MesOpcion {
  mes: number;
  nombre: string;
  inicio: string | null;
  fin: string | null;
  semanas: number[];
}

interface ActividadOpcion {
  id: number;
  codigo: string;
  titulo: string | null;
  periodo: number;
  semana: number;
  estado: string;
  editable: boolean;
}

function formatoCorto(iso: string | null) {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function sinEnviar(a: ActividadOpcion) {
  return a.estado === "pendiente" || a.estado === "guardado";
}

function compararPos(a: { mes: number; semana: number }, b: { mes: number; semana: number }) {
  return a.mes - b.mes || a.semana - b.semana;
}

export default function SolicitudesCambioActividad({
  propuestaId,
  opciones,
  solicitudesIniciales,
}: {
  propuestaId: number;
  opciones: {
    meses: MesOpcion[];
    posicionActual: { mes: number; semana: number };
    actividades: ActividadOpcion[];
    eliminacionesPorMes: Record<number, number>;
    maxEliminacionesPorMes: number;
  };
  solicitudesIniciales: any[];
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [tipo, setTipo] = useState<Tipo>("agregar");
  const [actividadId, setActividadId] = useState<number | "">("");
  const [codigoBusqueda, setCodigoBusqueda] = useState("");
  const [busquedaError, setBusquedaError] = useState<string | null>(null);
  const [intercambioId, setIntercambioId] = useState<number | "">("");
  const [mesDestino, setMesDestino] = useState<number | "">("");
  const [semanaDestino, setSemanaDestino] = useState<number | "">("");
  const [tituloPropuesto, setTituloPropuesto] = useState("");
  const [descripcionPropuesta, setDescripcionPropuesta] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [documento, setDocumento] = useState<{ nombre: string; dataUrl: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actividadSeleccionada = opciones.actividades.find((a) => a.id === actividadId) || null;
  const usaDestino = tipo === "agregar" || tipo === "posponer" || tipo === "reubicar";
  const usaTexto = tipo === "agregar";

  // Solo actividades aún no realizadas ni enviadas: lo ya reportado no admite cambios.
  const actividadesSelector = useMemo(
    () => opciones.actividades.filter((a) => a.editable && sinEnviar(a)),
    [opciones.actividades]
  );

  // Meses y semanas válidos según el tipo de cambio y la ubicación de la actividad.
  const mesesDisponibles = useMemo(() => {
    return opciones.meses
      .filter((m) => tipo !== "posponer" || !actividadSeleccionada || m.mes === actividadSeleccionada.periodo)
      .map((m) => ({
        ...m,
        semanas: m.semanas.filter((s) => {
          if (!actividadSeleccionada) return true;
          const cmp = compararPos({ mes: m.mes, semana: s }, { mes: actividadSeleccionada.periodo, semana: actividadSeleccionada.semana });
          if (tipo === "posponer") return cmp > 0;
          if (tipo === "reubicar") return cmp < 0;
          return true;
        }),
      }))
      .filter((m) => m.semanas.length > 0);
  }, [opciones.meses, actividadSeleccionada, tipo]);

  const mesSeleccionado = mesesDisponibles.find((m) => m.mes === mesDestino) || null;

  const candidatasIntercambio = useMemo(() => {
    if (tipo !== "reubicar" || !mesDestino || !semanaDestino || !actividadSeleccionada) return [];
    return opciones.actividades.filter(
      (a) => a.periodo === mesDestino && a.semana === semanaDestino && a.id !== actividadSeleccionada.id && sinEnviar(a)
    );
  }, [tipo, mesDestino, semanaDestino, actividadSeleccionada, opciones.actividades]);

  const resetDestino = () => {
    setMesDestino("");
    setSemanaDestino("");
    setIntercambioId("");
  };

  const resetForm = () => {
    setTipo("agregar");
    setActividadId("");
    setCodigoBusqueda("");
    setBusquedaError(null);
    resetDestino();
    setTituloPropuesto("");
    setDescripcionPropuesta("");
    setJustificacion("");
    setDocumento(null);
    setError(null);
  };

  const seleccionarDocumento = (file: File) => {
    setError(null);
    if (!TIPOS_DOCUMENTO.includes(file.type)) {
      setError("El documento del supervisor debe ser un archivo PDF, PNG o JPG.");
      return;
    }
    if (file.size > TAMANO_MAXIMO_DOCUMENTO) {
      setError("El documento del supervisor excede el tamaño máximo de 5 MB.");
      return;
    }
    const lector = new FileReader();
    lector.onload = () => setDocumento({ nombre: file.name, dataUrl: String(lector.result) });
    lector.onerror = () => setError("No se pudo leer el documento seleccionado.");
    lector.readAsDataURL(file);
  };

  const verDocumento = async (solicitudId: number) => {
    const res = await getDocumentoSupervisorSolicitud(solicitudId);
    if (res.success && res.url) openDocument(res.url, res.nombre);
    else alert(res.error || "No se pudo abrir el documento.");
  };

  const cambiarTipo = (nuevo: Tipo) => {
    setTipo(nuevo);
    setActividadId("");
    setCodigoBusqueda("");
    setBusquedaError(null);
    resetDestino();
    setError(null);
  };

  const buscarPorCodigo = () => {
    setBusquedaError(null);
    setActividadId("");
    resetDestino();
    const codigo = codigoBusqueda.trim();
    if (!codigo) {
      setBusquedaError("Ingrese el código de la actividad (por ejemplo, 3.2.1).");
      return;
    }
    const encontrada = opciones.actividades.find((a) => a.codigo === codigo);
    if (!encontrada) {
      setBusquedaError(`No se encontró ninguna actividad con el código ${codigo} en el cronograma vigente.`);
      return;
    }
    if (!encontrada.editable) {
      setBusquedaError(`La actividad ${codigo} no pertenece a su período actual (Mes ${opciones.posicionActual.mes}); solo puede reubicar actividades de ese período.`);
      return;
    }
    if (!sinEnviar(encontrada)) {
      setBusquedaError(`La actividad ${codigo} ya fue realizada y enviada; solo se pueden reubicar actividades por realizar.`);
      return;
    }
    const hayDestinos = opciones.meses.some((m) =>
      m.semanas.some((s) => compararPos({ mes: m.mes, semana: s }, { mes: encontrada.periodo, semana: encontrada.semana }) < 0)
    );
    if (!hayDestinos) {
      setBusquedaError(`La actividad ${codigo} ya se encuentra en tu semana actual o en una anterior; no hay semanas válidas a las cuales adelantarla.`);
      return;
    }
    setActividadId(encontrada.id);
  };

  const puedeEnviar =
    justificacion.trim().length >= 15 &&
    !!documento &&
    (tipo === "agregar" || !!actividadSeleccionada) &&
    (!usaDestino || (!!mesDestino && !!semanaDestino)) &&
    (!usaTexto || (!!tituloPropuesto.trim() && !!descripcionPropuesta.trim()));

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    const res = await crearSolicitudCambioActividad(propuestaId, {
      tipo,
      actividadId: tipo === "agregar" ? null : actividadSeleccionada?.id ?? null,
      actividadIntercambioId: tipo === "reubicar" && intercambioId !== "" ? Number(intercambioId) : null,
      periodoDestino: usaDestino && mesDestino !== "" ? Number(mesDestino) : null,
      semanaDestino: usaDestino && semanaDestino !== "" ? Number(semanaDestino) : null,
      tituloPropuesto: usaTexto ? tituloPropuesto : null,
      descripcionPropuesta: usaTexto ? descripcionPropuesta : null,
      justificacion,
      documentoSupervisor: documento,
    });
    setLoading(false);
    if (res.success) {
      setShowModal(false);
      resetForm();
      router.refresh();
    } else {
      setError(res.error || "No se pudo crear la solicitud.");
    }
  };

  const intercambioSeleccionado = candidatasIntercambio.find((a) => a.id === intercambioId) || null;

  const inputClass =
    "w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-brand-red outline-none disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">Cambios al Cronograma (Gantt)</h3>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Aplican únicamente a actividades no realizadas de su período actual (Mes {opciones.posicionActual.mes}): lo que ya fue
            enviado al asesor no puede modificarse. Todo cambio requiere justificación, la nota de solicitud o aprobación del supervisor empresarial y la aprobación de su asesor
            designado antes de aplicarse.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs shrink-0"
        >
          Solicitar cambio
        </button>
      </div>

      <ReglasCambios
        mesActual={opciones.posicionActual.mes}
        eliminacionesMesActual={opciones.eliminacionesPorMes[opciones.posicionActual.mes] || 0}
        maxEliminacionesPorMes={opciones.maxEliminacionesPorMes}
      />

      {solicitudesIniciales.length === 0 ? (
        <p className="text-[11px] text-slate-400 font-semibold">No ha realizado solicitudes de cambio.</p>
      ) : (
        <div className="space-y-2">
          {solicitudesIniciales.map((s) => {
            const estado = ESTADO_SOLICITUD[s.estado] || ESTADO_SOLICITUD.pendiente;
            return (
              <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {TIPO_LABEL[s.tipo as Tipo] || s.tipo}
                    {s.actividad && <span className="font-mono text-slate-500"> — {s.actividad.codigo}</span>}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border shrink-0 ${estado.badge}`}>
                    {estado.label}
                  </span>
                </div>
                {s.periodoDestino && (
                  <p className="text-[11px] text-slate-600 font-semibold">
                    Destino: Mes {s.periodoDestino}, Semana {s.semanaDestino}
                    {s.actividadIntercambio && ` — intercambio con ${s.actividadIntercambio.codigo}`}
                  </p>
                )}
                <p className="text-[11px] text-slate-500 font-medium">{s.justificacion}</p>
                {s.tieneDocumento && (
                  <button
                    type="button"
                    onClick={() => verDocumento(s.id)}
                    className="text-[11px] font-bold text-slate-700 underline hover:text-brand-red"
                  >
                    Ver documento del supervisor{s.documentoSupervisorNombre ? ` (${s.documentoSupervisorNombre})` : ""}
                  </button>
                )}
                {s.respuestaAsesor && (
                  <p className="text-[11px] text-amber-800 font-semibold">Respuesta del asesor: {s.respuestaAsesor}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-slate-200">
              <h3 className="text-base font-extrabold text-slate-900">Solicitar cambio al cronograma</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                aria-label="Cerrar"
              >
                Cerrar
              </button>
            </div>

            <div className="p-5 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold">{error}</div>}

              <p className="text-[11px] text-slate-500 font-semibold">
                Semana actual: Mes {opciones.posicionActual.mes}, Semana {opciones.posicionActual.semana}.
              </p>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Tipo de cambio</label>
                <select value={tipo} onChange={(e) => cambiarTipo(e.target.value as Tipo)} className={inputClass}>
                  {TIPOS_DISPONIBLES.map((t) => (
                    <option key={t} value={t}>
                      {TIPO_LABEL[t]}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">{TIPO_AYUDA[tipo]}</p>
              </div>

              <ReglasCambios
                mesActual={opciones.posicionActual.mes}
                eliminacionesMesActual={opciones.eliminacionesPorMes[opciones.posicionActual.mes] || 0}
                maxEliminacionesPorMes={opciones.maxEliminacionesPorMes}
              />

              {(tipo === "eliminar" || tipo === "posponer") && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Actividad</label>
                  <select
                    value={actividadId}
                    onChange={(e) => {
                      setActividadId(e.target.value ? Number(e.target.value) : "");
                      resetDestino();
                    }}
                    className={inputClass}
                  >
                    <option value="">Seleccione una actividad</option>
                    {actividadesSelector.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.codigo} — {a.titulo}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Solo se listan actividades del período actual (Mes {opciones.posicionActual.mes}) que aún no han sido realizadas ni enviadas.
                  </p>
                  {actividadesSelector.length === 0 && (
                    <p className="text-[11px] text-red-700 font-semibold">
                      No hay actividades disponibles para cambios: las de su período actual ya fueron enviadas o el informe del período ya
                      fue enviado.
                    </p>
                  )}
                  {tipo === "eliminar" && actividadSeleccionada && (
                    <p
                      className={`text-[11px] font-bold ${
                        (opciones.eliminacionesPorMes[actividadSeleccionada.periodo] || 0) >= opciones.maxEliminacionesPorMes
                          ? "text-red-700"
                          : "text-slate-600"
                      }`}
                    >
                      Eliminaciones solicitadas en el Mes {actividadSeleccionada.periodo}:{" "}
                      {opciones.eliminacionesPorMes[actividadSeleccionada.periodo] || 0} de {opciones.maxEliminacionesPorMes}.
                      {(opciones.eliminacionesPorMes[actividadSeleccionada.periodo] || 0) >= opciones.maxEliminacionesPorMes &&
                        " Este período ya alcanzó el límite; una nueva eliminación requiere autorización del decanato."}
                    </p>
                  )}
                </div>
              )}

              {tipo === "reubicar" && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Código de la actividad existente</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codigoBusqueda}
                      onChange={(e) => setCodigoBusqueda(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          buscarPorCodigo();
                        }
                      }}
                      placeholder="Ej. 3.2.1"
                      className={`${inputClass} font-mono`}
                    />
                    <button
                      type="button"
                      onClick={buscarPorCodigo}
                      className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0"
                    >
                      Buscar
                    </button>
                  </div>
                  {busquedaError && <p className="text-[11px] text-red-700 font-semibold">{busquedaError}</p>}
                  {actividadSeleccionada && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700">
                      <p className="font-bold">
                        {actividadSeleccionada.codigo} — {actividadSeleccionada.titulo}
                      </p>
                      <p className="text-slate-500 font-semibold">
                        Ubicación actual: Mes {actividadSeleccionada.periodo}, Semana {actividadSeleccionada.semana}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {usaDestino && (tipo === "agregar" || actividadSeleccionada) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-400">Mes destino</label>
                    <select
                      value={mesDestino}
                      onChange={(e) => {
                        setMesDestino(e.target.value ? Number(e.target.value) : "");
                        setSemanaDestino("");
                        setIntercambioId("");
                      }}
                      className={inputClass}
                    >
                      <option value="">Seleccione</option>
                      {mesesDisponibles.map((m) => (
                        <option key={m.mes} value={m.mes}>
                          Mes {m.mes} ({m.nombre})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-400">Semana destino</label>
                    <select
                      value={semanaDestino}
                      onChange={(e) => {
                        setSemanaDestino(e.target.value ? Number(e.target.value) : "");
                        setIntercambioId("");
                      }}
                      disabled={!mesSeleccionado}
                      className={inputClass}
                    >
                      <option value="">Seleccione</option>
                      {mesSeleccionado?.semanas.map((s) => (
                        <option key={s} value={s}>
                          Semana {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  {mesSeleccionado?.inicio && (
                    <p className="col-span-2 text-[11px] text-slate-500 font-semibold">
                      El Mes {mesSeleccionado.mes} comprende del {formatoCorto(mesSeleccionado.inicio)} al{" "}
                      {formatoCorto(mesSeleccionado.fin)}.
                    </p>
                  )}
                  {mesesDisponibles.length === 0 && (
                    <p className="col-span-2 text-[11px] text-red-700 font-semibold">
                      No hay semanas válidas disponibles para este cambio dentro del período de los informes mensuales.
                    </p>
                  )}
                </div>
              )}

              {tipo === "reubicar" && actividadSeleccionada && mesDestino && semanaDestino && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Intercambio (opcional)</label>
                  <select
                    value={intercambioId}
                    onChange={(e) => setIntercambioId(e.target.value ? Number(e.target.value) : "")}
                    className={inputClass}
                  >
                    <option value="">No intercambiar: agregar al final de la semana destino</option>
                    {candidatasIntercambio.map((a) => (
                      <option key={a.id} value={a.id}>
                        Intercambiar con {a.codigo} — {a.titulo}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium">
                    {intercambioSeleccionado
                      ? `La actividad ${actividadSeleccionada.codigo} tomará la posición de ${intercambioSeleccionado.codigo} (Mes ${mesDestino}, Semana ${semanaDestino}) y ${intercambioSeleccionado.codigo} pasará a la ubicación original (Mes ${actividadSeleccionada.periodo}, Semana ${actividadSeleccionada.semana}). Ambas intercambian su código.`
                      : `La actividad ${actividadSeleccionada.codigo} se moverá al final de Mes ${mesDestino}, Semana ${semanaDestino} y recibirá un nuevo código. Las actividades que ya están en esa semana conservan su código.`}
                  </p>
                </div>
              )}

              {usaTexto && (
                <>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-400">
                      Título de la nueva actividad
                    </label>
                    <input
                      type="text"
                      value={tituloPropuesto}
                      onChange={(e) => setTituloPropuesto(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-400">
                      Descripción de la nueva actividad
                    </label>
                    <textarea
                      rows={3}
                      value={descripcionPropuesta}
                      onChange={(e) => setDescripcionPropuesta(e.target.value)}
                      className={`${inputClass} font-medium resize-none`}
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Justificación (obligatoria)</label>
                <textarea
                  rows={3}
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  placeholder="Explique por qué es necesario este cambio (mínimo 15 caracteres)."
                  className={`${inputClass} font-medium resize-none`}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-400">
                  Nota de solicitud o aprobación del supervisor empresarial (obligatoria)
                </label>
                <label className="flex items-center justify-between gap-3 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                  <span className="text-xs font-semibold text-slate-600 truncate">
                    {documento ? documento.nombre : "Seleccionar archivo (PDF, PNG o JPG, máximo 5 MB)"}
                  </span>
                  <span className="px-3 py-1 rounded-md bg-slate-900 text-white text-[11px] font-bold shrink-0">
                    {documento ? "Cambiar" : "Examinar"}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) seleccionarDocumento(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className="text-[11px] text-slate-500">
                  El cambio afecta un cronograma firmado por el asesor y el supervisor; debe respaldarse con la conformidad del supervisor.
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !puedeEnviar}
                className="px-5 py-2 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white text-xs font-extrabold transition-colors disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
