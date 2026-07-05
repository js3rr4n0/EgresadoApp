import { db } from "../src/lib/db";
import { carreras, facultades } from "../src/lib/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Updating facultades...");
  await db.update(facultades).set({ codigo: "FING" }).where(eq(facultades.nombre, "Ingeniería y Arquitectura"));
  await db.update(facultades).set({ codigo: "FCS" }).where(eq(facultades.nombre, "Ciencias de la Salud"));
  await db.update(facultades).set({ codigo: "FCE" }).where(eq(facultades.nombre, "Ciencias Empresariales"));
  await db.update(facultades).set({ codigo: "FCH" }).where(eq(facultades.nombre, "Ciencias y Humanidades"));

  console.log("Updating carreras...");
  await db.update(carreras).set({ codigo: "IINF" }).where(eq(carreras.nombre, "Ingeniería Informática y de Videojuegos"));
  await db.update(carreras).set({ codigo: "ICIV" }).where(eq(carreras.nombre, "Ingeniería Civil"));
  await db.update(carreras).set({ codigo: "IIND" }).where(eq(carreras.nombre, "Ingeniería Industrial"));
  await db.update(carreras).set({ codigo: "MED" }).where(eq(carreras.nombre, "Doctorado en Medicina"));
  await db.update(carreras).set({ codigo: "ENF" }).where(eq(carreras.nombre, "Licenciatura en Enfermería"));
  await db.update(carreras).set({ codigo: "ADM" }).where(eq(carreras.nombre, "Licenciatura en Administración de Empresas"));
  await db.update(carreras).set({ codigo: "MKT" }).where(eq(carreras.nombre, "Licenciatura en Mercadeo"));

  console.log("Done.");
}

main().catch(console.error);
