# Configuración de la cohorte: administradores de facultad y coordinadores

Notas del usuario del 26-nov-2026 (punto 2). Este documento revisa cómo funcionan hoy los roles y la asignación de
propuestas, qué hay que construir y en qué entregas. Todo apartado nuevo lleva el diseño de la universidad y no usa
emojis.

## 1. Cómo funciona hoy

| Pregunta | Respuesta | Dónde |
|----------|-----------|-------|
| ¿Qué roles hay? | `admin`, `decanato`, `coordinador`, `asesor`, `egresado`. **Decanato** existe pero su panel es un marcador sin funciones («Fase 6»). | `usuarios.rol`, `src/app/decanato` |
| ¿Al crear un coordinador o asesor se pide facultad y carrera? | Sí: facultad, carrera y «carreras asignadas»; también «cohortes asignadas». | `UserForm.tsx`, `usuarios.carreras_asignadas`, `usuarios.cohortes_asignadas` |
| ¿Eso limita a quién se le puede asignar una propuesta? | **No.** Al asignar coordinador, el administrador ve **todos** los coordinadores y administradores de todas las facultades. | `getCoordinadoresConEstadisticas` en `actions/adminPropuestas.ts` |
| ¿Y los asesores? | El coordinador ve los asesores de **su facultad**; si no hay ninguno, ve **todos**. El administrador ve todos. La carrera no se toma en cuenta. | `getAsesoresFacultad` en `actions/coordinador.ts` |
| ¿Las cohortes asignadas sirven para algo? | Solo para impedir borrar una cohorte que tenga usuarios asignados. No limitan nada. | `actions/periodos.ts` |
| ¿Hay administradores por facultad? | No. Un solo tipo de administrador, que ve y hace todo (56 lugares revisan `rol === "admin"`). | `src/proxy.ts`, páginas y acciones de `/admin` |
| ¿Se puede trabajar sin coordinador? | Solo con un truco: el administrador se asigna a sí mismo como coordinador (la lista lo incluye como «Administración Central») y luego asigna el asesor desde la vista de coordinador. | `/coordinador` |
| ¿De qué facultad es una propuesta? | De la facultad del egresado (`usuarios.facultad_id`), que también distingue la sede (p. ej. Ilobasco). La carrera es la del egresado. | `usuarios`, `carreras_sedes` |

Flujo actual: **envío de la propuesta → el administrador asigna coordinador → el coordinador pide asesor → el asesor
acepta**.

## 2. Lo que se pide

1. Roles: **Superadministrador** (el administrador actual), **Administrador de facultad**, Coordinador, Asesor y
   Egresado.
2. Una pantalla de **configuración por cohorte** donde, al crear una cohorte nueva, el superadministrador define por
   cada facultad:
   - si tiene **administrador de facultad** o la administra él mismo;
   - si tiene **coordinadores** o no;
   - si tiene uno, varios, **uno por carrera**, o un coordinador que atiende **varias carreras elegidas**;
   - si el administrador de facultad es también **el único coordinador**.
3. Al asignar una propuesta, solo se pueden elegir los coordinadores configurados para la carrera del egresado.
   Si su carrera tiene un único coordinador, se asigna ese.
4. Si la facultad **no tiene coordinadores**, la propuesta pasa directo a **asignación de asesor**.
5. Mejorar el formulario de asignación.

Ejemplo que debe poder configurarse: de 7 facultades, 3 con administrador interno y 4 sin él. De las 4 sin él, 3
tienen 2 coordinadores y 1 ninguno. Las 3 con administrador tienen coordinador, y una de ellas tiene uno por carrera.

## 3. Modelo propuesto

**Rol nuevo** `admin_facultad`, con su facultad en `usuarios.facultad_id`. El rol `admin` actual pasa a llamarse
**Superadministrador** en pantalla. En la base sigue siendo `admin`, para no tocar los 56 lugares que lo revisan.

**Tablas nuevas** (por cohorte, para que cada cohorte tenga su propia configuración y se pueda copiar de la anterior):

`cohorte_facultades`: una fila por cohorte y facultad.
| Campo | Valores |
|-------|---------|
| `periodo_id`, `facultad_id` | cohorte y facultad |
| `administracion` | `central` (la lleva el superadministrador) o `facultad` |
| `admin_facultad_id` | usuario con rol `admin_facultad` (si la administración es de la facultad) |
| `coordinacion` | `sin_coordinador`, `general` (uno o varios atienden toda la facultad), `por_carrera` (cada coordinador atiende las carreras que se le asignen) |
| `admin_coordina` | el administrador de facultad es también su coordinador |

`cohorte_coordinadores`: qué coordinadores participan en la cohorte y qué carreras atienden.
| Campo | Valores |
|-------|---------|
| `periodo_id`, `facultad_id`, `coordinador_id` | cohorte, facultad y usuario |
| `carreras` | ids de carreras que atiende (vacío = todas las de la facultad, en modo `general`) |
| `activo` | se puede deshabilitar en esta cohorte sin borrarlo |

**Regla para elegir coordinador** de una propuesta (cohorte de la propuesta, facultad y carrera del egresado):
- `sin_coordinador`: no hay paso de coordinador; la propuesta queda lista para asignar asesor.
- `general`: se elige entre los coordinadores activos de esa facultad en la cohorte (si hay uno, va preseleccionado).
- `por_carrera`: solo los que tienen esa carrera; si es uno, se asigna ese y no se puede cambiar.
- Sin configuración para esa cohorte o facultad: se comporta como hoy (todos), con un aviso para configurarla.

**Quién asigna:** el superadministrador en todas las facultades; el administrador de facultad solo en la suya. En una
facultad de administración central, lo hace el superadministrador.

## 4. Entregas

### C1. Configuración de la cohorte
- Pestaña «Configuración» en Fechas y Periodos (`/admin/periodos/[id]/configuracion`), solo para el
  superadministrador.
- Una tarjeta por facultad activa con:
  - administración central o de la facultad, y quién es el administrador;
  - modo de coordinación;
  - lista de coordinadores con sus carreras (selector de carreras de esa facultad), habilitar o deshabilitar en la
    cohorte, y agregar uno de los usuarios con rol coordinador;
  - opción «el administrador de facultad es el coordinador».
- Botón **«Copiar configuración de la cohorte anterior»**.
- Resumen arriba: facultades con administrador propio, sin coordinador, por carrera, y carreras que quedaron sin
  coordinador (alerta).
- Validaciones: en `por_carrera` cada carrera debe tener como máximo un coordinador; aviso si una carrera queda sin
  coordinador en una facultad que sí usa coordinadores.
- En esta entrega todavía no existe el rol `admin_facultad`: el campo de administrador queda listo pero solo admite
  usuarios con ese rol cuando llegue C3.

**Hecha (26-nov-2026).**
- Tablas `cohorte_facultades`, `cohorte_participantes` (coordinadores y asesores) y `cohorte_config_bitacora`:
  `npx tsx --env-file=.env.local scripts/crear_configuracion_cohorte.ts` (ya corrido en desarrollo).
- Botón «Configurar participantes» en cada cohorte de Fechas y Periodos → `/admin/periodos/[id]/configuracion`.
- Reglas, validación, descripción de cambios y `coordinadoresPermitidos` (para C2): `src/lib/configCohorte.ts`.
  Lectura: `src/lib/configCohorteServidor.ts`. Acciones: `src/app/actions/configCohorte.ts`.
- Por facultad: administración (central o administrador de facultad, que es un usuario con rol `decanato`), modo de
  coordinación, «el administrador también coordina», coordinadores con sus carreras (en «por carrera» se sugieren las
  carreras del usuario) y asesores (carreras opcionales, botón «Agregar todos» los de la facultad). Se habilitan o
  deshabilitan por cohorte sin quitarlos. Primero se ofrecen los usuarios de la facultad y luego los de otras.
- Errores que impiden guardar: falta el administrador, carrera con dos coordinadores, coordinador sin carreras,
  coordinación general sin nadie. Avisos: carreras sin coordinador, facultad sin asesores.
- Desde `inicio_recepcion` cada guardado (y la copia) pide justificación de al menos 15 caracteres; todo queda en la
  bitácora de la página con fecha, autor y cambios.
- «Copiar configuración de [cohorte anterior]» reemplaza solo las facultades configuradas en el origen; omite usuarios
  que ya no tienen el rol.
- Probado en desarrollo: C1-2027 (Ingeniería por carrera con Jose Luis y Coordinación Demo, asesores Marco y Mateo),
  DEMO-2026 (Ciencias Empresariales sin coordinador, con justificación) y copia de DEMO-2026 a C1-2027.
- Pendiente de C3: en Usuarios el rol todavía se llama «Decanato»; mientras tanto no hay usuarios de ese rol en
  desarrollo, así que la opción de administrador de facultad muestra el aviso de crearlos.

### C2. Asignación según la configuración y flujo sin coordinador
- El formulario de asignación del superadministrador muestra **solo los coordinadores permitidos** para la carrera de
  la propuesta, con su carga (propuestas que ya tiene) y si ya trabajó con la empresa. Va preseleccionado o fijo
  cuando hay uno solo.
- Formulario mejorado: datos del egresado (carrera, facultad, cohorte), regla que se aplicó («Coordinador por carrera:
  Ingeniería Civil») y advertencia si la cohorte no está configurada.
- **Facultad sin coordinador:** el administrador asigna directamente el asesor desde la propuesta (asesores de esa
  facultad y, si aplica, de esa carrera, con su carga), sin pasar por el estado `coordinador_asignado`. El historial
  registra «Asignación directa de asesor (facultad sin coordinador)».
- La lista de asesores del coordinador deja de caer en «todos» cuando su facultad no tiene asesores, y se ordena
  poniendo primero a los de la carrera de la propuesta.
- El servidor valida lo mismo que el formulario (no se puede asignar un coordinador no permitido).

**Hecha (26-nov-2026).**
- Regla por propuesta (cohorte de la propuesta + facultad y carrera del egresado): `src/lib/asignacionServidor.ts`
  (`reglaDePropuesta`, `opcionesAsesor`, `ultimaSolicitudAsesor`).
- Formulario rediseñado (`admin/propuestas/[id]/ReviewForm.tsx`): caja «Regla de asignación», tarjetas de
  coordinadores con su carga y si conocen la empresa (preseleccionado si es el único), estado de la última solicitud
  de asesoría, sin emojis. Sin configuración: todos los coordinadores, con aviso y enlace a configurar la cohorte.
- Sin coordinador (la facultad, o una carrera sin coordinador en modo por carrera sin admin que coordine): asignación
  directa `asignarAsesorDirecto` en `actions/adminPropuestas.ts`. Usa la misma solicitud de asesoría que el
  coordinador (el asesor acepta o rechaza en su panel); la propuesta queda sin coordinador y el historial dice
  «Asignación directa de asesor (facultad sin coordinador)».
- Servidor: `asignarPropuestaACoordinador` rechaza coordinadores no permitidos; `asignarAsesorCoordinador` rechaza
  asesores que no participan. La lista de asesores del coordinador sigue la cohorte (con carga y «de la carrera») y,
  sin configuración, ya no cae a «todos».
- Probado con la propuesta 67 (C3-2026 Ejemplo, Sistemas Informáticos): sin configurar (3 coordinadores), por carrera
  (solo Coordinación Demo, preseleccionado) y sin coordinador (solicitud directa a Mateo Rivas, quedó pendiente). La
  validación del servidor ante un coordinador no permitido no se probó desde el navegador (el formulario no lo ofrece).

### C3. Rol administrador de facultad
- Rol `admin_facultad` (restricción de la base, formularios de usuario, carga masiva, inicio de sesión y proxy).
- Panel `/admin` con su alcance: ve solo lo de su facultad. Lo que **puede**: propuestas y su asignación (coordinador o
  asesor directo), usuarios de su facultad, asesores, seguimiento de cohortes (ya tiene filtro por facultad),
  catálogo de empresas.
- Lo que **no puede** (solo superadministrador): cohortes y su configuración, facultades y carreras, notificaciones
  por correo, carga masiva, bloques de propuestas y deshabilitar empresas.
- El menú lateral muestra solo lo que su rol permite y dice «Administrador de facultad: [nombre]».
- Si `admin_coordina` está activo, también ve la vista de coordinador para las propuestas de su facultad.
- En pantalla, «Administrador» pasa a «Superadministrador».

**Hecha (26-nov-2026).** Se reutilizó el rol `decanato` (respuesta 1); no hay rol nuevo ni cambio en la base.
- Nombres en pantalla: `src/lib/rolesNombres.ts` (Superadministrador, Administrador de facultad) en formularios y tabla
  de usuarios, encabezado y menú. `/decanato` redirige a `/admin`; al iniciar sesión el rol va a `/admin`.
- Acceso: `src/proxy.ts` deja al administrador de facultad abrir `/admin` (inicio), usuarios, asesores, seguimiento,
  empresas (sin solicitudes) y propuestas, más `/coordinador`; lo demás lo regresa a `/admin`. El menú lateral muestra
  solo eso.
- Alcance: `src/lib/permisos.ts` (`alcanceAdmin`, `puedeVerPropuesta`, `puedeAsignarPropuesta`, `usuarioEnAlcance`).
  - Inicio y propuestas: solo su facultad (la del egresado). Asigna (coordinador o asesor directo) solo si la cohorte
    lo tiene como administrador de esa facultad o la cohorte no está configurada; con administración central lo ve
    pero no asigna. No elimina propuestas.
  - Usuarios: ve los de su facultad (sin administradores); crea y edita coordinadores y asesores de su facultad
    (respuesta 3); no elimina.
  - Asesores (V5) y seguimiento de cohortes: fijados a su facultad.
  - Empresas: solo lectura (respuesta 2). Las acciones de crear, editar, sucursales y eliminar empresas ahora
    exigen superadministrador en el servidor (antes no revisaban la sesión).
  - Vista de coordinador: entra si coordina (sus propuestas asignadas). La lista de asesores del coordinador le
    redirige a su panel.
- De paso: el listado de propuestas tenía un atajo «Asignar» con su propio formulario que ofrecía todos los
  coordinadores; ahora lleva a la página de la propuesta, que aplica la configuración (C2).
- Probado con `admin.ingenieria@uni.test` (ver TESTING.md): menú y conteos de su facultad, rutas del
  superadministrador bloqueadas por enlace directo, propuestas solo de Ingeniería, asignación directa disponible en
  C3-2026 Ejemplo, empresas sin acciones de edición, usuarios de su facultad (crear solo coordinador o asesor),
  seguimiento limitado. Sin probar: el aviso «administración central» (no había propuesta pendiente en una cohorte
  así) y una asignación hecha por él de punta a punta.

### C4. Pruebas del ejemplo completo
- Sembrar en desarrollo una cohorte de prueba con el ejemplo del §2 (7 facultades) y recorrer: asignación por
  carrera, facultad sin coordinador, administrador de facultad que coordina.
- Revisar que un administrador de facultad no pueda abrir ni modificar propuestas, usuarios o empresas de otra
  facultad, ni por enlace directo.

**Hecha (26-nov-2026).**
- Siembra: `npx tsx --env-file=.env.local scripts/sembrar_prueba_configuracion.ts` (solo desarrollo; se puede repetir,
  borra y recrea la cohorte `PRUEBA-CONF-2027` y los usuarios `*.conf@uni.test`). La base de desarrollo tiene 5
  facultades activas, así que el ejemplo de 7 se adaptó cubriendo todos los casos:

| Facultad | Administración | Coordinación | Propuesta | Resultado |
|----------|----------------|--------------|-----------|-----------|
| Ingeniería y Arquitectura | administrador propio (admin.ingenieria) | por carrera; el administrador cubre las carreras sin coordinador | 87 Sistemas · 88 Química | 87: solo Coordinación Demo. 88: solo el administrador de facultad |
| Ciencias de la Salud | administrador propio (adm.salud.conf) | general, 1 coordinador | 89 | solo Coordinación Salud, preseleccionado |
| Ciencias Empresariales | central | general, 2 coordinadores | 90 | los 2 coordinadores |
| Multidisciplinaria de Ilobasco | central | general, 2 coordinadores | 91 | los 2 coordinadores |
| Ciencias y Humanidades | central | sin coordinador | 92 | asignación directa con sus 2 asesores |

- Aislamiento: el administrador de Ingeniería solo abre 87 y 88; el de Salud solo 89, y recibe 404 al abrir o editar un
  asesor de Ingeniería por enlace directo.
- De punta a punta: el administrador de Ingeniería se asignó la 88 como coordinador, la vio en su vista de
  coordinador, pidió asesor (solo le ofreció Marco y Mateo, los configurados) y la solicitud quedó pendiente para
  Mateo Rivas.
- Arreglado durante la prueba: la bitácora de la configuración y el historial de egresados formateaban la hora en el
  servidor y en el navegador con resultados distintos («p. m.» con otro espacio), lo que daba error de hidratación.
  Ahora usan `src/lib/fechasTexto.ts` (mismo texto en ambos lados, hora de El Salvador).

## 5. Respuestas del usuario (26-nov-2026)

1. **Decanato = Administrador de facultad.** Se reutiliza el rol `decanato` en la base (ya existe en la restricción,
   formularios, sesión y proxy) y en pantalla se llama siempre «Administrador de facultad». No se crea `admin_facultad`.
2. **Empresas:** el administrador de facultad no las edita; el catálogo es uno solo y solo lo edita el
   superadministrador.
3. **Usuarios:** por ahora el administrador de facultad sí puede crear coordinadores y asesores de su facultad (se
   confirmará después).
4. **Asesores por cohorte:** sí se configura qué asesores participan en cada cohorte y facultad (entra en C1).
5. **Sin coordinador:** el superadministrador asigna el asesor de una vez (se confirmará después).
6. **Cambios a mitad de cohorte:** se permiten, pero desde la fecha de inicio de la cohorte (`inicio_recepcion`) todo
   cambio pide confirmación y justificación, que queda en la bitácora de la configuración. Las asignaciones ya hechas
   no se tocan.

Con esto, la tabla de §3 cambia así: `admin_facultad_id` apunta a un usuario con rol `decanato`, y los coordinadores y
asesores van en una sola tabla `cohorte_participantes` (función `coordinador` o `asesor`).

## 6. Preguntas originales

1. **Decanato:** hoy existe el rol pero sin funciones. ¿Se reemplaza por «Administrador de facultad» o son cosas
   distintas?
2. **Empresas:** el catálogo es uno solo para toda la universidad. ¿El administrador de facultad puede editar
   empresas, o solo verlas y el superadministrador decide habilitar y deshabilitar?
3. **Usuarios:** ¿el administrador de facultad puede crear coordinadores y asesores de su facultad, o solo el
   superadministrador?
4. **Asesores por cohorte:** ¿también se configura qué asesores participan en cada cohorte, o basta con su facultad y
   carreras?
5. **Sin coordinador:** cuando la facultad no tiene coordinador, ¿quién revisa la propuesta antes de asignar asesor:
   el administrador (central o de facultad) o nadie?
6. **Cambio a mitad de cohorte:** si se cambia la configuración con propuestas ya asignadas, ¿se respetan las
   asignaciones hechas (propuesta) o se reasignan?
