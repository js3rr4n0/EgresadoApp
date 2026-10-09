// Cuerpo del informe final según la estructura oficial: autoridades, agradecimientos, índice, descripción de la empresa,
// actividades en orden cronológico, conclusiones y anexos. La portada la muestra la página antes de este componente.
import type { InformeCompilado } from "@/lib/informeWord";
import { formatearFechaLarga, rangoFechasTexto } from "@/lib/periodosPasantia";
import { APARTADOS_FINAL, tituloActividadFinal } from "@/lib/informeFinal";
import { ImagenesDocumento, ParrafosCuerpo, Referencia } from "./BloquesActividad";

interface EntradaIndice {
  id: string;
  texto: string;
  nivel: 1 | 2 | 3;
}

export default function DocumentoFinal({ d }: { d: InformeCompilado }) {
  const f = d.documentoFinal!;
  const actividades = d.secciones.flatMap((seccion) =>
    seccion.semanas.flatMap((semana) =>
      semana.actividades.map((a) => ({
        ...a,
        encabezado: tituloActividadFinal(a.codigo, a.titulo, semana.inicio && semana.fin ? rangoFechasTexto(semana.inicio, semana.fin) : null),
      }))
    )
  );
  const idActividad = (codigo: string) => `actividad-${codigo.replace(/\./g, "-")}`;

  const indice: EntradaIndice[] = [
    ...(f.agradecimientos.length ? [{ id: "agradecimientos", texto: APARTADOS_FINAL.agradecimientos, nivel: 1 as const }] : []),
    { id: "empresa", texto: APARTADOS_FINAL.empresa, nivel: 1 },
    { id: "actividades", texto: APARTADOS_FINAL.actividades, nivel: 1 },
    ...d.secciones.flatMap((s) => [
      { id: `periodo-${s.numero}`, texto: tituloPeriodo(s), nivel: 2 as const },
      ...actividades.filter((a) => a.periodo === s.numero).map((a) => ({ id: idActividad(a.codigo), texto: a.encabezado, nivel: 3 as const })),
    ]),
    { id: "conclusiones", texto: APARTADOS_FINAL.conclusiones, nivel: 1 },
    { id: "anexos", texto: APARTADOS_FINAL.anexos, nivel: 1 },
    { id: "anexo-1", texto: APARTADOS_FINAL.cronograma, nivel: 2 },
    { id: "anexo-2", texto: APARTADOS_FINAL.modificaciones, nivel: 2 },
    { id: "anexo-3", texto: APARTADOS_FINAL.adicional, nivel: 2 },
    { id: "anexo-4", texto: APARTADOS_FINAL.carta, nivel: 2 },
  ];

  const supervisor = d.supervisor ? `${d.supervisor.nombres} ${d.supervisor.apellidos}` : "";

  return (
    <>
      {/* ────────────── Autoridades académicas ────────────── */}
      <div className="doc-portada">
        <div>
          {f.encabezado.map((linea) => (
            <p key={linea}>{linea}</p>
          ))}
          <p style={{ marginTop: "18pt" }}>{APARTADOS_FINAL.autoridades}</p>
        </div>
        {f.autoridades.map((a) => (
          <div key={a.cargo}>
            <p>{a.nombre}</p>
            <p>{a.cargo}</p>
          </div>
        ))}
        <p>{f.lugarFecha}</p>
      </div>

      {/* ────────────── Agradecimientos (opcional) ────────────── */}
      {f.agradecimientos.length > 0 && (
        <section className="doc-salto">
          <h2 id="agradecimientos" className="doc-titulo-seccion doc-capitulo">
            {APARTADOS_FINAL.agradecimientos}
          </h2>
          <ParrafosCuerpo texto={f.agradecimientos.join("\n")} />
        </section>
      )}

      {/* ────────────── Índice de contenidos ────────────── */}
      <section className="doc-salto">
        <h2 className="doc-titulo-seccion doc-capitulo">{APARTADOS_FINAL.indice}</h2>
        <p className="no-print doc-aviso">
          La numeración de páginas del índice se completa en el documento Word (al abrirlo, acepte actualizar los campos).
        </p>
        <ul className="doc-indice">
          {indice.map((e) => (
            <li key={e.id} className={`doc-indice-${e.nivel}`}>
              <a href={`#${e.id}`}>{e.texto}</a>
            </li>
          ))}
        </ul>
      </section>

      {/* ────────────── Descripción de la empresa ────────────── */}
      <section className="doc-salto">
        <h2 id="empresa" className="doc-titulo-seccion doc-capitulo">
          {APARTADOS_FINAL.empresa}
        </h2>
        {f.empresa.nombre && (
          <p className="doc-parrafo">
            <strong>{f.empresa.nombre}</strong>
            {f.empresa.area ? `, ${f.empresa.area}.` : "."}
            {f.empresa.direccion ? ` Dirección: ${f.empresa.direccion}` : ""}
          </p>
        )}
        {f.empresa.parrafos.length > 0 ? (
          <ParrafosCuerpo texto={f.empresa.parrafos.join("\n")} />
        ) : (
          <p className="doc-parrafo">
            <em>La empresa no tiene descripción registrada en el sistema.</em>
          </p>
        )}
      </section>

      {/* ────────────── Actividades realizadas, en orden cronológico ────────────── */}
      <section className="doc-salto">
        <h2 id="actividades" className="doc-titulo-seccion doc-capitulo">
          {APARTADOS_FINAL.actividades}
        </h2>
        {d.secciones.map((s) => (
          <div key={s.numero}>
            <h3 id={`periodo-${s.numero}`} className="doc-subtitulo-1">
              {tituloPeriodo(s)}
            </h3>
            {actividades
              .filter((a) => a.periodo === s.numero)
              .map((a) => {
                const r = a.registro;
                const imagenes = d.imagenesPorActividad[a.id] ?? [];
                return (
                  <div key={a.id}>
                    <h4 id={idActividad(a.codigo)} className="doc-subtitulo-1" style={{ breakAfter: "avoid" }}>
                      {a.encabezado}
                    </h4>
                    {!a.registrada || !r ? (
                      <p>
                        <em>Actividad no registrada a la fecha de generación.</em>
                      </p>
                    ) : (
                      <>
                        {r.marcoTeorico && (
                          <>
                            <p className="doc-subtitulo-2">Marco teórico</p>
                            <ParrafosCuerpo texto={r.marcoTeorico} />
                            {r.citaApa && <Referencia citaApa={r.citaApa} citaApaDatos={r.citaApaDatos} />}
                          </>
                        )}
                        {r.descriptor && (
                          <>
                            <p className="doc-subtitulo-2">Descripción</p>
                            <ParrafosCuerpo texto={r.descriptor} />
                          </>
                        )}
                        {imagenes.length > 0 && (
                          <>
                            <p className="doc-subtitulo-2">{imagenes.length > 1 ? "Imágenes" : "Imagen"}</p>
                            <ImagenesDocumento imagenes={imagenes} codigo={a.codigo} />
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </section>

      {/* ────────────── Conclusiones: la conclusión registrada en cada actividad ────────────── */}
      <section className="doc-salto">
        <h2 id="conclusiones" className="doc-titulo-seccion doc-capitulo">
          {APARTADOS_FINAL.conclusiones}
        </h2>
        {actividades
          .filter((a) => a.registrada && a.registro?.conclusionTecnica)
          .map((a) => (
            <div key={a.id}>
              <p className="doc-subtitulo-2" style={{ fontWeight: "bold" }}>
                Actividad {a.codigo}. {a.titulo}
              </p>
              <ParrafosCuerpo texto={a.registro!.conclusionTecnica} />
            </div>
          ))}
      </section>

      {/* ────────────── Anexos ────────────── */}
      <section className="doc-salto">
        <h2 id="anexos" className="doc-titulo-seccion doc-capitulo">
          {APARTADOS_FINAL.anexos}
        </h2>

        <h3 id="anexo-1" className="doc-subtitulo-1">
          {APARTADOS_FINAL.cronograma}
        </h3>
        <p style={{ textAlign: "justify" }}>
          Cronograma de las actividades desarrolladas durante la pasantía, con los cambios aprobados al cronograma original
          (actividades agregadas, modificadas, pospuestas, reubicadas y eliminadas).
        </p>
        {f.cronograma.map((p) => (
          <div key={p.numero} style={{ marginBottom: "10pt" }}>
            <table className="doc-tabla" style={{ fontSize: "10pt" }}>
              <thead>
                <tr style={{ background: "#d9d9d9" }}>
                  <th style={{ width: "10%" }}>Código</th>
                  <th style={{ textAlign: "left" }}>Actividades del período {p.numero}</th>
                  {Array.from({ length: p.semanas }, (_, i) => (
                    <th key={i} style={{ width: "6%" }}>
                      S{i + 1}
                    </th>
                  ))}
                  <th style={{ width: "22%" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {p.filas.map((fila) => (
                  <tr key={fila.id} style={fila.eliminada ? { color: "#595959", fontStyle: "italic" } : undefined}>
                    <td style={{ textAlign: "center" }}>{fila.codigo}</td>
                    <td style={fila.eliminada ? { textDecoration: "line-through" } : undefined}>{fila.titulo}</td>
                    {Array.from({ length: p.semanas }, (_, i) => (
                      <td key={i} style={i + 1 === fila.semana ? { background: fila.eliminada ? "#bfbfbf" : "#7f7f7f" } : undefined} />
                    ))}
                    <td>{fila.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {/* El cronograma real se imprime y lo firman las tres partes (no se aceptan firmas electrónicas). */}
        <div className="doc-firmas">
          {[
            { nombre: d.egresado?.nombreCompleto ?? "", cargo: "Pasante" },
            { nombre: supervisor, cargo: "Supervisor empresarial" },
            { nombre: d.asesor?.nombreCompleto ?? "", cargo: "Asesor designado" },
          ].map((firma) => (
            <div key={firma.cargo}>
              <div className="doc-linea-firma" />
              <p>{firma.nombre}</p>
              <p>
                <strong>{firma.cargo}</strong>
              </p>
            </div>
          ))}
        </div>

        <h3 id="anexo-2" className="doc-subtitulo-1 doc-salto">
          {APARTADOS_FINAL.modificaciones}
        </h3>
        {f.modificaciones.length === 0 ? (
          <p>El cronograma original no tuvo modificaciones durante la pasantía.</p>
        ) : (
          <table className="doc-tabla" style={{ fontSize: "10pt" }}>
            <thead>
              <tr style={{ background: "#d9d9d9" }}>
                <th style={{ width: "12%" }}>Fecha</th>
                <th style={{ width: "14%" }}>Modificación</th>
                <th style={{ width: "22%" }}>Actividad</th>
                <th>Justificación</th>
                <th style={{ width: "24%" }}>Validación</th>
              </tr>
            </thead>
            <tbody>
              {f.modificaciones.map((m) => (
                <tr key={m.id}>
                  <td>{m.fecha ? formatearFechaLarga(m.fecha) : "—"}</td>
                  <td>{m.tipo}</td>
                  <td>{m.actividad}</td>
                  <td style={{ textAlign: "justify" }}>{m.justificacion}</td>
                  <td>{m.validacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 id="anexo-3" className="doc-subtitulo-1 doc-salto">
          {APARTADOS_FINAL.adicional}
        </h3>
        {f.anexos.length === 0 ? <p>No se adjuntó contenido adicional.</p> : <ImagenesDocumento imagenes={f.anexos} />}

        <h3 id="anexo-4" className="doc-subtitulo-1 doc-salto">
          {APARTADOS_FINAL.carta}
        </h3>
        {f.carta ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.carta.url} alt={f.carta.nombre} style={{ width: "100%", maxHeight: "21cm", objectFit: "contain", display: "block" }} />
        ) : (
          <p>
            <em>Pendiente: el egresado debe adjuntar la carta de finalización satisfactoria emitida por la empresa.</em>
          </p>
        )}
      </section>
    </>
  );
}

function tituloPeriodo(s: InformeCompilado["secciones"][number]) {
  return `Período ${s.numero}${s.inicio && s.fin ? ` (${rangoFechasTexto(s.inicio, s.fin)})` : ""}`;
}
