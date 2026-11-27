# Coordinador: revisión, asignación y solicitudes

Notas del usuario del 27-nov-2026 (octavo bloque). Usuario coordinador, etapa de **solicitudes, revisión y asignación**
de propuestas. El «Seguimiento» de trabajos en ejecución queda para después. Diseño de la universidad, sin emojis, con
paginado y filtros sencillos en las listas.

## 1. Cómo funciona hoy

| Punto | Hoy | Dónde |
|-------|-----|-------|
| Menú | «Coordinación de Propuestas», «Seguimiento de Pasantías», «Asesores» (récord de valoraciones, V5). | `coordinador/layout.tsx` |
| Panel | Encabezado rojo con degradado y tres pestañas: «Ver Solicitudes / Propuestas a Asignar», «Mis Propuestas Asignadas», «Solicitudes de Baja». Tablas sin paginado, sin búsqueda ni filtros, con emojis («📄 Revisar / Docs», «📊 Gantt»). | `CoordinadorDashboardClient.tsx` (1158 líneas) |
| Lista por asignar | Propuestas con `coordinador_id` = el coordinador en estado `coordinador_asignado` o `aprobada`. Muestra la última solicitud al asesor (esperando, rechazada con motivo, aceptada). | `getPropuestasPendientesCoordinador` |
| Ventana «Revisar» | Cuatro pestañas: **«Validar Documentos»** (sube propuesta aceptada, plan firmado y los dos dictámenes: trabajo del asesor, de una etapa posterior), visor PDF (la única útil), «Info» e «Historial». | modal del panel, `DocumentosPropuestaSection.tsx` |
| Página «↗ Página» | Seis pestañas, también con «Validar Documentos Obligatorios», «Plan» y datos del seguimiento: es la página del asesor adaptada. Arriba, la fortaleza (R3). | `coordinador/propuestas/[id]` |
| Asignar asesor | Lista de asesores según la configuración de la cohorte (C2), con «Prioritario» por la empresa (A6) y la carga (en curso + solicitudes pendientes). **No hay un cupo máximo** por asesor: la carga se muestra pero no limita. | `getAsesoresFacultad`, `opcionesAsesor` |
| Rechazar por requisitos | Existe (A2). | `RechazarPropuesta` |
| Verificaciones previas | El administrador puede asignar coordinador **sin que el sistema revise nada**: empresa, fortaleza, carta, firmas. Las firmas verificadas (A4) son solo constancia. | `asignarPropuestaACoordinador` |
| Sin supervisor empresarial | La propuesta sin supervisor va como solicitud de tipo «carta» (R5); el administrador la aprueba **con un botón, sin mensaje**, y nadie más ve que fue aprobada así. | `aprobarSolicitudCarta` |
| Solicitudes de baja | Solo las pide el asesor; las ve y responde **solo el coordinador** (aprobar = propuesta anulada). El administrador no las ve. | `solicitudes_baja` |
| Cambio de asesor | **No existe** (la pantalla «SolicitudesCambioAsesor» es de cambios al cronograma). | — |
| Solicitudes de empresa | Solo el superadministrador, en «Gestión de Empresas». | `/admin/empresas` |
| Datos para la demanda | No hay nada: el coordinador no sabe cuántos egresados de su carrera hay en la cohorte ni cuántos faltan por enviar. | — |

## 2. Entregas

### D1. Lo que se verifica antes de llegar al coordinador
Regla: si algo de esto falla, la propuesta **no se puede asignar a un coordinador** (ni a un asesor directo cuando no hay
coordinador). El administrador ve la lista en «Revisar propuesta» y el botón de asignar queda deshabilitado con el
motivo.
1. Empresa registrada y válida (aprobada en el catálogo, no dada de baja).
2. Fortaleza de los elementos en nivel alto (la misma regla de R3, en el servidor).
3. Patrocinadores o involucrados completos (lo que la ficha pide).
4. Carta: firmantes y supervisor resueltos, sin solicitudes de «carta» pendientes; **firmas verificadas** (ver pregunta 4).
5. Si no tiene supervisor: la solicitud aprobada por la administración, con su mensaje (D2).

Las propuestas que ya están con un coordinador y no cumplen (datos viejos) se marcan en su lista para que las rechace
por requisitos (A2).

**Hecha (27-nov-2026).**
- `lib/requisitosAsignacionServidor.ts` (`requisitosAsignacion`, `errorRequisitos`): empresa del catálogo habilitada y sin
  solicitudes de empresa pendientes; fortaleza de cada apartado y total en 75 % o más (si la ficha la mide); actores que
  pide la ficha, escritos; carta subida con firmantes y supervisor validados (en pasantía, supervisor registrado);
  **firmas verificadas** vigentes (respuesta 4) y, si va sin supervisor, la constancia de D2.
- Servidor: `asignarPropuestaACoordinador`, `asignarAsesorDirecto` y `asignarAsesorCoordinador` rechazan la asignación
  con la lista de lo que falta.
- Administración (`ReviewForm`): recuadro «Requisitos para asignar» con cada punto en verde o rojo; el botón de asignar
  queda deshabilitado hasta que todo cumple. Reemplaza el aviso de firmas de A4. Componente `ListaRequisitos`.
- Coordinador: en «Propuestas a asignar», marca «Requisitos incompletos» con lo que falta y sin «Asignar Asesor»; en la
  página de la propuesta (mientras no tiene asesor), tarjeta «Verificado antes de asignar» y sin «Asignar Asesor» si
  falta algo.
- Probado: pasantía 67 (solo faltaban las firmas) con la lista y el botón deshabilitado; al marcar «Firmas verificadas»
  todo en verde y el botón habilitado (no se envió nada; la verificación de prueba se borró). Propuesta 88 en el panel de
  `admin.ingenieria@uni.test` con la marca y sin el botón.
- Efecto en los datos de prueba: de las 9 propuestas que esperan asignación, ninguna cumple todo (empresa sin catálogo,
  fortaleza de propuestas anteriores al indicador, cartas sin firmas verificadas). La 88 ya tenía una solicitud al
  asesor enviada antes de D1.

### D2. Constancia «Validado por decanato sin supervisor empresarial»
- Al aprobar una solicitud de carta sin supervisor, el administrador escribe un **mensaje obligatorio** (mínimo 20
  caracteres), igual que al rechazar.
- Se guarda quién, cuándo y el mensaje (tabla aparte, sin columnas nuevas en `propuestas`).
- El coordinador y el asesor lo ven en la propuesta como una franja: «Validado por decanato sin supervisor empresarial»,
  con el mensaje, el nombre y la fecha. También sale en el historial.

**Hecha (27-nov-2026).**
- Tabla `validaciones_sin_supervisor` (por solicitud: propuesta, mensaje, quién y cuándo). Script
  `scripts/crear_validaciones_sin_supervisor.ts` (corrido en desarrollo; falta en la base principal).
- `aprobarSolicitudEmpresa(id, mensaje)`: una carta «sin supervisor» no se aprueba sin un mensaje de al menos 20
  caracteres (revisado en el servidor). `aprobarSolicitudCarta` guarda la constancia y el aviso al egresado incluye el
  mensaje.
- Gestión de Empresas (`SolicitudesTable`): al aprobar una carta sin supervisor se abre «Aprobar sin supervisor
  empresarial» con el motivo del egresado, el campo del mensaje y su contador; el botón se habilita con 20 caracteres.
- `lib/constanciaSinSupervisorServidor.ts` y `components/revisarPropuesta/ConstanciaSinSupervisor.tsx`: franja
  «Validado por decanato sin supervisor empresarial» (mensaje, motivo del egresado, quién aprobó y fecha) en la página del
  asesor, del coordinador y de la administración. Si la carta sigue esperando respuesta, aviso «pendiente de
  aprobación». Las aprobaciones anteriores salen sin mensaje, con una nota. Solo vale mientras la carta siga sin
  supervisor.
- Historial de la propuesta (`getHistorialCompletoProyecto`): evento con el mensaje.
- Probado con la propuesta 70 y una solicitud temporal: ventana con el botón deshabilitado hasta escribir, aprobación,
  franja en las tres páginas (asesor de prueba `ases.salud.conf@uni.test` puesto por un momento), evento en el
  historial y aviso al egresado. Todo restaurado (solicitud, constancia, aviso, carta y asesor 39).

### D3. Panel del coordinador nuevo: secciones, paginado y filtros
- Menú del coordinador (ver pregunta 5): «Por revisar y asignar», «Mis propuestas asignadas», «Cupos de asesores»,
  «Propuestas por recibir», «Asesores por empresa», «Solicitudes», y lo que ya está («Asesores», «Seguimiento»), cada
  uno con su número de pendientes.
- Diseño igual al resto ya ajustado: encabezado sobrio sin degradado, tablas con estados en texto, sin emojis, fechas
  con `fechasTexto`.
- En cada lista: búsqueda por título o egresado, filtros por modalidad, carrera y estado, paginado de 10 en 10.
- «Por revisar y asignar» (antes «Ver solicitudes / Propuestas a asignar»): las propuestas que el administrador le
  asignó, con el estado de la solicitud al asesor.

**Hecha (27-nov-2026).**
- Menú del coordinador (`coordinador/layout.tsx`): «Por revisar y asignar» (`/coordinador`), «Mis propuestas asignadas»
  (`/coordinador/asignadas`), «Solicitudes» (`/coordinador/solicitudes`), «Asesores» y «Seguimiento de pasantías». Las
  secciones de D5 a D7 se suman al menú cuando se hagan. Números de pendientes en el menú (`lib/contadoresCoordinador.ts`;
  `NavItem.contador` en `DashboardHeader`).
- Cada lista es una página con búsqueda sin tildes, filtros (modalidad, carrera, estado) y paginado de 10, todo en la
  dirección (`lib/filtrosListado.ts`, `components/coordinador/FiltrosListado.tsx`, el `Paginacion` existente).
- «Por revisar y asignar»: solo propuestas sin asesor (antes también salían las aceptadas). Columnas: recibida,
  propuesta (modalidad, número, título y requisitos incompletos de D1), egresados y carrera, asesoría (sin solicitar,
  esperando, rechazada con el motivo a la vista). Acciones: «Revisar» (página de la propuesta), «Asignar asesor» o
  «Elegir otro asesor» (`AsignarAsesor`: asesores de la cohorte, prioritarios, de la carrera y carga) y «Rechazar» (A2).
  Filtro de estado: sin asesor solicitado, esperando, rechazada, requisitos incompletos.
- «Mis propuestas asignadas»: solo las que ya tienen asesor, con carrera, estado con su nombre y fechas en texto.
- «Solicitudes»: bajas, pendientes primero; «Resolver» (`ResolverBaja`) con confirmación en dos pasos para anular.
- Se borró `CoordinadorDashboardClient.tsx` (1158 líneas: encabezado con degradado, pestañas, emojis y la ventana de cuatro
  pestañas). La ventana «Revisar» ya no existe; «Revisar» abre la página de la propuesta, que se rehace en D4.
- Probado con `admin.ingenieria@uni.test`: la 88 con requisitos incompletos y sin «Asignar asesor»; búsqueda y filtros
  por la dirección; la 84 pasada por un momento a esa cuenta en «Mis propuestas asignadas»; una baja temporal resuelta
  como rechazada (la propuesta no cambió) y el contador del menú bajó. Restaurado (coordinador 38, baja borrada). No se
  probó en el navegador la ventana «Asignar asesor» (ninguna propuesta de prueba cumple los requisitos de D1) ni el
  paginado con más de 10 filas.

### D4. Revisar y asignar: una sola vista
Reemplaza la ventana de cuatro pestañas y la página adaptada del asesor (para propuestas que todavía no tienen asesor):
- **Lo que ya verificó el sistema y la administración** (D1), en una lista con marca de cumplido: empresa, fortaleza,
  involucrados, carta y firmas, y la constancia sin supervisor (D2) si aplica.
- **Lo que revisa el coordinador**: el documento de la propuesta en el visor (claridad, objetivos SMART, involucrados,
  datos de la carta), los documentos de soporte plegables (como A1) y el historial.
- **Asignar asesor** al lado: asesores de la configuración de la cohorte (C2), «Prioritario» por la empresa (A6), de la
  carrera, su carga y su cupo (D5); si la solicitud anterior fue rechazada, el motivo y «Elegir otro asesor».
- **Rechazar por requisitos** (A2), como hoy.
- Sin «Validar documentos», dictámenes ni plan: eso es del asesor y de una etapa posterior. La página de propuestas ya
  asignadas se queda como está hasta el bloque de «Seguimiento».

**Hecha (27-nov-2026).**
- `/coordinador/propuestas/[id]`: si la propuesta no tiene asesor y espera asignación, muestra la vista nueva
  (`components/coordinador/RevisarAsignar.tsx`); solo la ve el coordinador asignado o la administración. Con asesor, la
  página anterior sigue igual hasta el bloque de «Seguimiento».
- Vista: encabezado (número, modalidad, título, estado, cohorte, carrera, empresa, fecha de envío) y cinco tarjetas:
  1. «Verificado antes de asignar»: lista de D1, constancia sin supervisor (D2) y fortaleza.
  2. «Documento de la propuesta»: el documento completo dentro de la página (`imprimir?embebido=1`, sin menú ni
     botones), con lo que debe revisar el coordinador.
  3. Egresado o equipo. 4. Empresa y carta (fechas, carta plegable con el estado de las firmas, firmantes y supervisor
     con su firma registrada). 5. Documentos de soporte plegables por integrante.
  Luego los rechazos anteriores y el historial.
- Panel lateral (`PanelAsignacion.tsx`): regla de la cohorte, solicitud de asesoría vigente (esperando, rechazada con
  motivo, aceptada), lista de asesores con búsqueda (prioritarios, de la carrera, carga), «Enviar solicitud al asesor» y el
  rechazo por requisitos (A2). Con requisitos incompletos o una solicitud esperando, no hay lista.
- Sin «Validar documentos», dictámenes, plan de trabajo ni emojis en esta etapa.
- Las piezas de la revisión del administrador (`Tarjeta`, `Dato`, `Persona`) pasaron a
  `components/revisarPropuesta/PiezasExpediente.tsx` y las usan las dos páginas. El documento imprimible acepta
  `?embebido=1`.
- Probado con `admin.ingenieria@uni.test` y la pasantía 67 preparada por un momento (con coordinador, solicitud anterior
  rechazada y firmas verificadas): todo en verde, documento dentro de la página, asesores con «Prioritario», envío de la
  solicitud y paso a «Esperando respuesta». Propuesta 88: requisitos incompletos y sin lista. Página del administrador
  sin cambios visibles. Todo restaurado (propuesta 67 «enviada» sin coordinador, su solicitud pendiente, sin
  verificación de firmas; solicitud, historial y aviso de prueba borrados).

### D5. Cupos de asesores
- Asesores que participan en la cohorte para las carreras del coordinador, **agrupados por carrera** (un asesor de
  varias carreras sale en cada una, con su carga total).
- Por asesor: procesos en curso, solicitudes pendientes de responder, cupo máximo y lo disponible, con estado
  «Disponible», «Casi lleno» (queda 1) o «Lleno». Se puede abrir la lista de sus procesos.
- Totales por carrera: cupos disponibles.
- Cupo máximo: ver pregunta 1.

**Hecha (27-nov-2026).**
- Cupo por asesor en la configuración de la cohorte (respuesta 1): tabla `cohorte_cupos_asesor` (cohorte, facultad,
  asesor, cupo; sin fila = 5). Script `scripts/crear_cupos_asesor.ts` (corrido en desarrollo; falta en la base
  principal). `Participante.cupo`, `CUPO_POR_DEFECTO`, `estadoCupo` y nombres en `lib/configCohorte.ts`; la lectura y el
  guardado de la configuración lo incluyen (si la tabla no existe, la configuración igual se guarda). La bitácora anota
  «Cupo de … : N procesos».
- Configuración de la cohorte (`TarjetaFacultad`): campo «Cupo» (1 a 50) en cada asesor, con la explicación en la ayuda.
- Carga = procesos en curso (aprobada, primer contacto, en ejecución) más solicitudes pendientes, de todas las cohortes.
  `opcionesAsesor` devuelve `cupo` y `lleno` y deja a los llenos al final.
- Bloqueo: `asignarAsesorCoordinador` y `asignarAsesorDirecto` no envían la solicitud a un asesor con el cupo lleno
  («… tiene el cupo lleno (6 de 5). Elige otro asesor.»). En el panel de «Revisar y asignar», en «Asignar asesor» de la
  lista y en la asignación directa del administrador, el asesor lleno sale en gris, deshabilitado, con «Carga: x de y ·
  Cupo lleno»; los demás, con los lugares disponibles.
- Página `/coordinador/cupos` («Cupos de asesores» en el menú, `lib/cuposAsesoresServidor.ts`): cohorte (por defecto la
  más reciente donde participa quien consulta), búsqueda y filtro por estado; resumen (asesores, lugares disponibles,
  con cupo lleno) y una tabla por carrera con en curso, solicitudes pendientes, cupo, disponibles y estado
  («Disponible», «Casi lleno», «Cupo lleno»), más la lista plegable de sus procesos. Alcance: el coordinador ve sus
  carreras de la configuración; el administrador de facultad, su facultad; el superadministrador, todas.
- Probado: cohorte PRUEBA-CONF-2027 con `admin.ingenieria@uni.test` (Marco Antony Solís con 11 procesos: «Cupo lleno»;
  Mateo Rivas 3 de 5); filtro «Cupo lleno» y detalle de procesos; como `admin@uni.test`, cupo de Mateo cambiado a 3 en la
  configuración, guardado con su línea de bitácora, Mateo «Cupo lleno» en la página y marcado lleno en las opciones de
  la propuesta 88. Restaurado (sin cupos guardados, línea de bitácora borrada).
- Efecto en los datos de prueba: Marco Antony Solís (prioritario por la empresa de varias propuestas) ya supera el cupo
  de 5 y no puede recibir solicitudes nuevas hasta que se le suba el cupo.

### D6. Propuestas por recibir
- Para la cohorte que comienza y las carreras del coordinador: egresados registrados, cuántos ya enviaron propuesta
  (en grupo cuenta cada integrante), cuántos están en redacción y cuántos no han empezado.
- Comparación con D5: «Faltan 14 propuestas por recibir y hay 9 cupos disponibles en Ingeniería Civil».
- Lista de los pendientes (nombre, carnet, estado de su propuesta), con filtros y paginado. Solo lectura.

**Hecha (27-nov-2026).**
- `lib/porRecibirServidor.ts`: egresados activos de la cohorte (`usuarios.cohorte`) en las carreras de quien consulta. Cada
  persona cuenta por la propuesta de la cohorte en la que participa (líder o integrante aceptado), igual que el informe de
  recepción del administrador: «Ya envió», «Devuelta para corregir» (rechazada por requisitos), «En redacción» o «Sin
  empezar». Lugares disponibles por carrera desde D5; el total cuenta una sola vez a quien atiende varias carreras.
- `lib/alcanceCoordinacionServidor.ts`: cohorte y carreras de quien consulta (coordinador: sus carreras en la
  configuración; administrador de facultad: su facultad; superadministrador: todas), compartido con D5.
- Página `/coordinador/por-recibir` («Por recibir» en el menú): resumen (registrados, ya enviaron, por recibir, lugares de
  asesores), tabla por carrera con «¿Alcanza?» («Alcanza», «Faltan N lugares», «Nada por recibir»; solo carreras con
  egresados) y lista de egresados con búsqueda, carrera, estado (por defecto «Solo los que faltan»), paginado de 10 y
  botones de cohorte. Solo lectura.
- Menú del coordinador con nombres cortos para que quepa: «Por revisar y asignar», «Asignadas», «Cupos», «Por recibir»,
  «Solicitudes», «Asesores», «Seguimiento».
- Probado como `admin@uni.test`: C3-2026 Ejemplo (4 egresados, 1 envió, 3 sin empezar) y C1-2027 (Ingeniería Química: 4
  egresados, 2 enviaron, 2 en redacción, 2 lugares, «Alcanza»). Se corrigió el total de lugares (contaba varias veces a
  los asesores de varias carreras).

### D7. Asesores por empresa
- Empresas con propuestas de las carreras del coordinador: nombre, sector, ubicación, contacto principal, estado en el
  catálogo, número de procesos (en curso y anteriores) y sus asesores con cuántos procesos tiene cada uno ahí.
- Filtro por cohorte (actual o todas) y búsqueda. Solo lectura (el catálogo lo edita el superadministrador).

**Hecha (27-nov-2026).**
- `lib/asesoresPorEmpresaServidor.ts`: empresas de las propuestas enviadas (en espera de asesor o en curso, sin anuladas
  ni borradores) de egresados de las carreras de quien consulta (alcance de D5/D6). Por empresa: área, dirección,
  sucursales, habilitada y verificada en el catálogo, contacto principal (primer firmante de la sede principal; si no hay,
  el primer supervisor), propuestas (total, en curso, en espera de asesor), cohortes y asesores con sus propuestas en esa
  empresa.
- Página `/coordinador/empresas` («Empresas» en el menú; título «Asesores por empresa»): cohorte («Todas las cohortes» por
  defecto), búsqueda por empresa, área, dirección o asesor, filtro (con procesos en curso, sin asesor todavía,
  deshabilitadas), resumen (empresas, propuestas, asesores) y una tarjeta por empresa; paginado de 10. Solo lectura.
- Probado con `admin.ingenieria@uni.test`: 7 empresas, 9 propuestas, 3 asesores; búsqueda «marco» con procesos en curso
  devuelve sus 5 empresas. Se corrigió una expresión regular que borraba las «s» de los nombres de contacto.

### D8. Solicitudes: baja, cambio de asesor y empresas
- **Cambio de asesor (nuevo)**: lo pide el egresado (en grupo, el líder) o el mismo asesor, con motivo obligatorio,
  mientras la propuesta tiene asesor y no está finalizada. Lo atiende el coordinador o el administrador: al aprobar,
  elige el nuevo asesor con las mismas reglas que al asignar (D4, cupos); al rechazar, motivo. Ver pregunta 2.
- **Baja**: como hoy, y además la ve y atiende el administrador.
- **Empresas**: las solicitudes de empresa de egresados de sus carreras le aparecen al coordinador (ver pregunta 3).
- En el administrador, las de baja y cambio de asesor se suman a «Solicitudes» y a los contadores del menú. Lo que
  atiende uno desaparece para el otro, con quién lo resolvió.

**Hecha (27-nov-2026).**
- Tablas `solicitudes_cambio_asesor` y `bajas_resueltas` (quién resolvió cada baja). Script
  `scripts/crear_cambio_asesor.ts` (corrido en desarrollo; falta en la base principal).
- Cambio de asesor (`lib/cambioAsesor.ts`, `lib/cambioAsesorServidor.ts`, `actions/cambioAsesor.ts`):
  - Lo pide el egresado líder (tarjeta «Cambio de asesor» en Mi Trabajo de Graduación) o el asesor actual (página de la
    propuesta), con motivo de al menos 20 caracteres, si la propuesta tiene asesor y está aprobada, en primer contacto, en
    ejecución o con coordinador. Una sola solicitud abierta por propuesta. Avisa al coordinador y a la otra parte.
  - La atienden el coordinador de la propuesta (o el configurado para su carrera), la administración de la facultad o el
    superadministrador: «Rechazar» (respuesta obligatoria) o «Aprobar y elegir asesor» (sin el actual, con la
    configuración de la cohorte, prioritarios, carrera y cupo de D5; los llenos deshabilitados).
  - Aprobar envía una solicitud de asesoría al nuevo asesor; mientras responde, sigue el actual (respuesta 2). Al
    aceptarla (`responderSolicitudAsesor` llama a `alResponderSolicitudDeCambio`), la propuesta pasa a él con su estado y
    todo su trabajo, queda «Cambio de asesor» en el historial y se avisa al egresado, al asesor anterior y a quien lo
    pidió. Si la rechaza, vuelve como «Elegir otro asesor».
- Bajas: el superadministrador las ve y las resuelve también; solo vale la primera respuesta y queda quién la dio.
- Solicitudes de empresa: el coordinador ve y atiende (aprobar o rechazar) las de sus propuestas, salvo las de la carta
  (firmantes, supervisor, «sin supervisor»), que valida la administración (respuesta 3); el servidor lo revisa.
- Pantallas: `TablaSolicitudesCoordinacion` (bajas y cambios de asesor, por atender primero, con búsqueda, tipo,
  estado, paginado y «Atendió: …») en «Solicitudes» del coordinador y en `/admin/solicitudes` (que ahora se llama
  «Solicitudes» y conserva abajo la corrección de datos). En el coordinador, además, la sección «Solicitudes de empresa».
- Contadores: en el coordinador, bajas + cambios por atender + solicitudes de empresa de sus propuestas; en el
  administrador, «Solicitudes» suma bajas y cambios por atender a las correcciones.
- Probado con la propuesta 70: como `pro.lider@prueba.test`, solicitud de cambio (tarjeta en «Pendiente» y avisos al
  coordinador y al asesor); como `admin@uni.test`, contador 1 en el menú, «Resolver» con el asesor actual excluido y
  Mateo Rivas «Carga: 3 de 5», envío y fila «Esperando al nuevo asesor … · Atendió: Administrador del Sistema». La
  aceptación de Mateo se simuló con el mismo código del servidor (su cuenta no está documentada): propuesta en ejecución
  con el nuevo asesor, cambio «completada», historial y avisos. El coordinador 38 la ve en su lista; otro coordinador no.
  Todo restaurado (asesor 39, sin solicitudes, avisos ni historial de prueba).
- Sin probar en el navegador: la solicitud desde la página del asesor, el rechazo de un cambio, «Elegir otro asesor» y
  la sección de empresas con una cuenta de coordinador (no hay una documentada).

## 3. Preguntas

1. **Cupo máximo por asesor.** Hoy no existe. Propuesta: un número por asesor en la configuración de la cohorte (por
   defecto 5 procesos, se cambia por asesor), contando procesos en curso más solicitudes pendientes. A un asesor
   **lleno no se le puede enviar** la solicitud; el coordinador lo ve en gris con «Cupo lleno».
2. **Cambio de asesor: qué pasa con el trabajo.** Propuesta: todo se conserva (plan, bitácora, informes, cronograma);
   el nuevo asesor recibe una solicitud como al asignar y, al aceptarla, sigue desde donde quedó; el anterior pierde el
   acceso y queda en el historial. Mientras el nuevo no acepta, la propuesta sigue con el anterior.
3. **Solicitudes de empresa en el coordinador.** En el bloque anterior quedó que el catálogo lo edita solo el
   superadministrador. Propuesta: el coordinador las **ve y puede atenderlas** (aprobar o rechazar) las de egresados de
   sus carreras, y el superadministrador sigue siendo el único que edita empresas del catálogo a mano.
4. **Firmas verificadas.** En A4 quedó como constancia, no como requisito. Propuesta: pasa a ser **requisito** para
   asignar coordinador (punto 5 de las notas: «ya lo revisó el administrador»).
5. **Secciones o pestañas.** Propuesta: cada sección como página propia del menú del coordinador (con su número), en
   lugar de pestañas en una sola pantalla: las listas crecen y así cada una tiene su paginado y su dirección.

**Respuestas del usuario (27-nov-2026):** de acuerdo con las cinco propuestas (cupo por asesor en la configuración de
la cohorte, 5 por defecto y sin enviar a un asesor lleno; el trabajo se conserva al cambiar de asesor; el coordinador ve y
atiende las solicitudes de empresa de sus carreras; firmas verificadas como requisito; cada sección como página).

## 4. Orden sugerido

D2 → D1 → D3 → D4 → D5 → D6 → D7 → D8 (D2 primero porque D1 revisa su constancia; D5 antes de D4 si el cupo
limita la asignación).
