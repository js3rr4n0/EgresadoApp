"use client";
// Firmantes y supervisor de la carta de aceptación (R5). Componente controlado: el estado vive en CartaProyectoForm,
// que guarda la carta y luego esto con `guardarPersonasCarta`.

import { useState } from "react";
import { fechaCortaSV } from "@/lib/fechasTexto";
import { MAX_FIRMANTES, MIN_MOTIVO, revisarPersona, type EntradaPersonasCarta, type EstadoSolicitudCarta, type PersonaNueva } from "@/lib/personasCarta";
import type { OpcionPersona } from "@/lib/personasCartaServidor";

const VACIA: PersonaNueva = { nombreCompleto: "", titulo: "", cargo: "", correo: "", telefono: "" };
const campo = "w-full px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75";
const etiqueta = "block text-xs font-bold text-card-dark mb-1";

/** Formulario de una persona nueva: nombre completo, título, cargo, correo y teléfono. */
function FormPersona({ valor, onChange, prefijo }: { valor: PersonaNueva; onChange: (p: PersonaNueva) => void; prefijo: string }) {
  const set = (k: keyof PersonaNueva) => (ev: React.ChangeEvent<HTMLInputElement>) => onChange({ ...valor, [k]: ev.target.value });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <label htmlFor={`${prefijo}-nombre`} className={etiqueta}>Nombre completo</label>
        <input id={`${prefijo}-nombre`} className={campo} value={valor.nombreCompleto} onChange={set("nombreCompleto")} placeholder="Ej: Carlos Alberto Mendoza Reyes" />
      </div>
      <div>
        <label htmlFor={`${prefijo}-titulo`} className={etiqueta}>Título</label>
        <input id={`${prefijo}-titulo`} className={campo} value={valor.titulo} onChange={set("titulo")} placeholder="Ej: Ingeniero, Licenciada, Máster" />
      </div>
      <div>
        <label htmlFor={`${prefijo}-cargo`} className={etiqueta}>Cargo</label>
        <input id={`${prefijo}-cargo`} className={campo} value={valor.cargo} onChange={set("cargo")} placeholder="Ej: Gerente de operaciones" />
      </div>
      <div>
        <label htmlFor={`${prefijo}-correo`} className={etiqueta}>Correo</label>
        <input id={`${prefijo}-correo`} type="email" className={campo} value={valor.correo} onChange={set("correo")} placeholder="nombre@empresa.com" />
      </div>
      <div>
        <label htmlFor={`${prefijo}-telefono`} className={etiqueta}>Teléfono</label>
        <input id={`${prefijo}-telefono`} className={campo} value={valor.telefono} onChange={set("telefono")} placeholder="Ej: 2440-0000" />
      </div>
    </div>
  );
}

/** Tarjeta de una persona nueva ya agregada (va en la solicitud). */
function TarjetaNueva({ p, onQuitar, disabled }: { p: PersonaNueva; onQuitar: () => void; disabled: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <div className="text-sm">
        <p className="font-bold text-card-dark">{[p.titulo, p.nombreCompleto].filter(Boolean).join(" ")}</p>
        <p className="text-xs text-gray-700">{p.cargo} · {p.correo} · {p.telefono}</p>
        <p className="text-[11px] font-semibold text-amber-800 mt-0.5">Nuevo: lo valida la administración</p>
      </div>
      {!disabled && (
        <button type="button" onClick={onQuitar} className="text-xs font-bold text-gray-500 hover:text-brand-red shrink-0">Quitar</button>
      )}
    </div>
  );
}

const describir = (o: OpcionPersona) => [o.cargo, o.correo, o.telefono].filter(Boolean).join(" · ");

export default function PersonasCarta({
  firmantes,
  supervisores,
  valor,
  onChange,
  ultima,
  disabled,
}: {
  firmantes: OpcionPersona[];
  supervisores: OpcionPersona[];
  valor: EntradaPersonasCarta;
  onChange: (v: EntradaPersonasCarta) => void;
  ultima: EstadoSolicitudCarta | null;
  disabled: boolean;
}) {
  const [nuevoFirmante, setNuevoFirmante] = useState<PersonaNueva | null>(null);
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null);
  const total = valor.firmanteIds.length + valor.firmantesNuevos.length;
  const modoSupervisor = valor.sinSupervisor ? "sin" : valor.supervisorNuevo ? "nuevo" : valor.supervisorId != null ? String(valor.supervisorId) : "";

  const alternarFirmante = (id: number) =>
    onChange({ ...valor, firmanteIds: valor.firmanteIds.includes(id) ? valor.firmanteIds.filter((x) => x !== id) : [...valor.firmanteIds, id] });

  const agregarFirmante = () => {
    if (!nuevoFirmante) return;
    const r = revisarPersona(nuevoFirmante, "Firmante nuevo");
    if (r) return setErrorNuevo(r);
    onChange({ ...valor, firmantesNuevos: [...valor.firmantesNuevos, nuevoFirmante] });
    setNuevoFirmante(null);
    setErrorNuevo(null);
  };

  const elegirSupervisor = (v: string) => {
    if (v === "sin") onChange({ ...valor, supervisorId: null, supervisorNuevo: null, sinSupervisor: true });
    else if (v === "nuevo") onChange({ ...valor, supervisorId: null, supervisorNuevo: valor.supervisorNuevo ?? VACIA, sinSupervisor: false });
    else onChange({ ...valor, supervisorId: v ? Number(v) : null, supervisorNuevo: null, sinSupervisor: false });
  };

  return (
    <div className="space-y-6">
      {/* Estado de la solicitud a la administración */}
      {ultima?.estado === "pendiente" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-bold">Solicitud en revisión de la administración</p>
          <p className="text-xs mt-0.5">
            Enviada el {ultima.fecha ? fechaCortaSV(ultima.fecha) : "—"}. Puedes seguir redactando, pero la propuesta no se podrá enviar hasta que la
            administración la apruebe. Si cambias algo y guardas, la solicitud se actualiza.
          </p>
        </div>
      )}
      {ultima?.estado === "rechazada" && (
        <div className="rounded-xl border border-brand-red/30 bg-red-50 px-4 py-3 text-sm text-brand-red">
          <p className="font-bold">La administración rechazó la última solicitud</p>
          <p className="text-xs mt-0.5 text-gray-800">Motivo: {ultima.motivoRechazo || "sin motivo"}. Corrige y vuelve a guardar.</p>
        </div>
      )}

      {/* Firmantes */}
      <section className="rounded-xl border border-border overflow-hidden">
        <header className="px-4 py-3 bg-gray-50 border-b border-border">
          <h3 className="font-bold text-card-dark text-sm">Firmantes de la carta <span className="text-red-500">*</span></h3>
          <p className="text-xs text-muted">Quienes firman la carta por la empresa. Elige de 1 a {MAX_FIRMANTES}.</p>
        </header>
        <div className="p-4 space-y-3">
          {firmantes.length === 0 ? (
            <p className="text-sm text-muted">La empresa todavía no tiene firmantes registrados. Agrégalos abajo.</p>
          ) : (
            <ul className="space-y-2">
              {firmantes.map((f) => {
                const marcado = valor.firmanteIds.includes(f.id);
                return (
                  <li key={f.id}>
                    <label className={`flex items-start gap-3 rounded-lg border px-3 py-2 cursor-pointer ${marcado ? "border-brand-red bg-red-50/40" : "border-border hover:bg-gray-50"}`}>
                      <input type="checkbox" className="mt-1 accent-brand-red" checked={marcado} disabled={disabled || (!marcado && total >= MAX_FIRMANTES)} onChange={() => alternarFirmante(f.id)} />
                      <span className="text-sm">
                        <span className="font-bold text-card-dark">{f.nombre}</span>
                        <span className="block text-xs text-gray-600">{describir(f)}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {valor.firmantesNuevos.map((p, i) => (
            <TarjetaNueva key={i} p={p} disabled={disabled} onQuitar={() => onChange({ ...valor, firmantesNuevos: valor.firmantesNuevos.filter((_, j) => j !== i) })} />
          ))}
          {!disabled && (nuevoFirmante ? (
            <div className="rounded-lg border border-border bg-gray-50 p-3 space-y-3">
              <p className="text-xs font-bold text-card-dark">Firmante que no está en la lista</p>
              <FormPersona valor={nuevoFirmante} onChange={setNuevoFirmante} prefijo="firmante-nuevo" />
              {errorNuevo && <p className="text-xs font-semibold text-brand-red">{errorNuevo}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setNuevoFirmante(null); setErrorNuevo(null); }} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-card-dark">Cancelar</button>
                <button type="button" onClick={agregarFirmante} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold">Agregar firmante</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setNuevoFirmante(VACIA)} disabled={total >= MAX_FIRMANTES}
              className="text-xs font-bold text-brand-red hover:underline disabled:text-gray-400 disabled:no-underline">
              + El firmante no está en la lista
            </button>
          ))}
        </div>
      </section>

      {/* Supervisor */}
      <section className="rounded-xl border border-border overflow-hidden">
        <header className="px-4 py-3 bg-gray-50 border-b border-border">
          <h3 className="font-bold text-card-dark text-sm">Supervisor empresarial <span className="text-red-500">*</span></h3>
          <p className="text-xs text-muted">Quien da seguimiento al trabajo dentro de la empresa.</p>
        </header>
        <div className="p-4 space-y-3">
          <label htmlFor="supervisor-carta" className="sr-only">Supervisor empresarial</label>
          <select id="supervisor-carta" className={campo} value={modoSupervisor} disabled={disabled} onChange={(ev) => elegirSupervisor(ev.target.value)}>
            <option value="">Elige el supervisor…</option>
            {supervisores.length > 0 && (
              <optgroup label="Supervisores de la empresa">
                {supervisores.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}{s.cargo ? ` — ${s.cargo}` : ""}</option>
                ))}
              </optgroup>
            )}
            <optgroup label="Otras opciones">
              <option value="nuevo">El supervisor no está en la lista</option>
              <option value="sin">Sin supervisor empresarial</option>
            </optgroup>
          </select>
          {valor.supervisorId != null && (() => {
            const s = supervisores.find((x) => x.id === valor.supervisorId);
            return s ? <p className="text-xs text-gray-600">{describir(s)}</p> : null;
          })()}
          {valor.supervisorNuevo && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-3">
              <p className="text-xs text-amber-900">Se enviará a la administración junto con los firmantes nuevos; al aprobarse queda registrado en la empresa.</p>
              <FormPersona valor={valor.supervisorNuevo} onChange={(p) => onChange({ ...valor, supervisorNuevo: p })} prefijo="supervisor-nuevo" />
            </div>
          )}
          {valor.sinSupervisor && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
              <label htmlFor="motivo-sin-supervisor" className={etiqueta}>¿Por qué no hay supervisor empresarial?</label>
              <textarea id="motivo-sin-supervisor" rows={3} className={campo} disabled={disabled} value={valor.motivoSinSupervisor}
                onChange={(ev) => onChange({ ...valor, motivoSinSupervisor: ev.target.value })}
                placeholder="Ej: el trabajo no se realiza para una empresa; es una investigación con población abierta." />
              <p className="text-[11px] text-amber-900">
                Siempre se envía a la administración para que lo valide. Mínimo {MIN_MOTIVO} caracteres ({valor.motivoSinSupervisor.trim().length}).
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
