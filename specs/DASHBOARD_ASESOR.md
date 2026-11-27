# Panel del asesor: procesos por etapa y modalidad

Notas del usuario del 27-nov-2026 (noveno bloque). Pantalla: inicio del asesor (`/asesor`,
`app/asesor/AsesorDashboardClient.tsx`). Diseño de la universidad, sin emojis. «Ver progreso» de cada trabajo ya está
bien y no se toca, y tampoco la subida de dictámenes y del informe de primer contacto dentro de cada proceso.

## 1. Cómo funciona hoy

| Punto | Hoy | Dónde |
|-------|-----|-------|
| Encabezado | «Inicio - Panel de Asesor» y el botón «VER SOLICITUDES DE PROPUESTA» con su número. | `AsesorDashboardClient.tsx` |
| Aviso de solicitudes | Recuadro ámbar «Tiene N solicitudes de propuesta asignadas» con «Atender solicitudes» (con emoji 🔔). Se queda. | ídem |
| Bandejas de revisión | Semanas e informes por revisar (fichas y pasantías). Ejecución: ya definido y bien. | `BandejaFichasAsesor`, `BandejaRevisionGlobal` |
| Seguimiento de pasantías | Tarjetas con avance por subperíodo de las pasantías en ejecución. Ya definido y bien. | ídem |
| Mis propuestas | Una tabla con todas juntas: estudiante, carnet, carrera, modalidad, empresa y «Ver progreso». **No dice en qué etapa está cada una ni qué falta.** | ídem |
| 21 días | Ya se calculan para el informe de pre-ejecución del administrador (K1): desde la aprobación de la propuesta, con cuatro requisitos: plan de trabajo, dictamen de propuesta, dictamen de plan y primer contacto (no aplica sin supervisor). El asesor **no lo ve** en su panel; solo entrando a cada proceso. | `lib/seguimientoCohortes.ts` (`calcularPreEjecucion`), `actions/seguimientoCohortes.ts` |
| Etapas | Antes de la ejecución: el asesor acepta la solicitud → revisa la propuesta (aprueba o pide ajustes) → 21 días de pre-ejecución → la coordinación da inicio a la ejecución. | `actions/asesor.ts`, `darInicioPlanTrabajo` |

## 2. Respuesta a la pregunta: cómo dividir las dos etapas

Propuesta: **dos pestañas en el mismo panel**, debajo del aviso de solicitudes (que se queda arriba, visible en las dos):

- **«Antes de la ejecución»**: procesos en revisión de la propuesta o en los 21 días.
- **«En ejecución»**: lo que ya existe (bandejas de revisión y seguimiento), sin cambios de funcionamiento.

Cada pestaña muestra cuántos procesos tiene y, en rojo, cuántos tienen algo pendiente para el asesor, así se ve de un
vistazo dónde hay trabajo sin cambiar de pestaña. La pestaña queda en la dirección (`/asesor?etapa=propuesta`), y al
entrar se abre la que tenga pendientes (si las dos, «Antes de la ejecución», que tiene plazo). Ventaja frente a páginas
separadas: un clic, el aviso de solicitudes siempre a la vista y el asesor no pierde el contexto.

Dentro de cada pestaña, **un bloque por modalidad** (Pasantía, Proyecto, Investigación; solo las que tengan procesos),
y en cada bloque **una tarjeta por proceso**, ordenadas por urgencia.

## 3. Entregas

### S1. Datos de cada proceso
- Una función del servidor que, para cada proceso del asesor, diga su **etapa** («Revisión de la propuesta»,
  «Pre-ejecución», «En ejecución», «Cerrado») y, en pre-ejecución, los **requisitos de los 21 días** con la fecha en que
  se cumplió cada uno, reutilizando el cálculo del informe del administrador (se extrae a un módulo compartido para que
  los dos den lo mismo).
- Por requisito: **a quién le toca** (el dictamen de propuesta, el dictamen de plan y el primer contacto son del asesor;
  el plan lo elabora el equipo y el asesor lo revisa cuando se envía).
- Días: transcurridos, restantes y de retraso.

**Hecha (27-nov-2026).**
- `lib/preEjecucionServidor.ts` (`datosPreEjecucion`): requisitos de los 21 días, presentación, aprobación e inicio de
  la ejecución de cada propuesta. Lo usan el informe de pre-ejecución del administrador y el panel del asesor.
- **Los 21 días cuentan desde la presentación** (respuesta 1): el primer envío después del último rechazo por requisitos;
  si no hay registro de envío, la fecha de envío; si tampoco, la de aprobación. Los ajustes del asesor no reinician el
  conteo. **El informe del administrador también cambió**: antes contaba desde la aprobación; ahora muestra «presentada …
  · aprobada …» y cuenta desde la presentación.
- `lib/procesosAsesor.ts` (puro): `etapaDe` (revisión de la propuesta, ajustes pedidos, pre-ejecución, en ejecución,
  cerrado), `pestanaDe` (los cerrados no se muestran, respuesta 4), `requisitosProceso` con quién debe actuar
  (dictámenes y primer contacto: asesor; plan: el equipo mientras lo elabora o corrige, el asesor cuando lo envía; en
  pasantía el asesor sube el plan firmado; respuesta 2), `pendientesAsesor` y `compararUrgencia`.
- `lib/procesosAsesorServidor.ts` (`procesosAsesor`): procesos del asesor (`propuestas.asesor_id`, sin anuladas ni
  rechazadas) con egresados del equipo, carrera, empresa, cohorte, etapa, pestaña, días (antes de la ejecución) y
  requisitos, ordenados por urgencia.
- `verificar_fichas.ts`: 5 comprobaciones nuevas (todo en orden).
- Revisado con datos: asesor 50 con la 82 en «Día 4 de 21» (dos dictámenes pendientes del asesor, plan del equipo) y la
  84 en revisión de la propuesta.
- Pendiente para después: días hábiles según el anuario académico.

### S2. Pestañas y diseño del panel
- Encabezado con el mismo panel rojo del coordinador («Panel del asesor»), con el botón de solicitudes.
- El aviso «Tiene N solicitudes…» y «Atender solicitudes» se quedan igual, sin el emoji.
- Pestañas «Antes de la ejecución» y «En ejecución» con sus números (sección 2).
- La tabla «Mis propuestas» se reemplaza por los bloques por modalidad de cada pestaña (con «Ver progreso» en cada
  tarjeta).

**Hecha (27-nov-2026).**
- Encabezado rojo («Panel del asesor · Mis procesos de graduación», el mismo componente del coordinador) con el botón
  «Solicitudes de propuesta» y su número. El aviso «Tiene N solicitudes…» con «Atender solicitudes» se queda, con un
  ícono en lugar del emoji.
- `app/asesor/ProcesosAsesor.tsx`: `PestanasAsesor` («Antes de la ejecución» y «En ejecución», cada una con sus procesos
  y, en rojo, sus pendientes: en la primera, procesos con algo pendiente del asesor; en la segunda, lo que espera revisión
  en las bandejas), `BloquesModalidad` (Pasantía, Proyecto, Investigación, solo las que tienen procesos, con «N con
  pendientes tuyos») y `TarjetaProceso` (número, cohorte, título, egresados, carnet, carrera, empresa, etapa, «Ver
  progreso»; borde rojo si espera al asesor).
- La pestaña va en la dirección (`/asesor?etapa=propuesta` o `ejecucion`); sin ella se abre la que tiene pendientes
  (primero «Antes de la ejecución») o la que tiene procesos.
- «En ejecución»: bandejas de revisión y seguimiento de pasantías como estaban, y los procesos en ejecución por modalidad
  con «Seguimiento de actividades» (pasantía) o «Ejecución del equipo» (proyecto e investigación). Se quitó la tabla
  «Mis propuestas» (y la carga de `getMisPropuestasAsesor` en el panel).
- Probado con `ases.salud.conf@uni.test` y las propuestas 84, 82 y 70 asignadas por un momento: pestañas «2 procesos ·
  2 pendientes» y «1 proceso · 1 pendiente», bloque «Proyecto», bandeja de revisión en ejecución y la ventana de
  solicitudes. Restaurado (asesores 50, 50 y 39).

### S3. Pestaña «Antes de la ejecución»
Tarjeta de cada proceso:
- Modalidad y número, título, egresado o equipo, carrera, empresa.
- Etapa actual en una línea de pasos (aceptada → revisión de la propuesta → 21 días → inicio de la ejecución), como el
  mapa del egresado.
- En revisión de la propuesta: «Revisa la propuesta: apruébala o pide ajustes» (pendiente del asesor, en rojo) o
  «Ajustes pedidos: espera la corrección del equipo».
- En los 21 días: **contador** «Día 8 de 21 · faltan 13 días» (rojo al pasar de 21: «5 días de retraso»), y la lista de
  requisitos: **en rojo «Pendiente»** los que faltan (con «te toca» o «le toca al equipo»), **en verde «Hecho»** con la
  fecha los cumplidos, «No aplica» el primer contacto sin supervisor.
- «Ver progreso» (donde ya se suben los dictámenes y el primer contacto).
- Orden en el bloque: primero los que tienen algo pendiente del asesor y menos días restantes.

**Hecha (27-nov-2026).**
- `DetalleAntesEjecucion` (en `app/asesor/ProcesosAsesor.tsx`), dentro de cada tarjeta de «Antes de la ejecución»:
  - Línea de pasos: Aceptada → Revisión de la propuesta → 21 días → Inicio de la ejecución (hechos en verde, el actual
    en rojo).
  - Contador desde la presentación: «Día 4 de 21 · Faltan 17 días · presentada el …» (gris; ámbar con 5 días o menos;
    «Hoy vence el plazo»), o en rojo «88 días de retraso · Pasaron 109 días desde la presentación». Corre también
    mientras la propuesta está en revisión o en ajustes.
  - Revisión de la propuesta: «Pendiente: revisa la propuesta y apruébala o pide ajustes» en rojo. Ajustes: «Pediste
    ajustes: el equipo está corrigiendo la propuesta…» en gris.
  - Pre-ejecución: los cuatro requisitos con lo que hay que hacer; «Pendiente · te toca» (rojo intenso),
    «Pendiente · le toca al equipo» (rojo claro), «Hecho · fecha» (verde) o «No aplica» (gris).
- Probado con `ases.salud.conf@uni.test` y las propuestas 41, 42, 51, 82 y 84 asignadas por un momento: pasantía con
  retraso y un requisito hecho, pasantía en ajustes, proyecto en el día 4 con el plan del equipo y primer contacto «No
  aplica», proyecto en revisión e investigación con retraso. Restaurado (asesores 39, 39, 39, 50 y 50).

### S4. Pestaña «En ejecución»
- Lo que ya existe (bandeja de fichas, bandeja de pasantías, seguimiento de actividades), agrupado por modalidad, y las
  tarjetas de los procesos en ejecución con «Ver progreso» y, en pasantía, «Seguimiento de actividades». Sin cambiar lo
  que muestran.

**Hecha (27-nov-2026).**
- Las dos bandejas de revisión (proyecto e investigación; pasantías) siguen arriba de la pestaña como lista de trabajo,
  sin cambios.
- Cada tarjeta de proceso en ejecución, por modalidad, lleva `DetalleEjecucion`:
  - «Pendiente · N entregas por revisar · la más antigua, hace X días» en rojo, con enlace a lo más antiguo (sale de las
    bandejas), o «Nada por revisar» en verde. La tarjeta va con borde rojo y el bloque dice «N con pendientes tuyos».
  - En pasantía, lo que antes estaba en la cuadrícula aparte «Seguimiento de actividades»: estatus (semana, informe,
    corrección, atrasado, al día), período y subperíodo actuales y la barra de avance. La cuadrícula aparte se quitó para
    no repetirlo; el botón «Seguimiento de actividades» sigue en la tarjeta.
- El número en rojo de la pestaña «En ejecución» cuenta los procesos con entregas por revisar.
- Probado con `ases.salud.conf@uni.test` y las propuestas 47 (pasantía) y 70 (proyecto con un registro esperando 21 días)
  asignadas por un momento. Restaurado (asesor 39). Se cambió «Al día: nada por revisar» por «Nada por revisar» para que
  no choque con el estatus «Atrasado» de la pasantía.

## 4. Preguntas

1. **¿Desde cuándo cuentan los 21 días?** Las notas dicen «después de aceptar la propuesta». El informe del administrador
   cuenta desde que el asesor **aprueba** la propuesta (después de revisarla). Propuesta: igual que el informe (desde la
   aprobación), para que el asesor y la administración vean el mismo número; antes de aprobar, la tarjeta muestra los
   días desde que aceptó la solicitud, sin el contador de 21.
2. **El plan de trabajo lo elabora el equipo.** Propuesta: también sale en la lista de los 21 días; en rojo «le toca al
   equipo» mientras no lo envían, y «te toca revisarlo» cuando lo envían.
3. **División en pestañas** (sección 2): ¿de acuerdo, o prefieres dos páginas separadas?
4. **Procesos cerrados o anulados:** propuesta: no se muestran en el panel (siguen en «Valoraciones» y en el historial).

**Respuestas del usuario (27-nov-2026):** 1) la información oficial dice «3 semanas después de la presentación de la
propuesta»: por ahora 21 días corridos desde la presentación; más adelante, días hábiles según el anuario académico de
cada año (falta confirmar si cuentan los domingos). 2, 3 y 4: de acuerdo con las propuestas.

## 5. Orden sugerido

S1 → S2 → S3 → S4.
