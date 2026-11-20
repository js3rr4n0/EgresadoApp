// Facultades, carreras y título a otorgar de la UNICAES (datos del usuario, 20-nov-2026).
//   - Agrega carreras.titulo y la tabla carreras_sedes (otras sedes donde se ofrece una carrera), si no existen.
//   - Busca cada facultad y carrera por su nombre (sin tildes ni mayúsculas) o por un nombre anterior conocido, y la
//     actualiza (conserva su id: usuarios, fichas y propuestas siguen apuntando a ella). Si no existe, la crea.
//   - Las carreras que también se ofrecen en la Facultad Multidisciplinaria de Ilobasco NO se duplican: quedan en su
//     facultad y se registran como ofertadas en Ilobasco (carreras_sedes).
//   - Lo que ya existía y no está en la lista se desactiva (no se borra). Los usuarios de una facultad desactivada
//     pasan a la facultad de su carrera.
// Sin --aplicar solo muestra el plan. Solo base de desarrollo (o --confirmo-base-principal).
// Uso: npx tsx --env-file=.env.local scripts/cargar_facultades_carreras.ts [--aplicar]
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carreras, carrerasSedes, facultades, usuarios } from "../src/lib/schema";
import { exigirBaseDesarrollo } from "./fichas/guardia";

type Fac = { nombre: string; codigo: string; antes?: string[] };
type Car = { nombre: string; codigo: string; titulo: string; antes?: string[] };

const FACULTADES: (Fac & { carreras: Car[] })[] = [
  {
    nombre: "Facultad de Ciencias y Humanidades", codigo: "FCH",
    carreras: [
      { nombre: "Licenciatura en Ciencias Jurídicas", codigo: "LCJ", titulo: "Licenciado o Licenciada en Ciencias Jurídicas" },
      { nombre: "Licenciatura en Diseño Gráfico Publicitario", codigo: "LDGP", titulo: "Licenciado o Licenciada en Diseño Gráfico Publicitario", antes: ["Licenciatura en Diseño Gráfico"] },
      { nombre: "Licenciatura en Periodismo y Comunicación Audiovisual", codigo: "LPCA", titulo: "Licenciado o Licenciada en Periodismo y Comunicación Audiovisual" },
      { nombre: "Licenciatura en Idioma Inglés", codigo: "LII", titulo: "Licenciado o Licenciada en Idioma Inglés" },
      { nombre: "Licenciatura en Ciencias de la Educación con Especialidad en Idioma Inglés", codigo: "LCEI", titulo: "Licenciado o Licenciada en Ciencias de la Educación con Especialidad en Idioma Inglés" },
      { nombre: "Licenciatura en Ciencias de la Educación con Especialidad en Educación Básica", codigo: "LCEB", titulo: "Licenciado o Licenciada en Ciencias de la Educación con Especialidad en Educación Básica" },
      { nombre: "Licenciatura en Ciencias de la Educación con Especialidad en Matemática", codigo: "LCEM", titulo: "Licenciado o Licenciada en Ciencias de la Educación con Especialidad en Matemática" },
      { nombre: "Licenciatura en Ciencias Religiosas, Vicencianas y Pastorales", codigo: "LCR", titulo: "Licenciado en Ciencias Religiosas" },
    ],
  },
  {
    nombre: "Facultad de Ciencias de la Salud", codigo: "SAL", antes: ["Facultad de Medicina"],
    carreras: [
      { nombre: "Doctorado en Medicina", codigo: "MED", titulo: "Doctor o Doctora en Medicina" },
      { nombre: "Licenciatura en Nutrición y Dietética", codigo: "LND", titulo: "Licenciado o Licenciada en Nutrición y Dietética" },
      { nombre: "Licenciatura en Enfermería", codigo: "LENF", titulo: "Licenciado o Licenciada en Enfermería" },
      { nombre: "Licenciatura en Química y Farmacia", codigo: "LQF", titulo: "Licenciado o Licenciada en Química y Farmacia" },
      { nombre: "Técnico en Enfermería", codigo: "TENF", titulo: "Técnico o Técnica en Enfermería" },
    ],
  },
  {
    nombre: "Facultad de Ingeniería y Arquitectura", codigo: "ING", antes: ["Facultad de Ingeniería"],
    carreras: [
      { nombre: "Arquitectura", codigo: "ARQ", titulo: "Arquitecto o Arquitecta" },
      { nombre: "Ingeniería Agronómica", codigo: "AGRO", titulo: "Ingeniero o Ingeniera Agrónomo" },
      { nombre: "Ingeniería Civil", codigo: "CIVI", titulo: "Ingeniero o Ingeniera Civil" },
      { nombre: "Ingeniería en Tecnología y Procesamiento de Alimentos", codigo: "ALIM", titulo: "Ingeniero o Ingeniera en Tecnología y Procesamiento de Alimentos" },
      { nombre: "Ingeniería en Desarrollo de Software", codigo: "SOFT", titulo: "Ingeniero o Ingeniera en Desarrollo de Software" },
      { nombre: "Ingeniería en Telecomunicaciones y Redes", codigo: "TELE", titulo: "Ingeniero o Ingeniera en Telecomunicaciones y Redes" },
      { nombre: "Ingeniería Mecánica", codigo: "MECA", titulo: "Ingeniero o Ingeniera Mecánico" },
      { nombre: "Ingeniería en Sistemas Informáticos", codigo: "SIST", titulo: "Ingeniero o Ingeniera en Sistemas Informáticos", antes: ["Ingeniería en Sistemas"] },
      { nombre: "Ingeniería Industrial", codigo: "IND", titulo: "Ingeniero o Ingeniera Industrial" },
      { nombre: "Ingeniería Química", codigo: "QUIM", titulo: "Ingeniero o Ingeniera Químico" },
      { nombre: "Ingeniería Eléctrica", codigo: "ELEC", titulo: "Ingeniero o Ingeniera Eléctrico" },
      { nombre: "Técnico en Textiles", codigo: "TTEX", titulo: "Técnico o Técnica en Textiles" },
    ],
  },
  {
    nombre: "Facultad de Ciencias Empresariales", codigo: "EMP", antes: ["Facultad de Economía"],
    carreras: [
      { nombre: "Licenciatura en Administración de Empresas", codigo: "LAE", titulo: "Licenciado o Licenciada en Administración de Empresas", antes: ["Licenciatura en Administración"] },
      { nombre: "Licenciatura en Contaduría Pública", codigo: "LCP", titulo: "Licenciado o Licenciada en Contaduría Pública" },
      { nombre: "Licenciatura en Gestión y Desarrollo Turístico", codigo: "LGDT", titulo: "Licenciado o Licenciada en Gestión y Desarrollo Turístico" },
      { nombre: "Licenciatura en Mercadeo y Negocios Internacionales", codigo: "LMNI", titulo: "Licenciado o Licenciada en Mercadeo y Negocios Internacionales" },
      { nombre: "Licenciatura en Sistemas Informáticos Administrativos", codigo: "LSIA", titulo: "Licenciado o Licenciada en Sistemas Informáticos Administrativos" },
      { nombre: "Licenciatura en Gestión de Negocios Digitales", codigo: "LGND", titulo: "Licenciado o Licenciada en Gestión de Negocios Digitales" },
      { nombre: "Licenciatura en Relaciones Internacionales y Comercio Exterior", codigo: "LRICE", titulo: "Licenciado o Licenciada en Relaciones Internacionales y Comercio Exterior" },
      { nombre: "Licenciatura en Logística y Operaciones", codigo: "LLO", titulo: "Licenciado o Licenciada en Logística y Operaciones" },
      { nombre: "Licenciatura en Gastronomía y Hostelería", codigo: "LGH", titulo: "Licenciado o Licenciada en Gastronomía y Hostelería" },
      { nombre: "Técnico en Gestión de Ventas", codigo: "TGV", titulo: "Técnico o Técnica en Gestión de Ventas" },
    ],
  },
  {
    // Sede regional: sus carreras propias y las que también se ofrecen aquí (ILOBASCO_OFERTA), sin duplicarlas.
    nombre: "Facultad Multidisciplinaria de Ilobasco", codigo: "ILO",
    carreras: [
      { nombre: "Técnico en Lácteos y Cárnicos", codigo: "TLC", titulo: "Técnico en Lácteos y Cárnicos" },
      { nombre: "Técnico en Gestión y Desarrollo Turístico", codigo: "TGDT", titulo: "Técnico o Técnica en Gestión y Desarrollo Turístico" },
    ],
  },
];

/** Carreras de otras facultades que también se ofrecen en Ilobasco (no se duplican). */
const ILOBASCO_OFERTA = [
  "Ingeniería en Sistemas Informáticos",
  "Ingeniería en Desarrollo de Software",
  "Ingeniería en Tecnología y Procesamiento de Alimentos",
  "Licenciatura en Administración de Empresas",
  "Licenciatura en Mercadeo y Negocios Internacionales",
  "Licenciatura en Ciencias de la Educación con Especialidad en Idioma Inglés",
  "Licenciatura en Ciencias de la Educación con Especialidad en Matemática",
  "Licenciatura en Ciencias de la Educación con Especialidad en Educación Básica",
  "Licenciatura en Idioma Inglés",
];

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

async function run() {
  exigirBaseDesarrollo("cargar_facultades_carreras");
  const aplicar = process.argv.includes("--aplicar");

  // Estructura (idempotente).
  if (aplicar) {
    await db.execute(sql`ALTER TABLE "carreras" ADD COLUMN IF NOT EXISTS "titulo" varchar(255);`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "carreras_sedes" (
        "id" serial PRIMARY KEY NOT NULL,
        "carrera_id" integer NOT NULL REFERENCES "carreras"("id") ON DELETE CASCADE,
        "facultad_id" integer NOT NULL REFERENCES "facultades"("id") ON DELETE CASCADE,
        CONSTRAINT "carreras_sedes_unique" UNIQUE ("carrera_id", "facultad_id")
      );
    `);
  }

  const facs = await db.select().from(facultades);
  const cars = await db.select({ id: carreras.id, nombre: carreras.nombre, facultadId: carreras.facultadId, codigo: carreras.codigo, activo: carreras.activo }).from(carreras);
  const usadasF = new Set<number>();
  const usadasC = new Set<number>();
  const idFac = new Map<string, number>();
  const idCar = new Map<string, number>();
  const plan: string[] = [];

  for (const f of FACULTADES) {
    const nombres = [f.nombre, ...(f.antes ?? [])].map(norm);
    const existente = facs.find((x) => !usadasF.has(x.id) && nombres.includes(norm(x.nombre)));
    if (existente) {
      usadasF.add(existente.id);
      idFac.set(f.nombre, existente.id);
      const cambia = existente.nombre !== f.nombre || existente.codigo !== f.codigo || !existente.activo;
      plan.push(cambia ? `Facultad ${existente.id}: "${existente.nombre}" (${existente.codigo}) → "${f.nombre}" (${f.codigo})` : `Facultad ${existente.id}: "${f.nombre}" sin cambios`);
      if (aplicar && cambia) await db.update(facultades).set({ nombre: f.nombre, codigo: f.codigo, activo: true }).where(eq(facultades.id, existente.id));
    } else {
      plan.push(`Facultad nueva: "${f.nombre}" (${f.codigo})`);
      if (aplicar) {
        const [n] = await db.insert(facultades).values({ nombre: f.nombre, codigo: f.codigo }).returning({ id: facultades.id });
        idFac.set(f.nombre, n.id);
      }
    }
  }

  for (const f of FACULTADES) {
    for (const c of f.carreras) {
      const nombres = [c.nombre, ...(c.antes ?? [])].map(norm);
      const existente = cars.find((x) => !usadasC.has(x.id) && nombres.includes(norm(x.nombre)));
      const facultadId = idFac.get(f.nombre) ?? -1;
      if (existente) {
        usadasC.add(existente.id);
        idCar.set(c.nombre, existente.id);
        const mueve = existente.facultadId !== facultadId;
        plan.push(`  Carrera ${existente.id}: "${existente.nombre}" (${existente.codigo}) → "${c.nombre}" (${c.codigo})${mueve ? ` · pasa a ${f.nombre}` : ""} · título "${c.titulo}"`);
        if (aplicar) await db.update(carreras).set({ nombre: c.nombre, codigo: c.codigo, titulo: c.titulo, facultadId, activo: true }).where(eq(carreras.id, existente.id));
      } else {
        plan.push(`  Carrera nueva: "${c.nombre}" (${c.codigo}) en ${f.nombre} · título "${c.titulo}"`);
        if (aplicar) {
          const [n] = await db.insert(carreras).values({ nombre: c.nombre, codigo: c.codigo, titulo: c.titulo, facultadId }).returning({ id: carreras.id });
          idCar.set(c.nombre, n.id);
        }
      }
    }
  }

  // Ilobasco: las carreras que también se ofrecen ahí.
  const ilobasco = idFac.get("Facultad Multidisciplinaria de Ilobasco");
  for (const nombre of ILOBASCO_OFERTA) {
    plan.push(`  Ilobasco también ofrece: "${nombre}"`);
    const carreraId = idCar.get(nombre);
    if (aplicar && ilobasco && carreraId) await db.insert(carrerasSedes).values({ carreraId, facultadId: ilobasco }).onConflictDoNothing();
  }

  // Lo que sobra se desactiva; los usuarios de una facultad desactivada pasan a la facultad de su carrera.
  const sobranF = facs.filter((x) => !usadasF.has(x.id));
  const sobranC = cars.filter((x) => !usadasC.has(x.id));
  for (const x of sobranC) plan.push(`Se desactiva la carrera ${x.id}: "${x.nombre}"`);
  for (const x of sobranF) plan.push(`Se desactiva la facultad ${x.id}: "${x.nombre}"`);
  if (aplicar && sobranC.length) await db.update(carreras).set({ activo: false }).where(inArray(carreras.id, sobranC.map((x) => x.id)));
  if (aplicar && sobranF.length) {
    await db.update(facultades).set({ activo: false }).where(inArray(facultades.id, sobranF.map((x) => x.id)));
    const r = await db.execute(sql`
      UPDATE usuarios u SET facultad_id = c.facultad_id FROM carreras c
      WHERE u.carrera_id = c.id AND u.facultad_id IN (${sql.join(sobranF.map((x) => sql`${x.id}`), sql`, `)})`);
    plan.push(`Usuarios movidos a la facultad de su carrera: ${(r as { rowCount?: number }).rowCount ?? "?"}`);
  } else if (sobranF.length) {
    const n = await db.select({ id: usuarios.id }).from(usuarios).where(inArray(usuarios.facultadId, sobranF.map((x) => x.id)));
    plan.push(`Usuarios que pasarían a la facultad de su carrera: ${n.length}`);
  }

  console.log(plan.join("\n"));
  console.log(aplicar ? "\nHecho." : "\nSin cambios (agrega --aplicar para hacerlo).");
}

// Sin process.exit(0): en Windows, salir con conexiones abiertas puede abortar Node (UV_HANDLE_CLOSING).
run().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
