// Cuerpo del informe final según la estructura oficial: autoridades, agradecimientos, índices de contenidos y de imágenes,
// introducción, descripción de la empresa, actividades en orden cronológico, conclusiones y anexos. La portada la muestra la
// página antes de este componente.
import type { InformeCompilado } from "@/lib/informeWord";
import { rangoFechasTexto } from "@/lib/periodosPasantia";
import { APARTADOS_FINAL, anexosFinal, tituloActividadFinal } from "@/lib/informeFinal";
import {
  ImagenesDocumento,
  MarcoTeorico,
  ParrafosCuerpo,
  Segmentos,
  TablaCronogramaEjecutado,
  TablaCronogramaReal,
  TablaModificaciones,
} from "./BloquesActividad";

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
    { id: "introduccion", texto: APARTADOS_FINAL.introduccion, nivel: 1 },
    { id: "empresa", texto: APARTADOS_FINAL.empresa, nivel: 1 },
    { id: "actividades", texto: APARTADOS_FINAL.actividades, nivel: 1 },
    ...d.secciones.flatMap((s) => [
      { id: `periodo-${s.numero}`, texto: tituloPeriodo(s), nivel: 2 as const },
      ...actividades
        .filter((a) => a.periodo === s.numero)
        .map((a) => ({ id: idActividad(a.codigo), texto: `${a.codigo}. ${a.titulo}`, nivel: 3 as const })),
    ]),
    { id: "conclusiones", texto: APARTADOS_FINAL.conclusiones, nivel: 1 },
  ];

  // Índice de imágenes: las ilustraciones de la empresa y las imágenes de cada actividad (1.1.1.A, 1.1.1.B).
  const indiceImagenes = [
    ...f.empresa.ilustraciones.map((il) => ({ id: `ilustracion-${il.tipo}`, texto: `${il.etiqueta} ${il.leyenda}` })),
    ...actividades.flatMap((a) =>
      (d.imagenesPorActividad[a.id] ?? []).map((img) => ({ id: `imagen-${img.etiqueta.replace(/\./g, "-")}`, texto: `${img.etiqueta} ${img.leyenda}` }))
    ),
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

      {/* ────────────── Índice de imágenes, fotografías e ilustraciones ────────────── */}
      <section className="doc-salto">
        <h2 className="doc-titulo-seccion doc-capitulo">{APARTADOS_FINAL.indiceImagenes}</h2>
        {indiceImagenes.length === 0 ? (
          <p>El informe no contiene imágenes.</p>
        ) : (
          <ul className="doc-indice">
            {indiceImagenes.map((e) => (
              <li key={e.id} className="doc-indice-2" style={{ paddingLeft: 0 }}>
                <a href={`#${e.id}`}>{e.texto}</a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ────────────── Introducción: cuatro párrafos redactados por el egresado ────────────── */}
      <section className="doc-salto">
        <h2 id="introduccion" className="doc-titulo-seccion doc-capitulo">
          {APARTADOS_FINAL.introduccion}
        </h2>
        {f.introduccion.some((p) => p.trim()) ? (
          <ParrafosCuerpo texto={f.introduccion.filter((p) => p.trim()).join("\n")} />
        ) : (
          <p className="doc-parrafo">
            <em>Pendiente: el egresado debe redactar la introducción.</em>
          </p>
        )}
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
            {f.empresa.direccion ? ` Dirección: ${f.empresa.direccion.replace(/\.+$/, "")}.` : ""}
            {f.empresa.sucursal
              ? ` Sucursal: ${f.empresa.sucursal.nombre}${f.empresa.sucursal.telefono ? `, teléfono ${f.empresa.sucursal.telefono}` : ""}.`
              : ""}
          </p>
        )}
        <p className="doc-subtitulo-2">Descripción</p>
        {f.empresa.descripcion.length > 0 ? (
          <ParrafosCuerpo texto={f.empresa.descripcion.join("\n")} />
        ) : (
          <p className="doc-parrafo">
            <em>La empresa no tiene descripción registrada en el sistema.</em>
          </p>
        )}
        {f.empresa.antecedentes.length > 0 && (
          <>
            <p className="doc-subtitulo-2">Antecedentes</p>
            <ParrafosCuerpo texto={f.empresa.antecedentes.join("\n")} />
          </>
        )}
        {f.empresa.ilustraciones.map((il) => (
          <div key={il.tipo}>
            <p className="doc-subtitulo-2">{il.tipo === "mapa" ? "Ubicación" : "Organigrama"}</p>
            <figure id={`ilustracion-${il.tipo}`} style={{ margin: "6pt 0", pageBreakInside: "avoid" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={il.tipo === "mapa" ? `/api/map?coords=${f.empresa.coordenadas}` : f.empresa.organigrama!.url}
                alt={il.leyenda}
                style={{ width: "100%", maxHeight: il.tipo === "mapa" ? "8cm" : "17cm", objectFit: "contain", display: "block", margin: "0 auto" }}
              />
              <figcaption className="doc-leyenda">
                <span className="doc-pie">
                  {il.etiqueta}. {il.leyenda}.
                </span>
                <span className="doc-nota">{il.nota}</span>
              </figcaption>
            </figure>
          </div>
        ))}
        {f.empresa.organigrama && !f.empresa.organigrama.esImagen && (
          <p className="doc-parrafo">
            <em>El organigrama de la empresa se registró como documento PDF en la propuesta y puede consultarse en el sistema.</em>
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
                            <MarcoTeorico texto={r.marcoTeorico} citaApa={r.citaApa} citaApaDatos={r.citaApaDatos} />
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
                            <p className="doc-subtitulo-2">{imagenes.length > 1 ? "Imágenes de soporte de la actividad" : "Imagen de soporte de la actividad"}</p>
                            <ImagenesDocumento imagenes={imagenes} />
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
              <p className="doc-subtitulo-2">
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

        {anexosFinal(f.glosario.length > 0).map((anexo, i) => (
          <div key={anexo.id}>
            <h3 id={`anexo-${anexo.id}`} className={`doc-subtitulo-1${i > 0 ? " doc-salto" : ""}`}>
              {anexo.titulo}
            </h3>
            {anexo.id === "cronogramaReal" && (
              <>
                <p style={{ textAlign: "justify" }}>
                  Cronograma de las actividades de la pasantía con el estado final de cada una y los cambios aprobados al cronograma
                  original (actividades agregadas, pospuestas, reubicadas y eliminadas).
                </p>
                {f.cronograma.map((p) => (
                  <TablaCronogramaReal key={p.numero} periodo={p} />
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
              </>
            )}
            {anexo.id === "modificaciones" &&
              (f.modificaciones.length === 0 ? (
                <p>El cronograma original no tuvo modificaciones durante la pasantía.</p>
              ) : (
                <>
                  <p style={{ textAlign: "justify" }}>
                    Registro cronológico de las modificaciones al cronograma original autorizadas durante la pasantía, con su
                    justificación y su validación.
                  </p>
                  <TablaModificaciones modificaciones={f.modificaciones} />
                </>
              ))}
            {anexo.id === "cronogramaFinal" && (
              <>
                <p style={{ textAlign: "justify" }}>
                  Cronograma con las actividades que finalmente se ejecutaron, en la ubicación definitiva de cada una.
                </p>
                {f.cronograma.map((p) => (
                  <TablaCronogramaEjecutado key={p.numero} periodo={p} />
                ))}
              </>
            )}
            {anexo.id === "adicional" &&
              (f.anexos.length === 0 ? <p>No se adjuntó contenido adicional.</p> : <ImagenesDocumento imagenes={f.anexos} />)}
            {anexo.id === "bibliografia" &&
              (f.bibliografia.length === 0 ? (
                <p>No se registraron referencias.</p>
              ) : (
                f.bibliografia.map((referencia, k) => (
                  <p key={k} className="doc-referencia">
                    <Segmentos segmentos={referencia} />
                  </p>
                ))
              ))}
            {anexo.id === "glosario" &&
              f.glosario.map((t) => (
                <p key={t.termino} className="doc-parrafo">
                  <strong>{t.termino}:</strong> {t.definicion}
                </p>
              ))}
            {anexo.id === "carta" &&
              (f.carta ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.carta.url} alt={f.carta.nombre} style={{ width: "100%", maxHeight: "21cm", objectFit: "contain", display: "block" }} />
              ) : (
                <p>
                  <em>Pendiente: el egresado debe adjuntar la carta de finalización satisfactoria emitida por la empresa.</em>
                </p>
              ))}
          </div>
        ))}
      </section>
    </>
  );
}

function tituloPeriodo(s: InformeCompilado["secciones"][number]) {
  return `Período ${s.numero}${s.inicio && s.fin ? ` (${rangoFechasTexto(s.inicio, s.fin)})` : ""}`;
}
