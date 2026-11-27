# «Mi Trabajo de Graduación» después de enviar: diseño y mapa del estado de la propuesta

Notas del usuario del 26-nov-2026 (sexto bloque). Pantalla: panel del egresado (`/egresado`) cuando ya tiene una
propuesta enviada. Diseño de la universidad, sin emojis.

## 1. Cómo funciona hoy

La pantalla tiene tres bloques (`egresado/page.tsx`):

| Bloque | Hoy |
|--------|-----|
| «Información General de la Propuesta Enviada» | Cuatro cajas con emojis (empresa, alfiler, birrete, persona, calendario, reloj): propuesta, coordinador y asesor, empresa, supervisor y fecha y hora de envío. Colores índigo y morado que no son los de la universidad. |
| Bloque de en medio (estado) | Un título y un párrafo según el estado. Un solo mensaje a la vez; no muestra lo que ya pasó ni lo que falta. |
| «Mis Propuestas» (tabla) | Estados con colores morados, botones con emojis («Ver PDF Final», «Corregir Observaciones»), nombres de estado con guiones bajos convertidos a texto. |

**Estados que muestra hoy el bloque de en medio:**

1. Ajustes solicitados por el docente asesor (cuando hay observaciones).
2. En espera de ser asignado el asesor (enviada o con coordinador, sin asesor).
3. Asesor asignado, en espera de revisión.
4. En espera de revisión de propuesta ajustada (después de corregir).
5. Propuesta aprobada: sigue el plan de trabajo (proyecto e investigación) o esperando primer contacto (pasantía).
6. Primer contacto completado (pasantía).
7. En ejecución.

**La fecha:** sí, es la del envío (`enviada_en`), en hora de El Salvador. Pero **se reemplaza** cuando el egresado
reenvía la propuesta con ajustes, así que después de una corrección muestra la fecha del último reenvío, no la del
primer envío.

**Problema encontrado:** el nombre del asesor se toma de la **primera solicitud de asesoría**, aunque esté pendiente o el
asesor la haya rechazado. El egresado puede ver «Asesor asignado» con un asesor que todavía no aceptó o que dijo que no.

**Lo que queda registrado con fecha** (sirve para el mapa): envío, asignación de coordinador, solicitud de asesor (y su
respuesta: aceptó o rechazó), ajustes solicitados, ajustes enviados, aprobación, primer contacto (pasantía), plan de
trabajo enviado y aprobado (proyecto e investigación), inicio de la ejecución, y los rechazos por requisitos (A2).

## 2. Entregas

### T1. Diseño de «Información general» y del encabezado
- Tarjeta con encabezado (número, modalidad, título, estado actual) y datos en columnas: coordinador, asesor,
  empresa, supervisor, enviada (fecha y hora). Sin emojis, colores de la universidad, íconos dibujados donde ayuden.
- Fecha: «Enviada el 26 nov 2026, 09:15 a. m.» y, si hubo reenvío por ajustes, «Reenviada con ajustes el …».
- Asesor: solo cuando aceptó. Mientras tanto, «En proceso de asignación».
- Botón «Ver documento» (sin emoji).

**Hecha (26-nov-2026).**
- Componente `components/egresado/ResumenPropuestaEnviada.tsx`: una sola tarjeta reemplaza «Información General de la
  Propuesta Enviada» y la tarjeta de estado. Encabezado (propuesta, modalidad, título, estado con su tono —rojo si le toca
  al egresado, gris en proceso, verde logrado— y «Ver documento»), datos (enviada, coordinador, docente asesor, empresa,
  supervisor) y abajo el estado actual (lo reemplaza el mapa en T2).
- Fechas: primer envío y último reenvío desde el historial (`enviada` y `ajustes_completados`); `enviada_en` solo como
  respaldo.
- Asesor: solo el que aceptó (`propuestas.asesor_id`); con una solicitud pendiente dice «En proceso de asignación». Se
  corrigió que mostraba el asesor de la primera solicitud aunque estuviera pendiente o rechazada.
- Sin emojis en los textos de estado. En ejecución, el botón lleva a reportes (pasantía) o a la ejecución (proyecto e
  investigación); antes siempre iba a reportes.
- Se quitaron `formatFechaHoraSV` y las clases de color que quedaron sin uso.
- Probado con las propuestas 88 (solicitud de asesor pendiente) y 70 (en ejecución, con asesor y coordinador).

### T2. Mapa del estado de la propuesta
- Línea de pasos vertical, como el seguimiento de un pedido:
  - **Hechos**: marca de verificación, fecha y quién (por ejemplo, «Asignada al coordinador Juan Pérez, 24 nov 2026»).
  - **Actual**: resaltado, con lo que está pasando y qué le toca al egresado, si algo.
  - **Pendientes**: en gris, para que sepa lo que falta.
- Pasos:
  1. Propuesta enviada.
  2. Revisión de requisitos y asignación de coordinador (se omite si la facultad trabaja sin coordinador).
  3. Asignación de asesor (solicitud enviada → asesor aceptó).
  4. Revisión del asesor: ajustes solicitados y enviados (se repite tantas veces como haya ocurrido).
  5. Propuesta aprobada.
  6. Pasantía: primer contacto con la empresa. Proyecto e investigación: plan de trabajo (y protocolo) enviado y
     aprobado.
  7. En ejecución (con el enlace a reportes o a la ejecución).
- Si la administración o el coordinador la rechazaron por requisitos, el mapa lo muestra como un paso más con su fecha.
- Reemplaza el bloque de en medio actual; los mensajes de cada estado pasan a ser la descripción del paso actual.

**Hecha (26-nov-2026).**
- Pasos: `src/lib/mapaPropuestaServidor.ts` (`mapaPropuesta`). Fuentes: historial de estados (con quién), solicitudes de
  asesoría (solo la aceptada da nombre y fecha), rechazos por requisitos (A2), plan de trabajo y la regla de la cohorte
  (sin coordinador, el paso 2 es «Revisión de requisitos» de la administración).
- Ciclo actual: los pasos 2 en adelante se leen desde el último envío; los rechazos y reenvíos anteriores aparecen como
  eventos del paso «Propuesta enviada». Las rondas de ajustes del asesor son eventos del paso «Revisión del docente
  asesor».
- Un paso posterior hecho marca como hechos los anteriores aunque no tengan fecha (propuestas viejas con historial
  incompleto). El primer paso sin hacer es el actual: «En curso» (gris) o «Te toca a ti» (rojo) con su botón —corregir
  observaciones (solo el líder) o ir al plan de trabajo (cualquier integrante)—.
- Componente `components/egresado/MapaPropuesta.tsx`: línea vertical; hechos en verde con marca, el actual en una
  tarjeta resaltada, los pendientes en gris con su número.
- `egresado/page.tsx`: el mapa reemplaza el «Estado actual»; se quitaron los mensajes por estado que quedaron sin uso.
- Probado: propuesta 70 (en ejecución, todos los pasos hechos con fechas), 88 (paso actual «Asignación de docente
  asesor»), 67 (sin coordinador: «Revisión de requisitos») y 42 (el asesor pidió ajustes: «Te toca a ti» con «Corregir
  observaciones»; esta última comprobada con el cálculo, su cuenta no es de prueba).

### T3. Tabla «Mis propuestas»
- Mismos ajustes: sin emojis, estados con nombres claros y colores de la universidad (gris para borrador, rojo para
  acción pendiente del egresado, verde para aprobada o en ejecución), botones sin emojis.

**Hecha (26-nov-2026).**
- Reglas `src/lib/filaPropuestaEgresado.ts`: estado en palabras (En redacción, En espera, Empresa en revisión, Empresa
  rechazada, Enviada, Ajustes solicitados, Rechazada, Aprobada, Primer contacto completado, En ejecución, Anulada) con
  su tono, y la acción de cada fila (Continuar redacción, Corregir observaciones, Ver motivo, Ver propuesta, Ver
  documento).
- Componente `components/egresado/TablaMisPropuestas.tsx`: misma tarjeta que el resto de la página, modalidad con
  nombre («Pasantía» en lugar de «PASANTIA»), el botón de crear propuesta en el encabezado y la fila del integrante de
  un equipo con el estado real de la propuesta (antes decía siempre «Integrante de equipo»).
- «Corregir observaciones» abre la redacción en el paso que corresponde (antes iba fijo al paso 5).
- De paso, dos avisos de lint del archivo (`desc` sin uso y `let` que debía ser `const`).
- Probado con la propuesta 88 («Enviada», «Ver documento»).

## 3. Preguntas

1. **¿Mostrar el nombre del asesor mientras la solicitud está pendiente?** Propuesta: no; «En proceso de asignación»
   hasta que acepte. Si un asesor rechaza, el egresado no lo ve: solo que se sigue buscando asesor.
2. **Fecha de envío:** ¿mostrar la del primer envío y, aparte, la del último reenvío con ajustes? (Hoy solo queda la
   última.)
3. **¿Hasta dónde llega el mapa?** Propuesta: hasta «En ejecución»; lo que sigue (reportes, informes, informe final)
   tiene sus propias pantallas.
4. **¿Lo ven igual los integrantes del equipo?** Propuesta: sí, el mismo mapa; las acciones (corregir, reenviar) siguen
   siendo del líder.

**Respuestas del usuario (26-nov-2026):** de acuerdo con las cuatro propuestas (asesor solo cuando acepta; fecha del
primer envío y del último reenvío; el mapa llega hasta «En ejecución»; los integrantes ven el mismo mapa).

## 4. Orden sugerido

T1 → T2 → T3. T1 y T3 no dependen de las respuestas, salvo la 1 y la 2 para los datos del encabezado.
