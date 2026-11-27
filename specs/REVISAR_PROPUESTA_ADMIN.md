# Revisar propuesta (administración): diseño, rechazo por requisitos, firmas, eliminación y prioridad de asesor

Notas del usuario del 26-nov-2026 (quinto bloque). Pantalla: Propuestas → «Revisar» (`/admin/propuestas/[id]`), que usan
el superadministrador y el administrador de facultad. Diseño de la universidad, sin emojis (la única excepción es la
estrella de «Prioritario», que se dibuja como ícono, no como emoji).

## 1. Cómo funciona hoy

| Punto | Hoy | Dónde |
|-------|-----|-------|
| Diseño | Imita la hoja impresa: portada fija con «Facultad de Ingeniería y Arquitectura / Decanato» (aunque el egresado sea de otra facultad), secciones en mayúsculas, colores índigo y rosa que no son los de la universidad. | `admin/propuestas/[id]/page.tsx` |
| Documentos de soporte | Solo muestra los del **líder**, con el nombre interno (`PAGO_TG`, `SERVICIO_SOCIAL`...). Los de los demás integrantes no se ven. | mismo archivo |
| Carta | Se ve el PDF, pero no los firmantes ni el supervisor elegidos (R5) ni sus firmas registradas. | |
| Acciones | Solo **asignar** (coordinador, o asesor directo si la facultad trabaja sin coordinador) y **«Eliminar propuesta definitivamente»**. | `ReviewForm.tsx` |
| Rechazar | **No existe** en la pantalla. La base ya tiene el estado `rechazada` y una acción antigua (`reviewPropuesta`) que nadie usa. | `actions/adminPropuestas.ts` |
| Eliminar | Un `confirm()` del navegador, sin justificación ni registro. Además **solo funciona en borradores**: con una propuesta enviada el botón aparece pero da error. | `eliminarPropuestaBorrador` |
| Prioridad | La estrella de «Prioritario» ya no existe; en su lugar los **coordinadores** que tienen propuestas de la misma empresa muestran «Conoce la empresa». Para el **asesor** no hay ninguna prioridad: la lista se ordena por carrera y carga. | `ReviewForm.tsx`, `asignacionServidor.ts` (`opcionesAsesor`), `actions/coordinador.ts` (`getAsesoresFacultad`) |
| Sin coordinador | Ya funciona (entrega C2): si la cohorte no tiene coordinador para la carrera, aparece la asignación directa a los asesores configurados para esa carrera y facultad. | `reglaDePropuesta` |
| Egresado con propuesta rechazada | Queda en solo lectura: no puede modificarla, reenviarla ni eliminarla (no existe acción para que el egresado elimine). | `egresado/page.tsx`, `egresado/redactar/page.tsx` |

## 2. Entregas

### A1. Diseño de la pantalla «Revisar propuesta»
- Encabezado: número, tipo, título, estado, cohorte, facultad y carrera del egresado, fecha de envío, y botones «Ver
  documento completo» e «Imprimir».
- Columna principal en tarjetas, en el orden en que se revisa:
  1. **Equipo**: integrantes con carnet, correo y carrera.
  2. **Requisitos previos**: documentos de soporte **de cada integrante** con sus nombres reales y su visor; carta de
     aceptación con fechas, empresa, firmantes y supervisor.
  3. **Contenido**: título, objetivos, fortaleza y enlace al documento completo (el contenido lo revisa el asesor).
  4. **Historial**.
- Columna lateral: panel de gestión (asignar, rechazar, eliminar) fijo al hacer scroll.
- Colores de la universidad (rojo institucional, grises), sin emojis. Facultad tomada del egresado, no fija.

**Hecha (26-nov-2026).**
- Datos: `src/lib/expedientePropuesta.ts` (equipo con carrera y facultad, documentos de cada integrante, empresa y
  sucursal, carta con firmantes y supervisor de R5 y sus firmas registradas, objetivos y cronograma).
- Página `admin/propuestas/[id]/page.tsx` reescrita: encabezado (número, tipo, título, estado, cohorte, facultad,
  carrera, fecha de envío) y tarjetas numeradas 1 Equipo, 2 Requisitos previos, 3 Contenido; después historial y
  valoraciones. El panel de gestión queda fijo al costado. Se quitó la imitación de hoja impresa (portada con la facultad
  fija y el Gantt); para eso está «Ver documento completo».
- Requisitos previos: los tres documentos **de cada integrante** con su nombre real, fecha de subida y visor plegable
  (`components/revisarPropuesta/DocumentoPlegable.tsx`; el PDF solo se convierte al abrirlo); aviso de cuántos faltan.
  Carta con fechas, visor, firmantes y supervisor (con su firma registrada), «sin supervisor» con su motivo o, en
  propuestas anteriores a R5, el supervisor escrito a mano.
- Historial con los colores de la universidad (`HistorialProyectoAccordion`, también lo usa el coordinador). Se quitaron
  los emojis de la vista de impresión de la administración.
- El panel de gestión (`ReviewForm`) no cambió de funciones; lo nuevo (rechazar, eliminar con justificación, prioridad)
  va en A2, A5 y A6.
- Probado con las propuestas 84 (proyecto con carta), 70 (equipo de 3) y 67 (pasantía).

### A2. Rechazo por requisitos (administración)
- Botón **«Rechazar propuesta»** en el panel, junto a «Asignar». Abre una ventana con:
  - Motivos frecuentes para marcar: documento de inscripción incorrecto (por ejemplo, se subió el pago en lugar de la
    hoja de inscripción), constancia de servicio social incorrecta, certificación de notas incorrecta, carta de
    aceptación incorrecta o incompleta, la firma de la carta no coincide, otro. En los de documentos se elige a qué
    integrante corresponde.
  - **Mensaje al egresado** obligatorio (mínimo 20 caracteres).
- Efecto: la propuesta pasa a **Rechazada**, se avisa a todo el equipo con el motivo, queda en el historial y se
  cancela cualquier asignación en curso (coordinador o solicitud de asesor).

**Hecha (26-nov-2026).**
- Tabla `rechazos_propuesta` (`scripts/crear_rechazos_propuesta.ts`, ya corrido en desarrollo): motivos marcados,
  mensaje, quién, función (administración o coordinador) y estado anterior.
- Reglas: `src/lib/rechazoPropuesta.ts` (8 motivos; los tres de documentos se marcan por integrante; mensaje de al
  menos 20 caracteres). Cuándo (respuestas 1 y 2): la administración con la propuesta **enviada sin coordinador ni
  asesor**; el coordinador a cargo con la propuesta **con coordinador asignado y sin asesor que haya aceptado**.
- Acción `actions/rechazoPropuesta.ts`: guarda el rechazo, borra las solicitudes de asesoría que nadie respondió, deja la
  propuesta en `rechazada` sin coordinador ni asesor, la anota en el historial y avisa a todo el equipo con los motivos y
  el mensaje.
- Ventana `components/revisarPropuesta/RechazarPropuesta.tsx` (se abre en el `body` para quedar sobre el menú): en
  «Revisar propuesta» de la administración (sección «Requisitos previos» del panel) y en la ventana «Revisar / Docs» del
  coordinador. La página de la administración muestra además la tarjeta «Rechazos por requisitos» con los anteriores.
- Probado: la administración rechazó la propuesta 89 (dos motivos, uno por integrante) y el administrador de facultad,
  como coordinador, la 88 (con una solicitud de asesoría pendiente, que se canceló). La 88 no mostraba el botón a la
  administración. Ambas se restauraron. Falta A3: mientras tanto, el egresado ve la propuesta rechazada en solo lectura.

### A3. Propuesta rechazada del lado del egresado
- En su panel: tarjeta «Propuesta rechazada por la administración» con el motivo y dos acciones:
  - **Modificar**: la propuesta vuelve a redacción con todos sus datos; el motivo queda visible arriba de los pasos hasta
    que la reenvíe. La revisión del documento (R6) y las ratificaciones se piden de nuevo.
  - **Eliminar**: con confirmación.
- Al reenviar empieza otra vez: pendiente de asignación, sin coordinador ni asesor. La administración ve los rechazos
  anteriores en el historial.

**Hecha (26-nov-2026).**
- Panel del egresado (`egresado/page.tsx`): una propuesta `rechazada` ya no cuenta como «enviada», así que no bloquea
  las demás ni los documentos (se pueden reemplazar desde el panel). Arriba de «Mis propuestas» aparece una tarjeta por
  cada rechazada con quién la rechazó, la fecha, los motivos y el mensaje; en la tabla dice «Rechazada» con «Ver
  motivo». Los integrantes ven la tarjeta sin acciones.
- Acciones del líder (`components/egresado/AccionesPropuestaRechazada.tsx`, `actions/rechazoPropuesta.ts`):
  - **Modificar**: vuelve a `redactando` sin fecha de envío, borra la confirmación de revisión (R6) y las
    ratificaciones, y lo anota en el historial. Abre la redacción.
  - **Eliminar**: confirmación en la misma tarjeta; borra la propuesta (todo lo relacionado se borra en cascada) y avisa
    al resto del equipo.
- Redacción (`egresado/redactar/page.tsx`): mientras la propuesta reabierta no se reenvíe, muestra arriba «Corrige lo que
  motivó el rechazo» con los motivos y el mensaje.
- Reenviar usa el envío de siempre (la propuesta queda `enviada`, sin coordinador ni asesor).
- Probado con la propuesta 89 marcada como rechazada y una copia desechable: la tarjeta, eliminar la copia y modificar
  la 89 (abre la redacción con el aviso; estado y historial correctos). Restaurada. Sin probar: un reenvío real y la
  vista de un integrante.

### A4. Verificación de firmas de la carta
- Botón **«Verificar firmas»** en la tarjeta de la carta. Abre una ventana con dos lados:
  - Izquierda: la carta (PDF).
  - Derecha: la empresa (y sucursal) y las personas elegidas por el egresado (firmantes y supervisor) con título, cargo,
    correo, teléfono y **la imagen de su firma registrada** en la empresa (o «Sin firma registrada»).
- La comparación la hace la persona a simple vista. Al terminar puede marcar «Firmas verificadas» (queda quién y
  cuándo) o pasar directo a «Rechazar» con el motivo «La firma de la carta no coincide» ya marcado.

**Hecha (26-nov-2026).**
- Tabla `verificaciones_firmas` (`scripts/crear_verificacion_firmas.ts`, ya corrido en desarrollo): quién, cuándo y una
  huella de la carta (archivo), los firmantes y el supervisor. Si el egresado cambia algo, la verificación deja de valer
  y se muestra «La carta cambió después de verificarla». Estado en `lib/verificacionFirmasServidor.ts`; acción
  `actions/verificacionFirmas.ts` (administración con acceso a la propuesta o el coordinador a cargo).
- Ventana `components/revisarPropuesta/VerificarFirmas.tsx` desde la tarjeta de la carta: carta a la izquierda; a la
  derecha la empresa y cada firmante y supervisor elegido con cargo, contacto y su firma registrada (con zoom), o «Sin
  firma registrada». Abajo: «Firmas verificadas» / «Quitar verificación» y, si todavía se puede rechazar (A2), «La
  firma no coincide: rechazar», que abre el rechazo con ese motivo ya marcado.
- Junto al botón, el estado: verificadas (por quién y cuándo), sin verificar o cambió después. En el panel de gestión,
  un aviso «Las firmas todavía no se han verificado» que no bloquea la asignación (respuesta 6).
- De paso: se quitó el emoji del botón «Ampliar» del visor de imágenes (`MediaZoomViewer`).
- Probado con firmas y cartas de prueba en las propuestas 89 (rechazo con el motivo marcado, marcar verificadas, cambiar
  la carta invalida) y 84 (ya asignada: se verifica pero no aparece el rechazo). Datos de prueba borrados.

### A5. Eliminación con confirmación y justificación
- Ventana propia (no el `confirm()` del navegador) que explica qué se borra, pide **justificación** (mínimo 20
  caracteres) y que se escriba el número de la propuesta para confirmar.
- Queda un **registro** de la propuesta eliminada (número, título, integrantes, estado, justificación, quién y cuándo)
  y se avisa al equipo.
- Estados en que se permite: ver pregunta 4.

**Hecha (26-nov-2026).**
- Tabla `propuestas_eliminadas` (`scripts/crear_propuestas_eliminadas.ts`, ya corrido en desarrollo): número, título,
  tipo, estado al eliminar, integrantes (nombre, carnet, líder), empresa, justificación, quién y cuándo. Sin referencia a
  `propuestas`.
- Reglas `src/lib/eliminarPropuesta.ts`: cualquier estado salvo `en_ejecucion` (respuesta 4); justificación de al menos
  20 caracteres; para confirmar se escribe **ELIMINAR** (en lugar del número: los números de propuesta se repiten entre
  egresados, del 1 al 3).
- Acción `actions/eliminarPropuesta.ts` (solo superadministrador): guarda el registro, borra la propuesta (en la base
  todo lo relacionado se borra en cascada; se comprobó) y avisa a cada integrante con el motivo. Reemplaza a
  `eliminarPropuestaBorrador`, que solo servía para borradores y se quitó.
- Ventana `components/revisarPropuesta/EliminarPropuesta.tsx` en el panel de gestión: qué se borra (los documentos de
  soporte de cada egresado no), a quién se avisa, justificación y confirmación; el botón final se habilita con las dos.
  Con la propuesta en ejecución, el panel dice que corresponde una baja.
- Registro plegable «Propuestas eliminadas» al final de Gestión de Propuestas
  (`components/revisarPropuesta/PropuestasEliminadas.tsx`, solo superadministrador).
- Probado con una copia desechable de la propuesta 89: eliminada, registrada, notificada; la 70 (en ejecución) no
  muestra el botón. Registro y aviso de prueba borrados.

### A6. Prioridad del asesor
- Al asignar asesor (asignación directa de la administración y la del coordinador), los asesores que ya trabajan o
  trabajaron con la empresa de la propuesta aparecen primero con **estrella y «Prioritario»** y el motivo («Asesora 2
  propuestas de esta empresa en la cohorte actual», «Asesoró a esta empresa en la cohorte C1-2026»).
- En la lista de **coordinadores** se quita la prioridad («Conoce la empresa» pasa a ser solo un dato, sin destacar).
- Se mantiene la regla de C2: sin coordinador ni administrador de facultad que asigne, aparece la asignación directa a
  los asesores configurados para la carrera y facultad.

**Hecha (26-nov-2026).**
- Cálculo `prioridadPorEmpresa` en `lib/asignacionServidor.ts`: propuestas de la misma empresa con asesor (salvo
  rechazadas o anuladas), separando la cohorte de la propuesta de las anteriores. Textos y orden en
  `src/lib/prioridadAsesor.ts` («Asesora 2 propuestas de esta empresa en esta cohorte», «Trabajó con esta empresa en
  C2-2026»). Orden: primero quien la asesora en esta cohorte, luego quien trabajó con ella antes, luego carrera y carga.
- Marca `components/asesores/Prioritario.tsx`: estrella dibujada en SVG (no emoji) y «Prioritario».
- Asignación directa de la administración (`ReviewForm`): la marca y el motivo en cada asesor prioritario.
- Asignación del coordinador (`CoordinadorDashboardClient`): al abrir «Asignar asesor» se cargan los asesores de esa
  propuesta (`getAsesoresFacultad(propuestaId)`, que ahora devuelve el motivo y los ordena también sin configuración de
  cohorte). La lista es desplegable, así que la opción lleva «★ Prioritario ·» como texto, y debajo se muestra la marca
  con el motivo del elegido.
- Coordinadores: se quitó «Conoce la empresa» como destacado y el orden por empresa; se ordenan por carga (la cantidad
  con esa empresa sigue como dato).
- Probado con la propuesta 67 (empresa 19, cohorte C3-2026): Marco Antony Solis aparece primero, «Prioritario»,
  «Trabajó con esta empresa en C2-2026». Sin probar en el navegador: la ventana del coordinador (no había propuesta
  con empresa esperando asesor de un coordinador).

## 3. Preguntas

1. **¿Hasta cuándo puede rechazar la administración?** Propuesta: mientras está pendiente de asignación o con
   coordinador asignado, es decir, antes de que un asesor la acepte. Después, los ajustes los pide el asesor.
2. **¿El coordinador también puede rechazar por requisitos?** En su pantalla ya tiene «Validar documentos
   obligatorios». Propuesta: sí, con la misma ventana de A2.
3. **«Modificar»: ¿todos los pasos o solo lo señalado?** Propuesta: todos, con el motivo visible; lo más común es
   cambiar un documento o la carta, pero así no se limita.
4. **Eliminar: ¿en qué estados?** Hoy solo borradores. Propuesta: cualquier estado **antes de en ejecución**; en
   ejecución ya hay plan, bitácora e informes y conviene otra figura (baja).
5. **Prioridad del asesor: ¿qué cuenta como «trabajó con la empresa»?** Propuesta: propuestas de esa empresa que el
   asesor aceptó (aprobadas, en ejecución o finalizadas), de cualquier cohorte; las de la cohorte actual primero.
6. **«Firmas verificadas»: ¿requisito para asignar o solo un registro?** Propuesta: solo registro y aviso; no bloquea.

### Respuestas del usuario (26-nov-2026)

1. La administración revisa **solo antes de asignar** (a coordinador o asesor); después ya no es su trabajo. Rechaza
   únicamente con la propuesta pendiente de asignación.
2. El coordinador **también** rechaza por requisitos, igual que la administración (mientras la tiene para asignar
   asesor).
3. Modificar: todos los pasos, con el motivo visible.
4. Eliminar: cualquier estado antes de «En ejecución».
5. Prioridad: propuestas de esa empresa que el asesor aceptó, de cualquier cohorte; la cohorte actual primero.
6. «Firmas verificadas»: solo registro y aviso.

## 4. Orden sugerido

A1 → A2 → A3 (el rechazo no sirve sin el lado del egresado) → A4 → A5 → A6. A1 no depende de las respuestas.
