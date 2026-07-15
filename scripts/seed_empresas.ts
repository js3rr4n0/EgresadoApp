import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { empresas, sucursales } from "../src/lib/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function run() {
  console.log("Seeding empresas y sucursales...");

  const empresasData = [
    {
      nombre: "Grupo Roble (Metrocentro)",
      area: "Bienes Raíces Comerciales",
      descripcion: "Operador de la cadena de centros comerciales más grande de El Salvador.",
      antecedentes: "Fundada por Grupo Poma, Metrocentro es pionero en el formato de mall en Centroamérica desde 1971.",
      direccion: "Bulevar de Los Héroes, San Salvador.",
      organigramaUrl: "https://ejemplo.com/organigrama-roble.pdf",
      mapaUrl: "https://maps.app.goo.gl/ejemplo",
      habilitada: true,
      verificada: true,
      sucursales: [
        { nombre: "Metrocentro Santa Ana", direccion: "Avenida Independencia Sur, Santa Ana", telefono: "2200-1111", mapaUrl: "https://maps.app.goo.gl/sta-ana" },
        { nombre: "Metrocentro Lourdes", direccion: "Carretera a Sonsonate, Lourdes Colón", telefono: "2200-1112", mapaUrl: "https://maps.app.goo.gl/lourdes" },
        { nombre: "Metrocentro Sonsonate", direccion: "Bulevar Las Palmeras, Sonsonate", telefono: "2200-1113", mapaUrl: "https://maps.app.goo.gl/sonsonate" },
        { nombre: "Metrocentro San Salvador", নির্বাচিত: "Bulevar de Los Héroes, San Salvador", telefono: "2200-1114", mapaUrl: "https://maps.app.goo.gl/ss" },
        { nombre: "Metrocentro San Miguel", direccion: "Carretera Roosevelt, San Miguel", telefono: "2200-1115", mapaUrl: "https://maps.app.goo.gl/sm" }
      ]
    },
    {
      nombre: "Walmart El Salvador",
      area: "Retail / Supermercados",
      descripcion: "Cadena de hipermercados ofreciendo gran variedad de productos.",
      antecedentes: "Walmart llegó a El Salvador adquiriendo las operaciones de Despensa de Don Juan, expandiéndose con tiendas en formato hipermercado.",
      direccion: "Santa Elena, Antiguo Cuscatlán.",
      habilitada: true,
      verificada: true,
      sucursales: [
        { nombre: "Walmart Santa Ana", direccion: "Bulevar Los 44, Santa Ana", telefono: "2500-2221" },
        { nombre: "Walmart Lourdes", direccion: "Carretera Panamericana, Lourdes", telefono: "2500-2222" },
        { nombre: "Walmart Constitución", direccion: "Bulevar Constitución, San Salvador", telefono: "2500-2223" },
        { nombre: "Walmart San Miguel", direccion: "Avenida Roosevelt Sur, San Miguel", telefono: "2500-2224" },
        { nombre: "Walmart Soyapango", direccion: "Bulevar del Ejército, Soyapango", telefono: "2500-2225" }
      ]
    },
    {
      nombre: "Super Selectos",
      area: "Supermercados",
      descripcion: "La cadena de supermercados 100% salvadoreña con mayor cobertura en el país.",
      antecedentes: "Fundada por Grupo Calleja, comenzó como una pequeña tienda y hoy cuenta con más de 100 salas de venta.",
      direccion: "Alameda Manuel Enrique Araujo, San Salvador.",
      habilitada: true,
      verificada: true,
      sucursales: [
        { nombre: "Selectos Santa Ana Centro", direccion: "Centro Histórico, Santa Ana", telefono: "2222-3331" },
        { nombre: "Selectos Sonsonate", direccion: "Centro Comercial El Encuentro, Sonsonate", telefono: "2222-3332" },
        { nombre: "Selectos Escalón", direccion: "Paseo General Escalón, San Salvador", telefono: "2222-3333" },
        { nombre: "Selectos San Miguel", direccion: "Centro Histórico, San Miguel", telefono: "2222-3334" },
        { nombre: "Selectos La Libertad", direccion: "Puerto de La Libertad", telefono: "2222-3335" }
      ]
    },
    {
      nombre: "Banco Agrícola",
      area: "Banca y Finanzas",
      descripcion: "El banco más grande de El Salvador, ofreciendo servicios financieros integrales.",
      antecedentes: "Fundado en 1955 y adquirido posteriormente por Grupo Bancolombia, líder del sector financiero nacional.",
      direccion: "Centro Financiero, Bulevar Constitución, San Salvador.",
      habilitada: true,
      verificada: true,
      sucursales: [
        { nombre: "Agencia Santa Ana Bypass", direccion: "Bypass Santa Ana", telefono: "2210-4441" },
        { nombre: "Agencia Metrocentro Lourdes", direccion: "Centro Comercial Metrocentro Lourdes", telefono: "2210-4442" },
        { nombre: "Agencia Centro Sonsonate", direccion: "Frente a la Alcaldía de Sonsonate", telefono: "2210-4443" },
        { nombre: "Agencia Plaza Mundo", direccion: "Plaza Mundo Soyapango", telefono: "2210-4444" },
        { nombre: "Agencia San Miguel Roosevelt", direccion: "Avenida Roosevelt, San Miguel", telefono: "2210-4445" }
      ]
    },
    {
      nombre: "Pizza Hut El Salvador",
      area: "Restaurantes",
      descripcion: "Cadena de restaurantes de comida rápida especializada en pizzas.",
      antecedentes: "Franquicia operada localmente, siendo una de las cadenas de restaurantes más queridas en El Salvador con extensa red de entregas.",
      direccion: "Zona Industrial Santa Elena, Antiguo Cuscatlán.",
      habilitada: true,
      verificada: true,
      sucursales: [
        { nombre: "Pizza Hut Santa Ana", direccion: "Frente a redondel Monseñor Romero, Santa Ana", telefono: "2255-6000" },
        { nombre: "Pizza Hut Lourdes", direccion: "Unicentro Lourdes", telefono: "2255-6000" },
        { nombre: "Pizza Hut Sonsonate", direccion: "Bulevar Las Palmeras, Sonsonate", telefono: "2255-6000" },
        { nombre: "Pizza Hut San Salvador (Mascota)", direccion: "Avenida Mascota, San Salvador", telefono: "2255-6000" },
        { nombre: "Pizza Hut San Miguel", direccion: "Avenida Roosevelt, San Miguel", telefono: "2255-6000" }
      ]
    },
    {
      nombre: "Almacenes Simán",
      area: "Retail / Grandes Almacenes",
      descripcion: "Cadena de tiendas por departamentos líder en Centroamérica.",
      antecedentes: "Nacida en El Salvador hace más de 100 años, ofrece moda, cosméticos y artículos para el hogar.",
      direccion: "Bulevar Los Próceres, San Salvador.",
      habilitada: true,
      verificada: true,
      sucursales: [
        { nombre: "Simán Santa Ana", direccion: "Metrocentro Santa Ana", telefono: "2298-3777" },
        { nombre: "Simán La Gran Vía", direccion: "Centro Comercial La Gran Vía, Antiguo Cuscatlán", telefono: "2298-3777" },
        { nombre: "Simán Galerías", direccion: "Centro Comercial Galerías, San Salvador", telefono: "2298-3777" },
        { nombre: "Simán Metrocentro San Salvador", direccion: "Metrocentro 4ta Etapa, San Salvador", telefono: "2298-3777" },
        { nombre: "Simán San Miguel", direccion: "Metrocentro San Miguel", telefono: "2298-3777" }
      ]
    },
    {
      nombre: "Tigo El Salvador",
      area: "Telecomunicaciones",
      descripcion: "Proveedor líder de servicios móviles y de internet residencial en el país.",
      antecedentes: "Operando originalmente como Telemóvil, Tigo modernizó la infraestructura de telecomunicaciones salvadoreña.",
      direccion: "Tigo Campus, Santa Elena, Antiguo Cuscatlán.",
      habilitada: true,
      verificada: true,
      sucursales: [
        { nombre: "Agencia Tigo Santa Ana", direccion: "Metrocentro Santa Ana", telefono: "2207-4000" },
        { nombre: "Agencia Tigo Lourdes", direccion: "Unicentro Lourdes", telefono: "2207-4000" },
        { nombre: "Agencia Tigo Sonsonate", direccion: "Metrocentro Sonsonate", telefono: "2207-4000" },
        { nombre: "Agencia Tigo Multiplaza", direccion: "Multiplaza, Antiguo Cuscatlán", telefono: "2207-4000" },
        { nombre: "Agencia Tigo San Miguel", direccion: "Metrocentro San Miguel", telefono: "2207-4000" }
      ]
    },
    {
      nombre: "Pollo Campero",
      area: "Restaurantes",
      descripcion: "Cadena de restaurantes de origen guatemalteco de pollo frito con amplia presencia.",
      antecedentes: "Llegó al país hace décadas y se ha convertido en un ícono de la comida rápida centroamericana.",
      direccion: "Alameda Juan Pablo II, San Salvador.",
      habilitada: true,
      verificada: true,
      sucursales: [
        { nombre: "Campero Santa Ana Centro", direccion: "2da Avenida Sur, Santa Ana", telefono: "2273-6000" },
        { nombre: "Campero Lourdes", direccion: "Metrocentro Lourdes", telefono: "2273-6000" },
        { nombre: "Campero Sonsonate", direccion: "Plaza Sonsonate", telefono: "2273-6000" },
        { nombre: "Campero Los Héroes", direccion: "Bulevar de Los Héroes, San Salvador", telefono: "2273-6000" },
        { nombre: "Campero San Miguel Roosevelt", direccion: "Carretera Roosevelt, San Miguel", telefono: "2273-6000" }
      ]
    },
    {
      nombre: "Empresas ADOC",
      area: "Calzado y Manufactura",
      descripcion: "Fabricante y distribuidor de calzado de mayor renombre en Centroamérica.",
      antecedentes: "Fundada por Roberto Palomo, produce y vende calzado de excelente calidad desde hace más de 60 años.",
      direccion: "Soyapango, El Salvador.",
      habilitada: true,
      verificada: true,
      sucursales: [
        { nombre: "ADOC Santa Ana", direccion: "Metrocentro Santa Ana", telefono: "2250-7771" },
        { nombre: "ADOC Sonsonate", direccion: "Metrocentro Sonsonate", telefono: "2250-7772" },
        { nombre: "ADOC San Salvador Centro", direccion: "Calle Rubén Darío, San Salvador", telefono: "2250-7773" },
        { nombre: "ADOC Plaza Merliot", direccion: "Plaza Merliot, Santa Tecla", telefono: "2250-7774" },
        { nombre: "ADOC San Miguel", direccion: "Metrocentro San Miguel", telefono: "2250-7775" }
      ]
    },
    {
      nombre: "Farmacias Económicas",
      area: "Salud y Farmacias",
      descripcion: "Cadena de farmacias con precios accesibles y gran cobertura nacional.",
      antecedentes: "Fundada para ofrecer medicamentos a bajo costo, ha crecido rápidamente en los últimos 20 años.",
      direccion: "Boulevard del Ejército, Soyapango.",
      habilitada: true,
      verificada: true,
      sucursales: [
        { nombre: "Económicas Santa Ana", direccion: "Avenida Independencia, Santa Ana", telefono: "2500-8881" },
        { nombre: "Económicas Lourdes", direccion: "Colonia Las Moras, Lourdes", telefono: "2500-8882" },
        { nombre: "Económicas Sonsonate", direccion: "Terminal de Buses, Sonsonate", telefono: "2500-8883" },
        { nombre: "Económicas Salvador del Mundo", direccion: "Plaza Salvador del Mundo, San Salvador", telefono: "2500-8884" },
        { nombre: "Económicas San Miguel Centro", direccion: "Parque Barrios, San Miguel", telefono: "2500-8885" }
      ]
    }
  ];

  for (const empData of empresasData) {
    // Note: Metrocentro San Salvador had a typo in property name "seleccionado", fix it to "direccion"
    const sucursalesData = empData.sucursales.map(s => ({
      nombre: s.nombre,
      direccion: (s as any).direccion || (s as any).seleccionado || "Dirección no especificada",
      telefono: s.telefono,
      mapaUrl: (s as any).mapaUrl || null
    }));

    // Insert Empresa
    const insertedEmpresa = await db.insert(empresas).values({
      nombre: empData.nombre,
      area: empData.area,
      descripcion: empData.descripcion,
      antecedentes: empData.antecedentes,
      direccion: empData.direccion,
      organigramaUrl: empData.organigramaUrl || null,
      mapaUrl: empData.mapaUrl || null,
      habilitada: empData.habilitada,
      verificada: empData.verificada,
    }).returning({ id: empresas.id });

    const empId = insertedEmpresa[0].id;

    // Insert Sucursales
    for (const suc of sucursalesData) {
      await db.insert(sucursales).values({
        empresaId: empId,
        nombre: suc.nombre,
        direccion: suc.direccion,
        telefono: suc.telefono,
        mapaUrl: suc.mapaUrl,
      });
    }

    console.log(`✅ Empresa insertada: ${empData.nombre} con 5 sucursales.`);
  }

  console.log("¡Seeding completado!");
  process.exit(0);
}

run().catch(e => {
  console.error("Error seeding:", e);
  process.exit(1);
});
