"use client";

// Configuración de una facultad en una cohorte (entrega C1): administración, modo de coordinación, coordinadores con
// sus carreras y asesores que participan.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { guardarConfiguracionFacultad } from "@/app/actions/configCohorte";
import type { FacultadConfig, UsuarioConfig } from "@/lib/configCohorteServidor";
import {
  AYUDA_COORDINACION,
  NOMBRE_ADMINISTRACION,
  NOMBRE_COORDINACION,
  configVacia,
  describirCambios,
  validarConfig,
  type ConfigFacultad,
  type Coordinacion,
  type Nombres,
  type Participante,
} from "@/lib/configCohorte";
import DialogoJustificacion from "./DialogoJustificacion";

const claseSelect = "w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:border-brand-red outline-none";

function Opcion({ activo, titulo, ayuda, onClick, deshabilitado }: { activo: boolean; titulo: string; ayuda: string; onClick: () => void; deshabilitado?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      className={`text-left rounded-xl border p-3 transition-colors disabled:opacity-50 ${activo ? "border-brand-red bg-red-50/40 ring-1 ring-brand-red" : "border-border bg-white hover:border-gray-400"}`}
    >
      <span className="flex items-center gap-2">
        <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${activo ? "border-brand-red bg-brand-red shadow-[inset_0_0_0_2px_white]" : "border-gray-300"}`} />
        <span className="text-sm font-bold text-gray-800">{titulo}</span>
      </span>
      <span className="block text-xs text-muted mt-1 pl-[22px]">{ayuda}</span>
    </button>
  );
}

function Interruptor({ activo, onChange, etiqueta }: { activo: boolean; onChange: () => void; etiqueta: string }) {
  return (
    <button type="button" role="switch" aria-checked={activo} aria-label={etiqueta} onClick={onChange} className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${activo ? "bg-green-600" : "bg-gray-300"}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${activo ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

/** Lista editable de coordinadores o asesores de la facultad. */
function ListaParticipantes({
  titulo,
  ayuda,
  lista,
  disponibles,
  facultadId,
  carreras,
  conCarreras,
  carrerasObligatorias,
  onChange,
}: {
  titulo: string;
  ayuda: string;
  lista: Participante[];
  disponibles: UsuarioConfig[];
  facultadId: number;
  carreras: { id: number; nombre: string }[];
  conCarreras: boolean;
  carrerasObligatorias: boolean;
  onChange: (l: Participante[]) => void;
}) {
  const [nuevo, setNuevo] = useState("");
  const usuario = (id: number) => disponibles.find((u) => u.id === id);
  const libres = disponibles.filter((u) => !lista.some((p) => p.usuarioId === u.id));
  const deEsta = libres.filter((u) => u.facultadId === facultadId);
  const otras = libres.filter((u) => u.facultadId !== facultadId);
  const actualizar = (i: number, cambio: Partial<Participante>) => onChange(lista.map((p, j) => (j === i ? { ...p, ...cambio } : p)));

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-800">{titulo}</p>
          <p className="text-xs text-muted">{ayuda}</p>
        </div>
        <span className="text-xs text-muted shrink-0">{lista.filter((p) => p.activo).length} habilitados</span>
      </div>

      {lista.length > 0 && (
        <ul className="divide-y divide-border border border-border rounded-xl overflow-hidden">
          {lista.map((p, i) => {
            const u = usuario(p.usuarioId);
            return (
              <li key={p.usuarioId} className={`px-3 py-2.5 ${p.activo ? "bg-white" : "bg-gray-50"}`}>
                <div className="flex items-center gap-3">
                  <Interruptor activo={p.activo} etiqueta={`Habilitar a ${u?.nombre ?? ""}`} onChange={() => actualizar(i, { activo: !p.activo })} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${p.activo ? "text-gray-800" : "text-gray-400 line-through"}`}>{u?.nombre ?? `Usuario ${p.usuarioId}`}</p>
                    <p className="text-[11px] text-muted truncate">
                      {u?.correo}
                      {u && u.facultadId !== facultadId && " · de otra facultad"}
                      {u && !u.activo && " · cuenta inactiva"}
                    </p>
                  </div>
                  <button type="button" onClick={() => onChange(lista.filter((_, j) => j !== i))} className="text-xs font-bold text-gray-400 hover:text-brand-red">Quitar</button>
                </div>
                {conCarreras && (
                  <div className="flex flex-wrap gap-1.5 mt-2 ml-12">
                    {!carrerasObligatorias && (
                      <button
                        type="button"
                        onClick={() => actualizar(i, { carreras: [] })}
                        className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${p.carreras.length === 0 ? "bg-brand-red text-white border-brand-red" : "border-border text-gray-600 hover:border-brand-red"}`}
                      >
                        Todas
                      </button>
                    )}
                    {carreras.map((c) => {
                      const sel = p.carreras.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => actualizar(i, { carreras: sel ? p.carreras.filter((x) => x !== c.id) : [...p.carreras, c.id] })}
                          className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold transition-colors ${sel ? "bg-brand-red text-white border-brand-red" : "border-border text-gray-600 hover:border-brand-red"}`}
                        >
                          {c.nombre}
                        </button>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-2">
        <select value={nuevo} onChange={(e) => setNuevo(e.target.value)} className={claseSelect}>
          <option value="">Agregar...</option>
          {deEsta.length > 0 && (
            <optgroup label="De esta facultad">
              {deEsta.map((u) => <option key={u.id} value={u.id}>{u.nombre}{u.activo ? "" : " (inactivo)"}</option>)}
            </optgroup>
          )}
          {otras.length > 0 && (
            <optgroup label="De otras facultades">
              {otras.map((u) => <option key={u.id} value={u.id}>{u.nombre}{u.activo ? "" : " (inactivo)"}</option>)}
            </optgroup>
          )}
        </select>
        <button
          type="button"
          disabled={!nuevo}
          onClick={() => {
            const u = usuario(Number(nuevo));
            // Sugerencia de carreras: las del usuario que se ofrecen en esta facultad
            const sugeridas = carrerasObligatorias && u ? u.carreraIds.filter((id) => carreras.some((c) => c.id === id)) : [];
            onChange([...lista, { usuarioId: Number(nuevo), carreras: sugeridas, activo: true }]);
            setNuevo("");
          }}
          className="shrink-0 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-900 text-white text-sm font-bold disabled:opacity-40"
        >
          Agregar
        </button>
        {deEsta.length > 1 && (
          <button
            type="button"
            onClick={() => onChange([...lista, ...deEsta.filter((u) => u.activo).map((u) => ({ usuarioId: u.id, carreras: [], activo: true }))])}
            className="shrink-0 px-3 py-2 rounded-lg border border-border text-sm font-bold text-gray-700 hover:border-brand-red hover:text-brand-red"
            title="Agrega todos los usuarios activos de esta facultad"
          >
            Agregar todos
          </button>
        )}
      </div>
    </div>
  );
}

export default function TarjetaFacultad({
  periodoId,
  facultad,
  admins,
  coordinadores,
  asesores,
  nombres,
  iniciada,
}: {
  periodoId: number;
  facultad: FacultadConfig;
  admins: UsuarioConfig[];
  coordinadores: UsuarioConfig[];
  asesores: UsuarioConfig[];
  nombres: Record<"usuarios" | "carreras", Record<number, string>>;
  iniciada: boolean;
}) {
  const inicial = facultad.config ?? configVacia();
  const [c, setC] = useState<ConfigFacultad>(inicial);
  const [abierta, setAbierta] = useState(!facultad.config);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const router = useRouter();

  const n: Nombres = useMemo(
    () => ({ usuario: (id) => nombres.usuarios[id] ?? `Usuario ${id}`, carrera: (id) => nombres.carreras[id] ?? `Carrera ${id}` }),
    [nombres],
  );
  const carrerasIds = facultad.carreras.map((x) => x.id);
  const { errores, avisos } = validarConfig(c, carrerasIds, n);
  const cambios = describirCambios(facultad.config, c, n);
  const sucio = !facultad.config || cambios.length > 0;
  const set = (cambio: Partial<ConfigFacultad>) => { setC((x) => ({ ...x, ...cambio })); setAviso(null); };

  const guardar = async (justificacion: string | null) => {
    setGuardando(true);
    setError(null);
    const res = await guardarConfiguracionFacultad(periodoId, facultad.id, c, justificacion);
    setGuardando(false);
    if (!res.success) {
      if (res.pideJustificacion) setPidiendo(true);
      setError(res.error);
      return;
    }
    setPidiendo(false);
    setAviso(res.sinCambios ? "No había cambios que guardar." : "Configuración guardada.");
    router.refresh();
  };

  const resumen = facultad.config
    ? [
        NOMBRE_ADMINISTRACION[facultad.config.administracion] + (facultad.config.adminFacultadId ? `: ${n.usuario(facultad.config.adminFacultadId)}` : ""),
        NOMBRE_COORDINACION[facultad.config.coordinacion],
        `${facultad.config.coordinadores.filter((p) => p.activo).length} coordinadores`,
        `${facultad.config.asesores.filter((p) => p.activo).length} asesores`,
      ].join(" · ")
    : "Sin configurar";

  const adminsEsta = admins.filter((u) => u.facultadId === facultad.id);
  const adminsOtras = admins.filter((u) => u.facultadId !== facultad.id);

  return (
    <section className={`bg-white rounded-xl border shadow-sm overflow-hidden ${facultad.config ? "border-border" : "border-amber-300"}`}>
      <button type="button" onClick={() => setAbierta(!abierta)} className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-gray-50">
        <div className="min-w-0">
          <h2 className="font-bold text-card-dark">{facultad.nombre}</h2>
          <p className={`text-xs mt-0.5 ${facultad.config ? "text-muted" : "text-amber-700 font-semibold"}`}>{resumen}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {facultad.config && sucio && <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold">Cambios sin guardar</span>}
          <span className="text-xs text-muted">{facultad.carreras.length} carreras</span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${abierta ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </button>

      {abierta && (
        <div className="border-t border-border p-5 space-y-6">
          {/* 1. Administración */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-red">1. Administración de la facultad</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Opcion activo={c.administracion === "central"} titulo="Administración central" ayuda="El superadministrador administra la facultad en esta cohorte." onClick={() => set({ administracion: "central", adminFacultadId: null, adminCoordina: false })} />
              <Opcion activo={c.administracion === "facultad"} titulo="Administrador de facultad" ayuda="Un usuario de la facultad administra sus propuestas y asignaciones." onClick={() => set({ administracion: "facultad" })} />
            </div>
            {c.administracion === "facultad" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                <select value={c.adminFacultadId ?? ""} onChange={(e) => set({ adminFacultadId: e.target.value ? Number(e.target.value) : null })} className={claseSelect}>
                  <option value="">Elige el administrador de facultad</option>
                  {adminsEsta.length > 0 && <optgroup label="De esta facultad">{adminsEsta.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}</optgroup>}
                  {adminsOtras.length > 0 && <optgroup label="De otras facultades">{adminsOtras.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}</optgroup>}
                </select>
                {admins.length === 0 && <p className="text-xs text-amber-700">No hay usuarios con rol de administrador de facultad. Créalos en Usuarios.</p>}
              </div>
            )}
          </div>

          {/* 2. Coordinación */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-red">2. Coordinación</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(["sin_coordinador", "general", "por_carrera"] as Coordinacion[]).map((m) => (
                <Opcion key={m} activo={c.coordinacion === m} titulo={NOMBRE_COORDINACION[m]} ayuda={AYUDA_COORDINACION[m]} onClick={() => set({ coordinacion: m, adminCoordina: m === "sin_coordinador" ? false : c.adminCoordina })} />
              ))}
            </div>
            {c.administracion === "facultad" && c.coordinacion !== "sin_coordinador" && (
              <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-gray-400">
                <input type="checkbox" checked={c.adminCoordina} onChange={(e) => set({ adminCoordina: e.target.checked })} className="mt-0.5 accent-[var(--brand-red)]" />
                <span>
                  <span className="block text-sm font-bold text-gray-800">El administrador de facultad también es coordinador</span>
                  <span className="block text-xs text-muted">
                    {c.coordinacion === "general" ? "Puede ser el único coordinador de la facultad." : "Coordina las carreras que no tengan otro coordinador."}
                  </span>
                </span>
              </label>
            )}
            {c.coordinacion !== "sin_coordinador" && (
              <ListaParticipantes
                titulo="Coordinadores"
                ayuda={c.coordinacion === "por_carrera" ? "Marca las carreras que atiende cada uno. Una carrera puede tener un solo coordinador." : "Atienden todas las carreras de la facultad."}
                lista={c.coordinadores}
                disponibles={coordinadores}
                facultadId={facultad.id}
                carreras={facultad.carreras}
                conCarreras={c.coordinacion === "por_carrera"}
                carrerasObligatorias
                onChange={(l) => set({ coordinadores: l })}
              />
            )}
          </div>

          {/* 3. Asesores */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-red">3. Asesores que participan</p>
            <ListaParticipantes
              titulo="Asesores"
              ayuda="Solo estos asesores podrán recibir propuestas de esta facultad en la cohorte. Las carreras son opcionales."
              lista={c.asesores}
              disponibles={asesores}
              facultadId={facultad.id}
              carreras={facultad.carreras}
              conCarreras
              carrerasObligatorias={false}
              onChange={(l) => set({ asesores: l })}
            />
          </div>

          {(errores.length > 0 || avisos.length > 0) && (
            <div className="space-y-2">
              {errores.map((e, i) => <p key={`e${i}`} className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{e}</p>)}
              {avisos.map((a, i) => <p key={`a${i}`} className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{a}</p>)}
            </div>
          )}
          {error && !pidiendo && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
            <p className="text-xs text-muted">
              {aviso ?? (iniciada ? "La cohorte ya inició: al guardar se pedirá una justificación." : "La cohorte aún no inicia: los cambios se guardan sin justificación.")}
            </p>
            <div className="flex gap-2">
              {facultad.config && sucio && (
                <button type="button" onClick={() => { setC(inicial); setError(null); }} disabled={guardando} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100">
                  Descartar
                </button>
              )}
              <button
                type="button"
                disabled={guardando || errores.length > 0 || !sucio}
                onClick={() => (iniciada ? setPidiendo(true) : guardar(null))}
                className="px-5 py-2 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white text-sm font-bold disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar facultad"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pidiendo && (
        <DialogoJustificacion
          titulo={facultad.nombre}
          cambios={cambios}
          guardando={guardando}
          error={error}
          onConfirmar={(j) => guardar(j)}
          onCancelar={() => { setPidiendo(false); setError(null); }}
        />
      )}
    </section>
  );
}
