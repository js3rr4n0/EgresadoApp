# PROYECTO DE CÁTEDRA: INFORME Y REGISTRO DE DEPURACIÓN (DEBUGGING LOG)
**Sistema de Gestión de Trabajos de Graduación (EgresadoApp)**  
**Universidad Católica de El Salvador (UNICAES)**  

---

## 📋 INFORMACIÓN DEL PROYECTO DE CÁTEDRA
* **Asignatura:** Desarrollo de Software / Proyecto de Cátedra
* **Sistema Target:** EgresadoApp (Next.js 16 App Router, PostgreSQL, Drizzle ORM, PDF.js)
* **Objetivo:** Registro exhaustivo de incidentes, análisis de causa raíz, correcciones de código y verificación de calidad por cada error reportado.

---

## 🛠️ ERROR 1: Omisión de Carrera y Mes de Envío en la Portada de Impresión (Proyecto e Investigación)

### 1.1. Ubicación del Incidente
* **Ruta de la App:** `/egresado/redactar/imprimir` y `/admin/propuestas/[id]`
* **Componentes Afectados:** `src/app/egresado/redactar/imprimir/page.tsx` y `src/app/admin/propuestas/[id]/page.tsx`

### 1.2. Descripción Técnica del Incidente
Al acceder a la vista previa e impresión de la propuesta de graduación (en las modalidades de **Proyecto** e **Investigación**), en la hoja inicial (Portada institucional A4) únicamente se renderizaba el nombre completo del estudiante y su carnet. No se leía ni mostraba el **Título al que se quiere optar (Carrera)** ni el **Mes de Envío / Presentación**.

### 1.3. Análisis de Causa Raíz (Root Cause Analysis - RCA)
1. **Falta de Join en la Consulta SQL/ORM:** En `imprimir/page.tsx`, la consulta a la base de datos realizaba un `db.select().from(usuarios)...` simple sobre la entidad `usuarios`, obteniendo únicamente `carrera_id` (numérico) sin realizar la asociación relacional (`leftJoin`) con la tabla `carreras` para extraer la columna `carreras.nombre`.
2. **Ausencia de Atributos en el Renderizado JSX:** El bloque JSX reservado para la Portada contenía únicamente un nodo `<h3>` con la interpolación de `{studentName}` y `{carnet}`. Faltaban las estructuras visuales encargadas de presentar la carrera universitaria y el mes de presentación del documento.

### 1.4. Solución Aplicada y Cambios en el Código

#### A) Modificación en `src/app/egresado/redactar/imprimir/page.tsx`
Se importó la tabla `carreras` desde `@/lib/schema` y se actualizó la consulta ORM con `leftJoin`:

```typescript
// Consulta actualizada con leftJoin a la tabla de carreras
const studentRows = await db
  .select({
    id: usuarios.id,
    nombreCompleto: usuarios.nombreCompleto,
    carnet: usuarios.carnet,
    carrera: carreras.nombre,
  })
  .from(usuarios)
  .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
  .where(eq(usuarios.id, session.userId))
  .limit(1);

const student = studentRows[0];
const carreraNombre = student?.carrera || "Carrera no especificada";

// Formateo dinámico del Mes de Envío
const dateForMonth = propuesta.enviadaEn ? new Date(propuesta.enviadaEn) : new Date();
const mesEnvioStr = new Intl.DateTimeFormat("es-SV", { month: "long" }).format(dateForMonth).toUpperCase();
```

Posteriormente, se actualizaron los campos dentro del contenedor principal de la Portada JSX:

```tsx
<div className="mb-12 space-y-3">
  <h3 className="text-lg font-bold text-gray-900 uppercase">
    {isMultiUserFlow ? (isInvestigacion ? "INVESTIGADOR PRINCIPAL: " : "LÍDER DE PROYECTO: ") : "ESTUDIANTE: "} {studentName} ({student?.carnet || "N/A"})
  </h3>

  <p className="text-sm font-semibold text-gray-700 uppercase">
    <strong>TÍTULO AL QUE SE OPTA / CARRERA:</strong> {carreraNombre}
  </p>

  <p className="text-sm font-semibold text-gray-700 uppercase">
    <strong>MES DE ENVÍO:</strong> {mesEnvioStr}
  </p>
```

#### B) Sincronización en la Vista Administrativa (`src/app/admin/propuestas/[id]/page.tsx`)
Se incorporó el mismo `leftJoin` en la consulta administrativa de propuestas para asegurar la visualización de la carrera del graduando durante la evaluación por parte del Administrador o Decanato:

```typescript
const [propuestaInfo] = await db
  .select({
    propuesta: propuestas,
    estudiante: usuarios,
    carreraNombre: carreras.nombre,
  })
  .from(propuestas)
  .leftJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
  .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
  .where(eq(propuestas.id, pId))
  .limit(1);
```

### 1.5. Verificación de la Solución (Quality Assurance)
1. **Prueba de Renderizado:** Se verificó la generación del documento impreso comprobando que ahora se visualizan correctamente:
   - Nombre del Líder / Investigador Principal y Carnet.
   - Carrera / Título al que opta (extraído de la base de datos).
   - Mes de Envío (calculado dinámicamente en español).
2. **Build de Producción:** Se ejecutó `npm run build` confirmando que la compilación de TypeScript y Turbopack finalizó con exitcode `0` sin advertencias ni errores.

---
