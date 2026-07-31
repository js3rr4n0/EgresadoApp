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

## 🛠️ ERROR 3: Unificación de Solicitudes Administrativas (Datos de Alumno, Empresa y Supervisor), Trazabilidad Histórica y Notificaciones en Tiempo Real

### 3.1. Ubicación del Incidente
* **Rutas de la App:** `/admin/empresas/solicitudes`, `/egresado/redactar` y cabeceras globales (`DashboardHeader.tsx`, `AdminSidebar.tsx`).
* **Componentes y Archivos Afectados:**
  - `src/lib/schema.ts`
  - `src/app/actions/solicitudes.ts`
  - `src/app/actions/propuestas.ts`
  - `src/app/actions/notificaciones.ts`
  - `src/app/admin/empresas/solicitudes/SolicitudesTable.tsx`
  - `src/components/NotificationBell.tsx`
  - `src/components/AdminSidebar.tsx`
  - `src/components/DashboardHeader.tsx`

### 3.2. Descripción Técnica del Incidente
Inicialmente, las solicitudes de creación o modificación de empresas/supervisores se procesaban en la tabla `solicitudes_empresa`, mientras que las peticiones de corrección de datos personales de alumnos se intentaban dirigir a un esquema independiente (`solicitudes_correccion_datos`). Esto ocasionaba tres problemas principales:
1. **Falta de Centralización:** El administrador y el decanato debían consultar múltiples vistas para atender las peticiones de los graduando.
2. **Inexistencia de Trazabilidad Comparativa ("Antes vs Después"):** En el panel de revisión no se mostraba el estado de los datos del estudiante previos a la solicitud frente a los datos propuestos.
3. **Falta de Notificaciones en Tiempo Real:** El icono de la campana en la cabecera era estático, impidiendo que el Administrador/Decanato supiera cuántas solicitudes pendientes requerían atención y que el Egresado se enterase cuando su petición fuera aprobada o rechazada.

### 3.3. Análisis de Causa Raíz (Root Cause Analysis - RCA)
1. **Modelado de Datos Fragmentado:** La tabla `solicitudes_empresa` no estaba estructurada para actuar de forma polimórfica registrando distintos tipos de solicitudes institucionales.
2. **Falta de Instantánea Histórica (Snapshot):** Al registrar la solicitud de datos, no se capturaban en el payload JSON los valores vigentes (`anteriores`) del usuario en la tabla `usuarios`.
3. **Ausencia de Componente Cliente Reactivo:** La interfaz no contaba con un componente cliente de notificaciones con sondeo o actualización dinámica.

### 3.4. Solución Aplicada y Cambios en el Código

#### A) Unificación Polimórfica en `solicitudes_empresa`
Se configuró la tabla `solicitudes_empresa` para almacenar solicitudes del tipo `"datos_alumno"`, `"nueva"` (empresa) y `"actualizacion"`, utilizando la columna `datos` (JSONB) para preservar la trazabilidad diferencial:

```json
{
  "tipo": "datos_alumno",
  "egresadoId": 21,
  "nombrePropuesto": "Merlon Brendon",
  "carnetPropuesto": "2026MB607",
  "justificacion": "Me equivoqué en el carnet",
  "anteriores": {
    "nombreCompleto": "Merlon Brandon",
    "carnet": "2026MB600"
  },
  "nuevos": {
    "nombreCompleto": "Merlon Brendon",
    "carnet": "2026MB607"
  }
}
```

#### B) Refactorización de Server Actions (`solicitudes.ts` y `propuestas.ts`)
1. **`solicitarCorreccionDatosDecanato` (`propuestas.ts`):** Guarda la solicitud en `solicitudes_empresa` e inserta registros en la tabla `notificaciones` para los usuarios con rol `admin` y `decanato`.
2. **`aprobarSolicitudEmpresa` (`solicitudes.ts`):** 
   - Cuando `solicitud.tipo === "datos_alumno"`, actualiza la tabla `usuarios` (`nombreCompleto` y `carnet`).
   - Inserta una notificación de aprobación en `notificaciones` para el egresado.
   - Desbloquea la propuesta del egresado para continuar con su trámite académico.
3. **`rechazarSolicitudEmpresa` (`solicitudes.ts`):** Actualiza el estado a `"rechazada"` guardando el motivo y notifica inmediatamente al egresado.

#### C) Visualización Comparativa en `SolicitudesTable.tsx`
Se actualizó el modal de detalles (`viewDetails`) para presentar paneles lado a lado con el estado **"Datos Actuales (Antes)"** y **"Cambios Propuestos (Después)"**, resaltando con distintivos los campos corregidos y mostrando la justificación presentada por el alumno.

#### D) Componente de Notificaciones en Tiempo Real (`NotificationBell.tsx`)
Se creó el componente cliente `NotificationBell.tsx` con un temporizador de sondeo cada 10 segundos:
- **Para Administrador / Decanato:** Muestra una insignia roja/amarilla pulsante con el conteo exacto de solicitudes pendientes. Al hacer clic, redirige a `/admin/empresas/solicitudes`.
- **Para Egresados:** Muestra las notificaciones de aprobación/rechazo en un menú desplegable interactivo, permitiendo marcarlas como leídas.

### 3.5. Verificación de la Solución (Quality Assurance)
1. **Prueba de Flujo Completo:**
   - Egresado envía solicitud de datos erróneos -> Se genera registro unificado e incrementa el contador de la campana del Admin/Decanato.
   - Admin hace clic en la campana -> Redirección a `/admin/empresas/solicitudes`.
   - Admin visualiza comparativo "Antes vs Después" y aprueba -> Se actualizan los datos institucionales del usuario en la BD y el egresado recibe una notificación de confirmación en su propia campana.
2. **Comprobación de Tipado y Compilación:** Se ejecutó `npx tsc --noEmit` confirmando 0 errores de TypeScript y compilación satisfactoria.

---
