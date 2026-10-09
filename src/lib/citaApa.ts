// Referencia en formato APA 7 (adaptación al español) construida a partir de campos. Módulo puro: servidor y cliente.

export type TipoFuente = "libro" | "articulo" | "web";

export const TIPOS_FUENTE: { id: TipoFuente; label: string }[] = [
  { id: "libro", label: "Libro" },
  { id: "articulo", label: "Artículo de revista" },
  { id: "web", label: "Página web" },
];

export const MAX_AUTORES_CITA = 20;

export interface AutorCita {
  apellidos: string;
  iniciales: string;
}

export interface DatosCitaApa {
  tipo: TipoFuente;
  /** Autor institucional (organización); se usa cuando no hay autores personales. */
  autorInstitucional: string;
  autores: AutorCita[];
  anio: string;
  titulo: string;
  edicion: string;
  editorial: string;
  revista: string;
  volumen: string;
  numero: string;
  paginas: string;
  sitio: string;
  url: string;
}

export interface SegmentoCita {
  texto: string;
  cursiva?: boolean;
}

export function datosCitaVacios(tipo: TipoFuente = "libro"): DatosCitaApa {
  return {
    tipo,
    autorInstitucional: "",
    autores: [{ apellidos: "", iniciales: "" }],
    anio: "",
    titulo: "",
    edicion: "",
    editorial: "",
    revista: "",
    volumen: "",
    numero: "",
    paginas: "",
    sitio: "",
    url: "",
  };
}

/** Lee los datos guardados (jsonb) y completa los campos faltantes; null si no hay datos válidos. */
export function leerDatosCita(valor: unknown): DatosCitaApa | null {
  if (!valor || typeof valor !== "object") return null;
  const v = valor as Partial<DatosCitaApa>;
  if (!TIPOS_FUENTE.some((t) => t.id === v.tipo)) return null;
  const base = datosCitaVacios(v.tipo);
  const texto = (x: unknown) => (typeof x === "string" ? x : "");
  return {
    ...base,
    autorInstitucional: texto(v.autorInstitucional),
    autores: Array.isArray(v.autores)
      ? v.autores.slice(0, MAX_AUTORES_CITA).map((a) => ({ apellidos: texto(a?.apellidos), iniciales: texto(a?.iniciales) }))
      : base.autores,
    anio: texto(v.anio),
    titulo: texto(v.titulo),
    edicion: texto(v.edicion),
    editorial: texto(v.editorial),
    revista: texto(v.revista),
    volumen: texto(v.volumen),
    numero: texto(v.numero),
    paginas: texto(v.paginas),
    sitio: texto(v.sitio),
    url: texto(v.url),
  };
}

/** "r s", "RS", "R.S." → "R. S." */
export function formatearIniciales(entrada: string) {
  const letras = entrada.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, "");
  return letras
    .toUpperCase()
    .split("")
    .map((l) => `${l}.`)
    .join(" ");
}

const limpiar = (s: string) => s.trim().replace(/\s+/g, " ");
const sinPuntoFinal = (s: string) => limpiar(s).replace(/[.\s]+$/, "");

function autoresTexto(d: DatosCitaApa) {
  const personas = d.autores
    .map((a) => ({ apellidos: limpiar(a.apellidos), iniciales: formatearIniciales(a.iniciales) }))
    .filter((a) => a.apellidos);
  // El autor institucional cierra con punto, como las iniciales: "Organización Mundial de la Salud. (2020)."
  if (personas.length === 0) return d.autorInstitucional.trim() ? `${sinPuntoFinal(d.autorInstitucional)}.` : "";
  const nombres = personas.map((a) => (a.iniciales ? `${a.apellidos}, ${a.iniciales}` : a.apellidos));
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(", ")}, y ${nombres[nombres.length - 1]}`;
}

/** Referencia dividida en segmentos para conservar las cursivas (título del libro o de la página, revista y volumen). */
export function segmentosCitaApa(d: DatosCitaApa): SegmentoCita[] {
  const autores = autoresTexto(d);
  const anio = limpiar(d.anio) || "s.f.";
  const inicio = `${autores} (${anio}). `.trimStart();
  const titulo = sinPuntoFinal(d.titulo);
  const url = limpiar(d.url);

  if (d.tipo === "articulo") {
    const numero = limpiar(d.numero);
    const paginas = limpiar(d.paginas).replace(/-/g, "–");
    return [
      { texto: `${inicio}${titulo}. ` },
      { texto: `${sinPuntoFinal(d.revista)}, ${limpiar(d.volumen)}`, cursiva: true },
      { texto: `${numero ? `(${numero})` : ""}${paginas ? `, ${paginas}` : ""}.${url ? ` ${url}` : ""}` },
    ];
  }

  // Los elementos vacíos se omiten para que la vista previa no muestre puntos sueltos mientras se completan los campos.
  if (d.tipo === "web") {
    const sitio = sinPuntoFinal(d.sitio);
    return [
      { texto: inicio },
      { texto: titulo, cursiva: true },
      { texto: `${titulo ? "." : ""}${sitio && sitio !== autores ? ` ${sitio}.` : ""}${url ? ` ${url}` : ""}` },
    ].filter((s) => s.texto);
  }

  const edicion = limpiar(d.edicion);
  const editorial = sinPuntoFinal(d.editorial);
  const textoEdicion = edicion && edicion !== "1" ? ` (${edicion}.ª ed.)` : "";
  return [
    { texto: inicio },
    { texto: titulo, cursiva: true },
    { texto: `${textoEdicion}${titulo || textoEdicion ? "." : ""}${editorial ? ` ${editorial}.` : ""}` },
  ].filter((s) => s.texto);
}

export function textoCitaApa(d: DatosCitaApa) {
  return segmentosCitaApa(d)
    .map((s) => s.texto)
    .join("");
}

const RE_APELLIDOS = /^[A-ZÁÉÍÓÚÑÜ][A-Za-zÁÉÍÓÚÑÜáéíóúñü'’ -]*$/;
const RE_URL = /^https?:\/\/[^\s]+\.[^\s]+$/;

/** Reglas del formato APA 7 por tipo de fuente; devuelve la lista de problemas (vacía si la referencia es válida). */
export function validarCitaApa(d: DatosCitaApa): string[] {
  const problemas: string[] = [];
  const personas = d.autores.filter((a) => a.apellidos.trim() || a.iniciales.trim());
  if (personas.length === 0 && !d.autorInstitucional.trim()) {
    problemas.push("Indique al menos un autor o el autor institucional.");
  }
  personas.forEach((a, i) => {
    const n = personas.length > 1 ? ` ${i + 1}` : "";
    if (!a.apellidos.trim()) problemas.push(`Autor${n}: falta el apellido.`);
    else if (!RE_APELLIDOS.test(limpiar(a.apellidos))) problemas.push(`Autor${n}: el apellido debe iniciar con mayúscula y contener solo letras.`);
    if (!formatearIniciales(a.iniciales)) problemas.push(`Autor${n}: faltan las iniciales del nombre.`);
  });

  const anio = limpiar(d.anio);
  const anioActual = new Date().getFullYear();
  if (!/^(\d{4}|s\.f\.)$/.test(anio)) problemas.push('El año debe tener 4 dígitos (o "s.f." si no tiene fecha).');
  else if (anio !== "s.f." && (Number(anio) < 1500 || Number(anio) > anioActual)) problemas.push(`El año debe estar entre 1500 y ${anioActual}.`);

  if (sinPuntoFinal(d.titulo).length < 3) problemas.push("Indique el título de la obra.");

  const url = limpiar(d.url);
  if (d.tipo === "libro") {
    if (d.edicion.trim() && !/^\d{1,2}$/.test(d.edicion.trim())) problemas.push("La edición debe ser un número (por ejemplo, 7).");
    if (!d.editorial.trim()) problemas.push("Indique la editorial.");
  } else if (d.tipo === "articulo") {
    if (!d.revista.trim()) problemas.push("Indique el nombre de la revista.");
    if (!/^\d+$/.test(d.volumen.trim())) problemas.push("El volumen de la revista debe ser un número.");
    if (d.numero.trim() && !/^\d+$/.test(d.numero.trim())) problemas.push("El número de la revista debe ser un número.");
    if (!/^\d+([-–]\d+)?$/.test(d.paginas.trim())) problemas.push("Indique las páginas del artículo (por ejemplo, 45-60).");
    if (url && !RE_URL.test(url)) problemas.push("El DOI o URL debe iniciar con https:// (por ejemplo, https://doi.org/...).");
  } else {
    if (!RE_URL.test(url)) problemas.push("Indique la URL de la página (debe iniciar con https://).");
  }
  return problemas;
}
