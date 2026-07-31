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

## 🛠️ ERROR 2: Edición No Autorizada de Parámetros Institucionales en la Portada (Proyecto e Investigación) y Flujo de Corrección por Decanato

### 2.1. Ubicación del Incidente
* **Ruta de la App:** `/egresado/redactar` (Etapa 1: Portada en modalidades Proyecto e Investigación)
* **Componentes Afectados:** `src/components/proyecto/ProyectoPortadaForm.tsx`, `src/lib/schema.ts` y `src/app/actions/propuestas.ts`

### 2.2. Descripción Técnica del Incidente
En el formulario de la Portada de las propuestas de **Proyecto** e **Investigación**, los campos de **Nombre Completo del Egresado** y **Número de Carnet** se presentaban como cajas de texto editables (`<input type="text">`). Esto permitía que el usuario modificara libremente sus datos personales e identificadores universitarios sin la correspondiente validación académica institucional.

El requerimiento exige que los datos institucionales del estudiante permanezcan **bloqueados / de solo lectura** (`readOnly`). En caso de existir discrepancias o errores en su nombre o carnet, el egresado debe disponer del flujo oficial **"¿Datos erróneos?"**, el cual genera una **Solicitud de Corrección de Datos de Estudiante** dirigida al **Decanato** para su debida revisión y aprobación oficial.

### 2.3. Análisis de Causa Raíz (Root Cause Analysis - RCA)
1. **Inputs Editables Directamente:** El componente `ProyectoPortadaForm.tsx` utilizaba variables de estado mutable (`nombreCompleto`, `carnet`) vinculadas a inputs HTML sin la restricción `readOnly`, permitiendo su alteración directa y envío al servidor mediante la acción `updatePortada`.
2. **Inexistencia del Esquema de Solicitudes al Decanato:** No existía en el esquema de base de datos (`schema.ts`) una entidad destinada a registrar solicitudes de corrección de datos personales/institucionales para el rol de Decanato.

### 2.4. Solución Aplicada y Cambios en el Código

#### A) Bloqueo de Campos Institucionales e Ícono de Candado en `ProyectoPortadaForm.tsx`
Se modificaron los inputs del formulario para que utilicen la propiedad `readOnly` e incluyan un indicador visual de bloqueo (Candado `<InputLock />`):

```tsx
<div className="relative">
  <input
    type="text"
    readOnly
    value={nombreCompleto}
    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 text-sm cursor-not-allowed focus:outline-none"
  />
  <InputLock />
</div>
```

#### B) Creación de la Entidad de BD `solicitudes_correccion_datos` en `src/lib/schema.ts`
Se añadió la tabla para registrar las solicitudes enviadas por los egresados al Decanato:

```typescript
export const solicitudesCorreccionDatos = pgTable("solicitudes_correccion_datos", {
  id: serial("id").primaryKey(),
  egresadoId: integer("egresado_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  propuestaId: integer("propuesta_id").references(() => propuestas.id, { onDelete: "cascade" }),
  nombrePropuesto: varchar("nombre_propuesto", { length: 255 }),
  carnetPropuesto: varchar("carnet_propuesto", { length: 50 }),
  justificacion: text("justificacion"),
  estado: varchar("estado", { length: 20 }).notNull().default("pendiente"),
  revisadoPor: integer("revisado_por").references(() => usuarios.id),
  revisadoEn: timestamp("revisado_en", { withTimezone: true }),
  creadaEn: timestamp("creada_en", { withTimezone: true }).defaultNow(),
});
```

#### C) Server Action `solicitarCorreccionDatosDecanato` en `src/app/actions/propuestas.ts`
Se creó la Server Action para procesar las solicitudes y notificar automáticamente a los usuarios con rol `decanato`:

```typescript
export async function solicitarCorreccionDatosDecanato(formData: FormData) {
  // Registra la solicitud en solicitudes_correccion_datos y notifica a los Decanos
  ...
}
```

#### D) Implementación del Modal Interactivo "¿Datos erróneos?" en `ProyectoPortadaForm.tsx`
Se integró el botón oficial **"¿Datos erróneos?"** y un modal responsivo con desenfoque de fondo (`backdrop-blur`) donde el egresado ingresa el nombre/carnet correcto y la justificación correspondiente, enviándola directamente al Decanato.

### 2.5. Verificación de la Solución (Quality Assurance)
1. **Verificación Visual e Interactiva:**
   - Los campos de Nombre, Carnet, Carrera y Mes de Envío ahora se muestran bloqueados con ícono de candado en Proyecto e Investigación.
   - El botón **"¿Datos erróneos?"** despliega el modal para solicitar la corrección oficial al Decanato.
2. **Build de Producción:** Se ejecutó `npm run build` confirmando que la compilación de TypeScript finalizó con exitcode `0` sin fallas.

---

