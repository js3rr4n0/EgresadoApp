# Ajustes al redactar la propuesta: equipo, empresa, fortaleza, objetivos SMART y carta

Notas del usuario del 26-nov-2026 (cuarto bloque). Aplica a proyecto e investigación (pasos de la ficha); lo de datos
empresariales y carta aplica también a pasantía donde se usan los mismos formularios. Diseño de la universidad, sin
emojis.

## 1. Cómo funciona hoy

| Punto | Hoy | Dónde |
|-------|-----|-------|
| Integrantes del equipo | Van **dentro del paso Portada**, debajo de los botones. | `components/proyecto/ProyectoPortadaForm.tsx` |
| Portada del documento en grupo | El documento impreso **sí** lista el nombre y carnet de todos los integrantes aceptados. El formulario de la portada solo muestra al usuario activo. | `egresado/redactar/imprimir/page.tsx`, `ProyectoPortadaForm.tsx` |
| Datos empresariales | Buscador de empresas; debajo «¿Empresa no encontrada?» abre un formulario con dos opciones: «existe pero los datos no son correctos» y «no existe». Para cambiar de empresa hay que borrar el texto del buscador. | `components/DatosEmpresarialesForm.tsx` |
| Problema, justificación, alcance | Un solo bloque de texto cada uno. | `detalles_proyecto.descripcion_problema`, `justificacion`, `alcance` |
| Objetivos específicos | De 3 a 4 por integrante (configurable en la ficha: mínimo y máximo por integrante). | `lib/fichas/objetivos.ts` |
| Documentos por integrante | **Ya** se exige que cada integrante tenga sus tres documentos antes de enviar. Falta probarlo. | `actions/proyecto.ts` (validación de envío) |
| Carta de aceptación (proyecto e investigación) | Se sube el PDF y se escriben a mano los datos del supervisor (nombres y apellidos separados). No se eligen firmantes ni supervisores de la empresa. | `components/proyecto/CartaProyectoForm.tsx` |
| Revisión antes de enviar | Hay vista previa, pero no es obligatoria. | |

## 2. Respuestas a las preguntas de las notas

- **¿La portada en grupo agrega nombre y carnet de los integrantes?** Sí, el documento ya lo hace. En el
  formulario de la portada se agregará lo mismo (solo lectura); «¿Datos erróneos?» sigue siendo solo para el propio
  usuario.
- **¿Se puede medir la fortaleza del alcance?** No la calidad, pero sí la completitud, igual que en los otros
  elementos. Propuesta: dividir el alcance en 4 partes de 25 % cada una: **qué incluye**, **qué no incluye**,
  **entregables o productos** y **supuestos y restricciones**. Una parte cuenta cuando tiene un mínimo de palabras.
- **¿Cómo valida el sistema que un objetivo es SMART?** No puede saber si es alcanzable, pero sí puede revisar su
  forma. Propuesta: cada objetivo se escribe en 5 campos y el sistema arma la oración:

| Letra | Campo | Qué revisa el sistema |
|-------|-------|------------------------|
| S (específico) | Verbo en infinitivo + qué se hará | El verbo está en la lista recomendada (diseñar, desarrollar, implementar, evaluar...) y no en la de verbos vagos (conocer, entender, saber, aprender) |
| M (medible) | Indicador o resultado medible | Tiene una cantidad, porcentaje o entregable concreto |
| A (alcanzable) | Recursos o medios | Campo lleno (lo valida el asesor) |
| R (relevante) | Relación con el problema | Campo lleno |
| T (temporal) | Plazo | Indica un plazo dentro de la duración del proceso |

  Cada objetivo vale lo que cumpla de esas 5 condiciones; los que no llegan al mínimo se marcan como débiles con el
  motivo.

## 3. Indicador de fortaleza

- Cada elemento con partes tiene un porcentaje: **problema** (4 partes), **justificación** (4 ópticas), **alcance**
  (4 partes) y **objetivos** (promedio SMART). Una parte cuenta cuando tiene un mínimo de palabras (configurable en la
  ficha).
- **Fortaleza de la propuesta** = promedio de esos elementos. Se muestra al egresado en cada paso y en el resumen, y al
  asesor y al coordinador al revisar la propuesta.
- **Validación:** con menos de **75 %** en un elemento no se avanza al siguiente paso, y con menos de 75 % en total
  no se envía. Entre 75 % y 99 % se puede enviar, con un aviso de que el asesor podría pedir ajustes. El 75 % es un
  parámetro de la ficha.
- Propuestas ya redactadas con un solo bloque: su texto se coloca en la primera parte de cada elemento.

## 4. Entregas

### R1. Equipo antes de la portada
- Paso nuevo **«Equipo de trabajo»** antes de la portada: elegir **individual** o **en grupo**; en grupo, invitar
  integrantes como hoy. Siempre accesible desde el menú de pasos para agregar o quitar integrantes más adelante.
- La portada muestra los integrantes aceptados (nombre y carnet) además del usuario activo.
- Orden: Equipo de trabajo → Portada → demás elementos.

**Hecha (26-nov-2026).**
- Paso virtual «Equipo de trabajo» (no es un elemento de la ficha): se antepone en `egresado/redactar/page.tsx` solo para
  proyecto e investigación y corre la numeración de los demás pasos. Componente
  `components/proyecto/EquipoTrabajoForm.tsx`: elección individual o en grupo, invitar, quitar, transferir rol,
  ratificación y «Salir del grupo» (se movieron tal cual desde la portada). La elección no se guarda aparte: con
  integrantes aceptados o invitados es en grupo, y «Individual» se bloquea hasta quitarlos.
- La portada ya no tiene la sección de integrantes; muestra una tabla de solo lectura con los integrantes aceptados
  (nombre, carnet y título al que optan; `getEquipoProyecto` ahora devuelve `tituloCarrera`). «¿Datos erróneos?» sigue
  siendo solo para el propio usuario.
- Probado: propuesta 83 (individual, en redacción) y propuesta 70 (grupo de 3, líder `pro.lider@prueba.test`).

### R2. Datos empresariales
- «¿Empresa no encontrada?» solo abre el registro de **empresa nueva**.
- «Los datos de esta empresa no son correctos» aparece **en la tarjeta de la empresa seleccionada**, junto a sus datos,
  y abre la solicitud de corrección ya con esa empresa.
- Botón **«Cambiar empresa»** (y una X en el buscador) para quitar la selección sin borrar el texto a mano.

**Hecha (26-nov-2026)** en `components/DatosEmpresarialesForm.tsx` (lo usan proyecto, investigación y pasantía).
- Con una empresa seleccionada: tarjeta «Empresa seleccionada» con «Cambiar empresa», y al final de sus datos el aviso
  «¿Algún dato de esta empresa no es correcto?» que abre la solicitud de corrección con esa empresa (o sucursal) ya
  elegida y sus datos precargados.
- Sin empresa: «¿Tu empresa no aparece en la lista?» abre directo el registro de empresa nueva. Se quitó el modal
  con las dos opciones.
- X en el buscador y «Cambiar empresa» limpian la selección y dejan el cursor en el buscador. No se guarda nada hasta
  «Guardar borrador» o «Guardar y continuar».
- Probado con la propuesta 83 (sin enviar solicitudes).

### R3. Fortaleza en problema, justificación y alcance
- **Descripción del problema u oportunidad**, con el mensaje «Justifica o agrega los datos correspondientes»:
  descripción, datos del problema u oportunidad, proyecciones y conclusiones (25 % cada una).
- **Justificación**: operativa, en beneficio del cliente, económica y social, cada una con texto de ayuda.
- **Alcance**: incluye, no incluye, entregables, supuestos y restricciones.
- Barra de fortaleza por elemento y total; bloqueo bajo 75 %; visible para asesor y coordinador.
- Documento impreso: cada parte como subtítulo dentro de su apartado.

**Hecha (26-nov-2026).**
- Reglas y textos de ayuda: `src/lib/fortaleza.ts`. Cálculo desde lo guardado: `src/lib/fortalezaServidor.ts`.
  Guardado: `actions/partesPropuesta.ts` (solo el líder). Columnas nuevas `problema_partes`, `justificacion_partes`,
  `alcance_partes` en `detalles_proyecto` (`scripts/crear_partes_propuesta.ts`, ya corrido en desarrollo). La columna
  de texto de siempre guarda el texto armado con un subtítulo por parte, así el documento, el protocolo y el informe
  final lo siguen leyendo sin cambios.
- Mínimo por parte (respuesta 2): «Palabras mínimas» del elemento en la ficha repartidas entre las 4 partes (en la
  ficha base está en 0: basta con que la parte tenga texto). «Palabras máximas» limita el total de las 4 partes.
- Formulario `components/proyecto/PartesElementoForm.tsx` para los tres apartados: barra del apartado, cada parte con
  su ayuda y su estado; «Guardar y continuar» se desactiva bajo 75 %. El paso siguiente no se desbloquea bajo 75 %.
- Envío: `verificarCapacidadEnvio` rechaza si algún apartado o el total está bajo 75 %.
- Visible en el menú de pasos del egresado y en la propuesta para asesor, coordinador y administración
  (`components/fortaleza/FortalezaResumen.tsx`). Las propuestas redactadas antes muestran 25 % por apartado con una
  nota que lo explica.
- De paso, el mensaje de firmas pendientes ahora manda al paso «Equipo de trabajo» (antes decía «Portada»).
- Los formularios anteriores (`DescripcionProblemaForm`, `JustificacionProyectoForm`, `AlcanceProyectoForm`) quedaron
  sin uso; se pueden borrar.
- Probado con la propuesta 83 (50 % bloquea, 75 % habilita y desbloquea Justificación; luego se dejó vacía) y la
  vista del asesor de la propuesta 70. Sin probar: el documento impreso con los subtítulos y un envío real.

### R4. Objetivos SMART y cantidad
- Objetivo específico en 5 campos con revisión SMART y fortaleza por objetivo.
- Cantidad nueva por defecto: **1 persona: de 4 a 5; 2 o 3 personas: 4 por integrante** (exactos). Configurable en la
  ficha con dos rangos: individual y por integrante en grupo.

**Hecha (26-nov-2026).**
- Cantidad: `lib/fichas/objetivos.ts` ahora tiene una regla con dos rangos (`reglaObjetivosDe`): individual de 4 a 5 y
  en grupo 4 por integrante (12 para 3 personas). La ficha los configura en el elemento «Objetivos» con cuatro
  parámetros nuevos (`minIndividual`, `maxIndividual`, `minPorIntegrante`, `maxPorIntegrante`); los anteriores
  (`minEspecificos`, `maxEspecificos`) ya no se leen, así la regla nueva aplica a todas las fichas sin tocarlas. La misma
  regla rige la propuesta, el envío, el protocolo y el plan de trabajo.
- Un número que una ficha no guardó toma su valor por defecto también al validar (`validar.ts`); antes, las fichas
  existentes marcaban error en los parámetros nuevos.
- Revisión SMART sobre el texto (respuesta 3): `src/lib/smart.ts`. Revisa título y descripción de cada objetivo
  específico: verbo en infinitivo que no sea vago (S), cantidad, porcentaje o entregable (M), medios (A), para qué (R) y
  plazo (T). Cada criterio vale 20 %; un objetivo es sólido desde 80 %. Revisa la forma, no el fondo: lo dice la pantalla.
- Fortaleza de los objetivos = promedio SMART de los específicos (los que faltan para el mínimo cuentan 0 %). Entra en
  la fortaleza total con problema, justificación y alcance, y sigue la regla de 75 % para avanzar y enviar.
- Formulario `ObjetivosProyectoForm.tsx`: barra de fortaleza, las cinco letras bajo cada objetivo con lo que falta, y
  «Guardar y continuar» desactivado bajo 75 % (el borrador se guarda igual). Se quitó el emoji de las indicaciones del
  asesor.
- «Reenviar propuesta ajustada» no revisaba nada; ahora rechaza si algún apartado o el total está bajo 75 %.
- `scripts/fichas/verificar_fichas.ts` actualizado a la regla nueva, con pruebas SMART (todo en orden).
- Probado: propuesta 83 (individual, «de 4 a 5»: 3 objetivos completos y uno vago dan 75 % y habilitan; quitar un plazo
  baja a 70 % y bloquea; guardar avanza al paso 8; luego se dejó vacía), propuesta 70 (grupo de 3: «12 (4 por
  integrante, 3 integrantes)») y el editor de fichas (4, 5, 4 y 4).

### R5. Carta de aceptación: firmantes y supervisor
- Después de subir la carta: elegir **firmante(s)** y **supervisor** de la empresa seleccionada en listas
  desplegables.
- Si no están: agregarlos con **nombre completo** (un solo campo), título, cargo, correo y teléfono; se envían como
  solicitud a la administración (aparecen en Gestión de Empresas) y, al aprobarse, quedan en la empresa.
- **Sin supervisor empresarial** (trabajo que no es para una empresa u otro motivo): opción explícita con motivo; se
  envía siempre como solicitud para que la administración la valide.

**Hecha (26-nov-2026)** para proyecto e investigación (`CartaProyectoForm`; la carta de pasantía no cambia).
- Base: `scripts/crear_personas_carta.ts` (ya corrido en desarrollo) agrega a `cartas_aceptacion` `firmante_ids`,
  `supervisor_id`, `sin_supervisor` y `motivo_sin_supervisor`, y el tipo `carta` a `solicitudes_empresa`.
- Reglas: `src/lib/personasCarta.ts` (de 1 a 3 firmantes; exactamente uno de: supervisor de la lista, supervisor nuevo o
  sin supervisor; motivo de al menos 20 caracteres; personas nuevas con nombre completo, título, cargo, correo y
  teléfono). Datos: `src/lib/personasCartaServidor.ts` (firmantes y supervisores de la empresa y de su sucursal).
- Formulario: `components/proyecto/PersonasCarta.tsx` dentro de la carta. Firmantes en casillas, supervisor en lista
  desplegable con «El supervisor no está en la lista» y «Sin supervisor empresarial». Se quitaron los campos escritos a
  mano del supervisor; los datos `sup_*` se llenan solos desde el supervisor elegido (el documento los sigue leyendo).
- Guardar (`actions/personasCarta.ts`, solo el líder): lo nuevo va en **una sola solicitud** de tipo «carta»; si ya hay
  una pendiente se reemplaza su contenido, y si ya no queda nada nuevo se retira. Se avisa al superadministrador.
- Con la solicitud pendiente el paso cuenta como hecho y se puede seguir redactando, pero **no se puede enviar**
  (`verificarCapacidadEnvio`). La carta muestra el aviso de revisión o el motivo del rechazo.
- Gestión de Empresas: la solicitud aparece como «Carta de aceptación» con su detalle. Aprobar
  (`lib/solicitudCartaServidor.ts`) registra los firmantes y el supervisor en la empresa (nombre completo dividido en
  nombres y apellidos, porque el editor de empresas pide los dos) y los deja elegidos en la carta; rechazar no registra
  nada y, si pedía «sin supervisor», la carta vuelve a pedir uno. **Ninguna de las dos cambia el estado de la
  propuesta** (las solicitudes de empresa de siempre sí la bloquean).
- Probado con la propuesta 83 y la Cooperativa Láctea de Prueba: firmante de la lista más firmante y supervisor
  nuevos → solicitud → envío bloqueado → aprobada → quedan en la empresa y elegidos; luego «sin supervisor» con motivo
  corto (rechazado por el formulario) y válido → solicitud → rechazada con motivo → la propuesta sigue en redacción y el
  envío pide supervisor. Datos de prueba borrados. Sin probar: aprobar un «sin supervisor» y un envío real.

### R6. Documentos por integrante y revisión obligatoria
- Probar la validación existente de los tres documentos por integrante y mostrar, antes de enviar, quién tiene
  documentos pendientes.
- Paso final **«Revisión del documento»**: vista del documento completo y casilla «Revisé el documento y confirmo
  que está listo»; sin esa confirmación no se habilita «Enviar». Si cambia algo después, la confirmación se vuelve a
  pedir.

**Hecha (26-nov-2026)** para proyecto e investigación (pasantía sigue enviando desde su paso de documentos).
- Paso virtual final **«Revisión y envío»** (como «Equipo de trabajo», no es un elemento de la ficha), en
  `components/proyecto/RevisionEnvio.tsx`: lo que falta para enviar, documentos por integrante, el documento completo
  (la vista de impresión dentro de la página, con `?embebido=1` para quitar encabezado y botones), la casilla de
  confirmación (solo el líder) y «Enviar propuesta», que se habilita con todo completo y la confirmación vigente.
- El paso de documentos ya no envía en proyecto e investigación: muestra la tabla «Documentos del equipo» y
  «Continuar».
- Documentos por integrante (`lib/revisionPropuestaServidor.ts`, `TablaDocumentosEquipo.tsx`): la validación existente
  funcionaba; ahora el mensaje de envío dice a quién le falta cuál documento.
- Confirmación: tabla nueva `revisiones_propuesta` (`scripts/crear_revision_propuesta.ts`, ya corrido en desarrollo;
  tabla aparte para no tocar `propuestas`). Guarda una huella de lo que sale en el documento: la de la ratificación más
  la empresa, el supervisor y la carta. Si algo cambia, la confirmación deja de valer y el paso lo avisa.
  `verificarCapacidadEnvio` la exige al enviar.
- En trabajo individual el envío es la ratificación (H15), así que el paso no la muestra como pendiente.
- Probado con la propuesta 83: falta un documento → aparece en la tabla y en «Antes de enviar»; con todo, confirmar
  habilita «Enviar propuesta»; un cambio después de confirmar quita la confirmación (en la página y en la validación del
  servidor). Datos de prueba borrados. Sin probar: un envío real y la vista de un integrante que no es líder.

## 5. Respuestas del usuario (26-nov-2026)

1. El 75 % se exige **en todo**: por elemento para avanzar y en total para enviar.
2. El mínimo de cada parte debe salir de lo que **ya configura la ficha** para el elemento (el texto de ayuda ya
   dice la cantidad); no se agrega otro parámetro.
3. Objetivos: **se mantiene la estructura actual** (no 5 campos); la revisión SMART se hace sobre el texto.
4. Alcance: sí, las 4 partes propuestas.
5. Pasantía: todavía no; se revisará después.
6. Supervisor y firmante nuevos: en **la misma solicitud** de empresa.

## 6. Preguntas originales

1. ¿El 75 % se exige por elemento (para avanzar) y en total (para enviar), o solo en total?
2. ¿Cuántas palabras mínimas cuenta cada parte para sumar su 25 %? Propuesta: 40 palabras.
3. ¿Los objetivos SMART en 5 campos, o un solo texto con la revisión automática? (Los campos dan una revisión más
   confiable.)
4. Alcance: ¿sirven las 4 partes propuestas?
5. ¿La fortaleza aplica también a pasantía (su justificación)?
6. Supervisor y firmante nuevos: ¿se aprueban en la misma solicitud de empresa o por separado?
