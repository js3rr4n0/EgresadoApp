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

## 4. ERROR 3 & ERROR 4: Inmutabilidad de Documentos, Flujo de Revisión y Vista de Impresión

### 4.1. Descripción de las Incidencias
1. **ERROR 3 (Falta de botón de retorno):** Al visualizar la propuesta en las etapas de redacción o impresión, el egresado carecía de un botón para regresar al panel principal dashboard (`/egresado`).
2. **ERROR 4 (Falta de bloqueo de documentos y visualización de propuesta):** Una vez que el egresado enviaba su propuesta (estado `"enviada"`), aún le era posible reemplazar o eliminar sus documentos obligatorios (`servicio_social`, `certificacion_notas`, `pago_tg`). Además, en la tabla de propuestas la acción continuaba diciendo "Continuar" en lugar de "Ver Propuesta".
3. **Disparo Automático del Cuadro de Impresión (`window.print()`):** Al abrir la vista del PDF/propuesta (`/egresado/redactar/imprimir`), un script cliente ejecutaba `window.print()` de forma automática a los 2.5 segundos, bloqueando la pantalla con la ventana flotante nativa de impresión del navegador.

### 4.2. Diagnóstico y Causas Raíz
1. **Inexistencia de Validación de Estado en Carga de Archivos:** Las server actions `uploadDocumento` y `deleteDocumento` (`src/app/actions/documentos.ts`) no verificaban si la propuesta del estudiante ya se encontraba en estado `"enviada"` o `"aprobada"`.
2. **Falta de Desactivación de Controles en la UI:** El componente `DocumentGate.tsx` no recibía la propiedad `isLocked` para ocultar los botones de reemplazo y eliminación cuando la propuesta estuviese enviada.
3. **Script Inyectado en `imprimir/page.tsx`:** La página `/egresado/redactar/imprimir/page.tsx` contenía un bloque `<script dangerouslySetInnerHTML={{ __html: 'setTimeout(() => window.print(), 2500)' }} />` que forzaba el despliegue del menú de impresión nativo del navegador al abrir la página.

### 4.3. Solución Aplicada
1. **Eliminación del Auto-Print (`imprimir/page.tsx`):**
   Se removió por completo el script cliente con `setTimeout` y `window.print()`. Ahora la página se renderiza limpia en pantalla para su lectura. La impresión solo se activa si el usuario presiona explícitamente el botón **"Imprimir / Guardar PDF"** (`PrintButton.tsx`).
2. **Inmutabilidad y Bloqueo Servidor/Cliente (`documentos.ts` & `DocumentGate.tsx`):**
   - En `documentos.ts`, se agregaron comprobaciones `if (hasSubmitted) return { success: false, error: 'No puedes modificar tus documentos...' }`.
   - En `DocumentGate.tsx`, se añadió la propiedad `isLocked` que oculta los inputs de archivo y botones de borrado cuando la propuesta está enviada.
3. **Navegación y Estados de UI (`page.tsx` Egresado y Redacción):**
   - Se añadió un botón **"Volver al Panel Principal"** en la navegación.
   - En la tabla "Mis Propuestas", la acción cambia a **"Ver Propuesta"** cuando el estado es `"enviada"`, `"aprobada"` o `"rechazada"`.
   - En la pantalla de redacción (`/egresado/redactar`), se muestra una tarjeta informativa indicando que la propuesta se encuentra en revisión administrativa con un botón para **"Ver PDF / Vista Previa"**.
4. **Visualización de PDF para Administradores (`/admin/propuestas/[id]/imprimir`):**
   Se creó la vista de impresión/PDF para el rol administrativo, permitiendo consultar la propuesta en un documento unificado sin auto-print.

### 4.4. Verificación y Calidad
- **TypeScript:** Se ejecutó `npx tsc --noEmit` obteniendo 0 errores.
- **Sincronización:** Cambios confirmados y subidos a la rama `main` en GitHub.

---

## 5. ERROR 5: Bloqueo de Edición de Fecha de Inicio en Descripción de Actividades

### 5.1. Descripción del Problema
En la Etapa 5 (**Descripción de Actividades**), el campo `fechaInicio` (Inicio de Pasantía) se mostraba editable a través de un control `<input type="date">`, permitiendo que el egresado alterara la fecha de inicio previamente calculada y validada en la Etapa 4 (**Carta de Aceptación**).

### 5.2. Diagnóstico y Causa Raíz
En `src/components/ActividadesForm.tsx`, el campo `fechaInicio` utilizaba un control de entrada reactivo (`onChange={(e) => handleDateChange(e.target.value)}`) en lugar de mantenerse como un campo informativo de solo lectura (`readOnly`). La fecha de inicio debe provenir exclusivamente de los cálculos automáticos de la Carta de Aceptación (Etapa 4).

### 5.3. Solución Aplicada
1. **Configuración Read-Only en `ActividadesForm.tsx`:**
   - Se estableció la propiedad `readOnly` en el campo `fechaInicio`, aplicando estilos de deshabilitado (`bg-slate-100 cursor-not-allowed text-slate-700`).
   - Se removió el manejador `onChange` de `fechaInicio` en esta etapa para evitar modificaciones manuales.
2. **Sincronización Automática con `initialFechas`:**
   - Se añadió un efecto de sincronización `useEffect` para garantizar que `fechaInicio` y `fechaFin` se mantengan fielmente atados a las fechas establecidas en `CartaForm.tsx` (Etapa 4).
3. **Claridad Visual:**
   - Se renombró la sección a **"Fechas de Ejecución (Calculadas en Carta de Aceptación)"** y la etiqueta del campo a **"Inicio de Pasantía (Establecida en Carta de Aceptación)"**.

### 5.4. Verificación y Calidad
- **TypeScript:** Se ejecutó `npx tsc --noEmit` confirmando 0 errores.
- **Sincronización:** Cambios confirmados y sincronizados en la rama `main` de GitHub.

---

## 6. FEATURE: Gestión de Hasta 3 Propuestas por Egresado y Bloqueo Selectivo

### 6.1. Requerimiento
Permitir a los egresados redactar hasta **3 propuestas de trabajo de graduación** simultáneamente (Pasantía, Proyecto o Investigación).
- La primera propuesta se crea como **Propuesta #1**.
- Al intentar crear más propuestas, la interfaz le notifica al alumno: *"Ya tienes X propuesta(s) en curso, se creará como la Propuesta #X"* y le permite elegir la modalidad.
- El egresado puede redactar cualquiera de las 3 y enviar a revisión la que finalice primero.
- **Regla de Bloqueo:** Al enviar una propuesta a revisión (`enviada` o `aprobada`), las otras 2 propuestas se bloquean automáticamente en modo solo lectura para evitar múltiples entregas.
- **Regla de Rechazo:** Si la propuesta enviada es **rechazada**, todas las 3 propuestas se desbloquean automáticamente, conservando intactos todos sus datos para que el estudiante pueda modificarlas o reenviar cualquiera de ellas.

### 6.2. Solución Aplicada
1. **Server Actions (`src/app/actions/propuestas.ts`)**:
   - `initPropuesta(tipo)`: Valida el límite de 3 propuestas por egresado, verifica si hay alguna propuesta enviada en proceso de revisión (bloqueando la creación de nuevas propuestas si hay una en evaluación) e inserta la nueva propuesta con su número secuencial correspondiente (1, 2, 3). Devuelve `propuestaId`.
   - `getActivePropuesta(targetPropuestaId?)`: Permite consultar propuestas específicas vía `id`. Retorna la información de bloqueo global (`isAnySubmitted`, `isCurrentSubmitted`, `submittedPropNumber`).
2. **Interfaz de Usuario y Dashboard (`src/app/egresado/page.tsx` & `DocumentGate.tsx`)**:
   - Se actualizó el modal de creación en `DocumentGate.tsx` para mostrar un banner interactivo notificando cuántas propuestas tiene en curso y cuál número asignará a la nueva propuesta.
   - La tabla **"Mis Propuestas"** lista todas las propuestas (#1, #2, #3) con badges de estado diferenciados (`Redactando`, `Enviada / En Revisión`, `Bloqueada (Otra en revisión)`, `Rechazada`).
   - Los enlaces dirigen dinámicamente a `/egresado/redactar?id=${p.id}`.
3. **Página de Redacción e Impresión (`/egresado/redactar` & `imprimir`)**:
   - Soporte para parámetro `id` en la URL.
   - Banner explicativo cuando la propuesta visualizada se encuentra bloqueada por otra propuesta enviada a revisión.

### 6.3. Verificación y Calidad
- **TypeScript:** Validado mediante `npx tsc --noEmit` obteniendo 0 errores.
- **Git Push:** Sincronizado en la rama `main` en GitHub.

---

## 7. ERROR: Duplicación de Supervisor al Aprobar Solicitud de Edición

### 7.1. Descripción del Problema
Cuando el egresado solicitaba una edición de datos de un supervisor existente (`edit_existing`) y la Administración/Decanato aprobaba dicha solicitud, el sistema creaba un nuevo registro de supervisor en la base de datos en lugar de actualizar el supervisor ya existente, generando duplicados en la tabla de supervisores de la empresa.

### 7.2. Diagnóstico y Causa Raíz
En `src/app/actions/solicitudes.ts` (`aprobarSolicitudEmpresa`), el bloque `else` (solicitudes de tipo `"actualizacion"`) ejecutaba incondicionalmente un `db.insert(supervisores)` en lugar de evaluar si los datos de la solicitud especificaban un `targetSupervisorId` existente. Además, cuando solo se enviaba actualización de empresa, se insertaba un supervisor vacío `("", "")`.

### 7.3. Solución Aplicada
1. **Edición in-place en `src/app/actions/solicitudes.ts`:**
   - Se evaluó la presencia de `data.supervisor.targetSupervisorId`. Si está presente, la acción ejecuta un `db.update(supervisores).set(...).where(eq(supervisores.id, targetSupervisorId))` para actualizar los datos en el supervisor existente.
   - Solo si no existe `targetSupervisorId` y los campos de `nombres` vienen diligenciados se realiza un `db.insert(supervisores)` para registrar uno nuevo.
2. **Actualización Selectiva de Empresa y Propuesta:**
   - La actualización de `empresas` ahora solo modifica campos si la solicitud incluyó datos de la empresa.
   - La propuesta conserva su referencia al supervisor existente o se actualiza al ID del supervisor editado/creado.

### 7.4. Verificación y Calidad
- **TypeScript:** `npx tsc --noEmit` ejecutado sin errores (0 errors).
- **Git Push:** Sincronizado en la rama `main` de GitHub.

---

## 8. ERROR: Salto Indeseado de Navegación entre Propuestas al Guardar y Continuar

### 8.1. Descripción del Problema
Al estar completando una propuesta específica (ej. Propuesta 1 de Pasantía) y hacer clic en "Guardar y Continuar", el navegador redirigía automáticamente a la Propuesta 3 (Proyecto de Graduación) o a una propuesta equivocada.

### 8.2. Diagnóstico y Causa Raíz
En `src/components/PortadaForm.tsx` (y otros componentes de formulario de etapas), las llamadas a `router.push()` utilizaban rutas relativas de tipo `?step=2` sin incluir el parámetro `id=${propuestaId}`. Al omitir el `id` de la propuesta activa en la query string, Next.js removía el parámetro de la URL, lo que causaba que `src/app/egresado/redactar/page.tsx` cayera en el fallback por defecto de cargar la propuesta más reciente (`userPropuestas[0]`), cambiando abruptamente de propuesta al usuario.

### 8.3. Solución Aplicada
1. **Auditoría e Inyección de `propuestaId`:**
   - Se actualizó `PortadaFormProps` para requerir `propuestaId: number`.
   - Se actualizaron todos los botones de navegación entre etapas en componentes del egresado (`PortadaForm`, `DatosEmpresarialesForm`, `DatosSupervisorForm`, `CartaForm`, `ActividadesForm`, `JustificacionForm`, `DocumentosEstudianteForm`, `ActoresIntervinientesForm`, `CartaProyectoForm`, `DescripcionProblemaForm`, `JustificacionProyectoForm`, `AlcanceProyectoForm`, `ObjetivosProyectoForm`) para usar explícitamente `?id=${propuestaId}&step=X`.
2. **Preservación de URL en Links y Popups:**
   - Se aseguró que los enlaces a `Vista Previa` e `Imprimir` incluyan el query parameter `?id=${propuesta.id}`.

### 8.4. Verificación y Calidad
- **TypeScript:** Validado con `npx tsc --noEmit` obteniendo 0 errores.
- **Aislamiento:** Cada propuesta redactada mantiene su `id` aislado en la barra de navegación sin riesgo de fuga de datos ni redirección cruzada.

---

## 9. ERROR: Fallo al Eliminar Empresa en Panel Administrador por Restricción de Clave Foránea

### 9.1. Descripción del Problema
Al intentar eliminar una empresa desde el catálogo administrativo (`/admin/empresas`), aparecía una alerta con un error de consulta SQL sin tratar: `Failed query: delete from "empresas" where "empresas"."id" = $1 params: 15`.

### 9.2. Diagnóstico y Causa Raíz
En `src/app/actions/empresas.ts`, `deleteEmpresa()` ejecutaba directamente un `DELETE FROM empresas WHERE id = X`. Como la tabla `empresas` posee relaciones de clave foránea con tablas dependientes (`supervisores`, `firmantes`, `organigramas_empresa`, `historial_empresas`, `sucursales`, `solicitudes_empresa` y `propuestas`), PostgreSQL bloqueaba el borrado por violaciones de clave foránea (FK constraint), devolviendo una excepción SQL técnica.

### 9.3. Solución Aplicada
1. **Validación Previa de Propuestas de Estudiantes:**
   - Antes de intentar borrar, `deleteEmpresa` consulta la tabla `propuestas`. Si la empresa está asignada a 1 o más propuestas de egresados, cancela el borrado y retorna un mensaje amigable indicando la cantidad de propuestas vinculadas.
2. **Cascada Manual de Registros Secundarios:**
   - Si la empresa no está vinculada a propuestas académicas, la Server Action elimina primero de forma limpia los registros hijos en `solicitudesEmpresa`, `supervisores`, `firmantes`, `organigramasEmpresa`, `historialEmpresas` y `sucursales` antes de eliminar la fila principal en `empresas`.
3. **Manejo Amigable de Excepciones:**
   - Se capturan las excepciones de PostgreSQL/Drizzle para devolver mensajes descriptivos en español en lugar de alertas con la consulta SQL cruda.

### 9.4. Verificación y Calidad
- **TypeScript:** Validado con `npx tsc --noEmit` obteniendo 0 errores.
- **Git Push:** Cambios confirmados e integrados.

---

## 10. ERROR: Pérdida del Mapa de Ubicación al Aprobar Solicitudes de Edición de Empresa

### 10.1. Descripción del Problema
Cuando el egresado solicitaba una edición o actualización de datos de empresa y el administrador la aprobaba desde el panel de solicitudes (`/admin/empresas/solicitudes`), el enlace/mapa de ubicación dejaba de mostrarse en la vista del administrador (`/admin/empresas`), aunque en la vista del egresado continuaba apareciendo.

### 10.2. Diagnóstico y Causa Raíz
1. **Sobrescritura por Cadena Vacía:** En `src/app/actions/solicitudes.ts` (`aprobarSolicitudEmpresa`), el código ejecutaba `updateData.mapaUrl = data.empresa.mapaUrl || null`. Al ser enviada la solicitud con una cadena vacía `""` en el campo `mapaUrl`, la Server Action evaluaba `"" || null` como `null`, sobrescribiendo la coordenada existente en la base de datos a `NULL`.
2. **Visualización en Catálogo Admin (`EmpresasManager.tsx`):** El componente `EmpresasManager` solo consultaba `emp.mapaUrl` de la matriz principal. Si el mapa pertenecía a una sucursal o si la matriz tenía `mapaUrl = null`, el botón "Ver Mapa" desaparecía en el panel de administrador, a diferencia de la vista de egresado que usaba `sucursal.mapaUrl || empresa.mapaUrl`.

### 10.3. Solución Aplicada
1. **Preservación de Datos Existentes en `aprobarSolicitudEmpresa`:**
   - Se modificó la actualización en `src/app/actions/solicitudes.ts` para que únicamente modifique `mapaUrl` (así como `direccion`, `descripcion`, `antecedentes`, etc.) cuando la solicitud contenga un texto no vacío (`data.empresa.mapaUrl && data.empresa.mapaUrl.trim() !== ""`).
2. **Visualización Unificada en `EmpresasManager.tsx`:**
   - Se actualizó la tarjeta de empresa en el catálogo administrativo para buscar el mapa tanto en la matriz principal como en sus sucursales (`emp.mapaUrl || emp.sucursales?.find((s) => s.mapaUrl)?.mapaUrl`).

### 10.4. Verificación y Calidad
- **TypeScript:** Validado con `npx tsc --noEmit` obteniendo 0 errores.
- **Git Push:** Sincronizado en la rama `main`.

---

## 11. ERROR 8: Validación de Campos de Supervisores (Admin y Egresado)

### 11.1. Descripción del Problema
Si un administrador (desde `/admin/empresas`) o un egresado (desde `/egresado/redactar`) agregaba o solicitaba la edición de un supervisor sin ingresar datos, la aplicación permitía guardar o registrar campos de texto vacíos o formados por espacios en blanco.

### 11.2. Diagnóstico y Causa Raíz
Faltaba una validación de campos obligatorios (`nombres` y `apellidos` limpios de espacios vacíos) en el formulario de la interfaz de administración (`EmpresasManager.tsx`), en el modal de solicitud del egresado (`DatosSupervisorForm.tsx`), y en las Server Actions correspondientes (`empresas.ts` y `solicitudes.ts`).

### 11.3. Solución Aplicada
1. **Validación en Panel Administrador (`EmpresasManager.tsx` & `empresas.ts`):**
   - Se incorporó una validación previa que comprueba que cada supervisor agregado tenga nombres y apellidos válidos (`!sup.nombres.trim() || !sup.apellidos.trim()`). Si alguno está vacío, la interfaz detiene la ejecución y despliega un mensaje de error.
   - En las Server Actions `createEmpresa` y `updateEmpresa`, se añadieron validaciones de servidor que rechazan el guardado si se intentan enviar nombres o apellidos vacíos.
2. **Validación en Portal del Egresado (`DatosSupervisorForm.tsx` & `solicitudes.ts`):**
   - El botón de envío en el modal del egresado se deshabilita si los campos `nombres` o `apellidos` consisten en espacios en blanco.
   - `handleSubmitRevision` bloquea el envío y alerta al usuario si detecta entradas vacías.
   - `aprobarSolicitudEmpresa` limpia espacios sobrantes con `.trim()` y valida que los supervisores aprobados contengan apellidos y nombres válidos.

### 11.4. Verificación y Calidad
- **TypeScript:** Validado con `npx tsc --noEmit` obteniendo 0 errores.
- **Git Push:** Sincronizado en la rama `main`.

---

## 12. ERROR 6 & Carga de Archivos > 1MB (Ubicación GPS y Organigrama del lado del Egresado)

### 12.1. Descripción del Problema
1. **Petición de URL en vista del egresado:** Al registrar una nueva empresa o modificar una existente desde el formulario del egresado (`DatosEmpresarialesForm.tsx`), el sistema solicitaba escribir URLs en texto plano para el mapa de ubicación y el organigrama, en lugar de permitir seleccionar la ubicación GPS en un mapa interactivo y adjuntar el organigrama como archivo (PDF o Imagen).
2. **Fallo en archivos > 1MB:** Al intentar subir archivos PDF o imágenes superiores a 1MB en cualquier módulo (Admin o Egresado), las peticiones fallaban por la restricción predeterminada del tamaño de payload en Server Actions de Next.js (`1MB`).

### 12.2. Solución Aplicada
1. **Integración de `MapSelector` y Carga de Archivo de Organigrama (`DatosEmpresarialesForm.tsx`):**
   - Se reemplazó el campo de texto de URL Mapa por el componente interactivo `MapSelector` de Leaflet (igual al del panel administrativo).
   - Se reemplazó el campo de texto de URL Organigrama por un control de subida de archivos que acepta imágenes y documentos PDF (`accept="image/*,application/pdf"`), convirtiéndolos a Data URLs Base64 con vista previa e inspector.
2. **Ampliación del Límite de Payload en Server Actions (`next.config.ts`):**
   - Se configuró `experimental.serverActions.bodySizeLimit: '15mb'` en `next.config.ts` para habilitar el envío de cargas de hasta 15MB a través de Server Actions.
   - Se actualizaron las comprobaciones de tamaño en los componentes del cliente (`DatosEmpresarialesForm.tsx`, `EmpresasManager.tsx`, `DocumentosEstudianteForm.tsx`, `CartaForm.tsx`, `CartaProyectoForm.tsx`) para permitir archivos de hasta 10MB.

### 12.3. Verificación y Calidad
- **TypeScript:** Compilado exitosamente con `npx tsc --noEmit` (0 errores).
- **Git Push:** Sincronizado en la rama `main`.

---

## 13. Implementación del Rol y Panel de Asesor (`/asesor`)

### 13.1. Requerimientos Cumplidos
1. **Esquema de Base de Datos (`solicitudes_asesor`):**
   - Se incorporó la tabla `solicitudes_asesor` para gestionar la asignación, fecha/hora exacta de respuesta (`respondido_en`) y justificaciones de rechazo.
2. **Página de Inicio del Asesor (`/asesor/page.tsx` & `AsesorDashboardClient.tsx`):**
   - **Tabla "Mis propuestas":** Lista las propuestas aceptadas con datos del alumno, carnet, carrera y botón **"Ver Progreso"**.
   - **Sección / Modal "VER SOLICITUDES DE PROPUESTA":** Despliega notificaciones con la plantilla exacta:
     *“Se ha asignado una propuesta de (Tipo de propuesta) de parte del estudiante (Nombre completo) con carnet (N. de carnet), ¿estaría dispuesto a asesorar?”*
   - **Visualización de PDF:** Permite abrir/ver el archivo PDF de la propuesta del estudiante.
   - **Confirmaciones SI / NO:**
     - **SI:** Confirmación modal → Al aceptar, se registra `respondido_en` con fecha/hora y se habilita la propuesta en "Mis propuestas".
     - **NO:** Confirmación modal → Habilita cuadro de texto para justificación **obligatoria** con botón **"Enviar"**, registrando fecha, hora y motivo en BD.
3. **Sección "VER PROGRESO" (`/asesor/propuestas/[id]`):**
   - Interfaz con control de pestañas y botón **"← Regresar a Mis propuestas"**.
   - **Pestaña 1: "Datos de Propuesta":** Muestra Nombre completo, Carnet, Carrera y visor de PDF.
   - **Pestaña 2: "Visualizar plan de trabajo":** Muestra Diagrama de Gantt por mes y semanas con actividades, botón para modificar la descripción de actividades (sincronizado con el alumno) y apartado de informes mensuales.
   - **Pestaña 3: "Informe de primer contacto":** Formulario con distintivo **"(En desarrollo)"** para registrar datos del contacto inicial en la empresa.

### 13.2. Verificación y Calidad
- **TypeScript:** Validado exitosamente con `npx tsc --noEmit` (0 errores).
- **Git Push:** Sincronizado en la rama `main`.

---

## 14. Pausa de Trabajo de Graduación y Envío a Revisión al Editar Datos Erróneos (Pasantía, Trabajo e Investigación)

### 14.1. Descripción de la Funcionalidad
Se actualizó el flujo de corrección de datos personales/carnet en la vista de Egresado para todas las modalidades (Pasantía, Trabajo de Graduación e Investigación):
1. **Envío Oficial a Revisión:** Al modificar la información en el modal de **"Datos erróneos"**, el botón principal de confirmación se cambió a **"Guardar y Enviar a revisión"**.
2. **Bloqueo y Pausa Automática del Trabajo:**
   - La acción Server `solicitarCorreccionDatosDecanato` en `src/app/actions/propuestas.ts` establece `bloqueada: true` y `estado: "pend_revision_datos"` en la propuesta.
   - El trabajo del estudiante entra inmediatamente en estado de pausa y solo lectura (**"En espera de aprobación administrativa"**), impidiendo avanzar en las actividades o pasos de redacción hasta que el Decanato o la Administración aprueben o rechacen la solicitud.
3. **Notificación Transparente en la Interfaz:** Se incorporó un aviso informativo destacado dentro de los modales (`PortadaForm.tsx` y `ProyectoPortadaForm.tsx`) alertando al estudiante que al guardar los cambios, la propuesta quedará pausada temporalmente.
4. **Validación Condicional de Modificación en la Base de Datos:**
   - **En Caso de Aprobación (`aprobarSolicitudEmpresa`):** Se ejecuta el `UPDATE` a la tabla `usuarios` en la base de datos con los nuevos valores de Nombre Completo y/o Carnet. Al estar la tabla `usuarios` vinculada mediante relaciones a todo el sistema (paneles de Egresado, Coordinador, Decanato, Asesor y vistas PDF), la actualización se proyecta de forma inmediata en toda la DB.
   - **En Caso de Rechazo (`rechazarSolicitudEmpresa`):** La base de datos permance intacta (no se altera ningún campo en `usuarios`), se desbloquea la propuesta para que el graduando pueda continuar y se notifica la razón del rechazo.

### 14.2. Verificación y Calidad
- **Build de Producción:** Ejecutado `npm run build` con resultado exitoso (`Exit code: 0`).
- **Git Push:** Cambios confirmados y sincronizados en el repositorio GitHub `js3rr4n0/EgresadoApp`.










