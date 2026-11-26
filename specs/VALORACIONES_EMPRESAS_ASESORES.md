# Catálogo de empresas, gestión de asesores y valoraciones

Notas del usuario del 26-nov-2026. Este documento revisa qué hay hoy, qué falta y en qué entregas se construye.
Todo apartado nuevo lleva el diseño de la universidad (rojo `brand-red`, grises y tipografía actuales) y no usa emojis.

## 1. Qué hay hoy

| Dato o función | ¿Existe? | Dónde |
|----------------|----------|-------|
| Nombre, área, descripción, antecedentes, dirección, mapa, organigrama | Sí | `empresas`, `organigramas_empresa` |
| Sucursales, supervisores (con firma), firmantes (con firma) | Sí | `sucursales`, `supervisores`, `firmantes` |
| Habilitar / deshabilitar | Sí, sin motivo | `empresas.habilitada`, botón en la tarjeta |
| Historial de cambios de la empresa | Sí | `historial_empresas` (antes / después, admin, fecha) |
| Editar, búsqueda, filtros, imprimir, solicitudes de empresa nueva | Sí | `EmpresasManager.tsx`, `/admin/empresas/solicitudes` |
| Diseño | Tarjetas en 3 columnas | `EmpresasManager.tsx` |
| Egresados y procesos por empresa, por modalidad | Se puede calcular, no se muestra | `propuestas.empresa_id`, `tipo` |
| Cohortes en que participó, última cohorte | Se puede calcular, no se muestra | `propuestas.periodo_id` → `periodos.nombre` |
| Asesores que trabajaron con la empresa, último asesor | Se puede calcular, no se muestra | `propuestas.asesor_id` |
| Preguntas de la visita de 90 días sobre la empresa | Sí, como opciones de texto | `informes_visita.respuestas`, `formularioVisita.ts` |
| Valoración de empresa, de asesor o de egresado | **No** | — |
| Reportes en contra de una empresa | **No** | — |
| Gestión de asesores | Solo en Usuarios, filtrando por rol | `/admin/usuarios` |

Una propuesta «cuenta» para una empresa cuando llegó a `aprobada` o más adelante (no se cuentan las rechazadas, anuladas
ni las que siguen en redacción). Un proceso «cerrado» es: informe final de ficha `aprobado` (proyecto e investigación) o
informe 5 de pasantía cerrado.

## 2. Decisiones de diseño (propuestas, a confirmar en la reunión)

- **Escala única de 1 a 10** para todas las valoraciones, así los promedios se pueden comparar y combinar.
- **4 aspectos por valoración**, más un comentario opcional. Tarda menos de dos minutos.
- **Cuándo se valora:** al cerrarse el proceso aparece un aviso pendiente en el panel del egresado y del asesor. Cada
  uno valora una sola vez por proceso; después la valoración queda congelada.
- **Promedio histórico:** la nota de una empresa o de un asesor es el promedio de **todos sus procesos** (primero se
  promedia cada proceso, luego los procesos entre sí). Así una mala nota reciente no hunde un historial bueno, pero
  siempre se muestra al lado **la última valoración**.

### Aspectos que se valoran

| Quién valora | A quién | Aspectos (1 a 10) |
|--------------|---------|-------------------|
| Egresado | Empresa | Acompañamiento del supervisor · Condiciones de trabajo · Actividades acordes a la carrera · Trato y ambiente |
| Egresado | Asesor | Disponibilidad y tiempo de respuesta · Claridad de las observaciones · Dominio del tema · Acompañamiento en todo el proceso |
| Asesor | Empresa | Apoyo al proceso del egresado · Condiciones de trabajo · Comunicación con el supervisor · Cumplimiento de lo acordado |
| Asesor | Egresado | Responsabilidad y puntualidad · Calidad del trabajo · Actitud y comunicación · Autonomía |

En los procesos con varios integrantes (proyecto e investigación), cada integrante valora por separado y el asesor
valora a cada integrante.

### Visita de 90 días en la nota de la empresa

Seis preguntas de la visita ya miden a la empresa. Cada opción se convierte a un puntaje de 1 a 10 (la mejor opción es
10, la peor 1, las intermedias reparten el rango) y su promedio entra a la parte del asesor:

- La ubicación es de fácil acceso.
- Estado físico de la empresa.
- Espacio adecuado y seguro para el egresado.
- Equipo necesario para las funciones.
- Condiciones sanitarias.
- Ambiente de respeto mutuo.

**Nota de la empresa** = promedio de (nota del egresado, nota del asesor), donde la nota del asesor es el promedio de su
valoración al cierre y de la visita de 90 días.

## 3. Entregas

### V1. Catálogo de empresas en tabla (solo con datos que ya existen)
- Cambiar las tarjetas por una **tabla** con paginación. Columnas: nombre (con área debajo), valoración de egresados,
  valoración de asesores, procesos totales, cohortes en que participó, última cohorte, asesores que participaron,
  **último asesor**, estado (activa / deshabilitada) y acciones.
- Mientras no haya valoraciones, las dos columnas dicen «Sin valoraciones».
- **Ver más** (página de detalle `/admin/empresas/[id]`) con todo lo que hoy muestra la tarjeta y lo que no cabe en la
  tabla: área, descripción, antecedentes, dirección, mapa, organigrama, sucursales, supervisores y firmantes con firmas,
  procesos **por modalidad**, lista de cohortes y lista de asesores.
- Se mantienen: editar, búsqueda, filtros, imprimir, sucursales, solicitudes de empresa nueva.
- Filtros nuevos: modalidad, cohorte, estado.

**Hecha (26-nov-2026).**
- Cálculo puro en `src/lib/estadisticasEmpresas.ts`; lectura de procesos en `src/lib/procesosEmpresas.ts`
  (propuestas `aprobada`, `primer_contacto_completado` y `en_ejecucion`, más integrantes aceptados o concluidos).
- «Cohorte en curso» = cohorte en cualquier fase entre recepción y cierre administrativo (misma regla que Seguimiento de
  cohortes). Último asesor = asesor de la propuesta más reciente (cohorte más reciente, luego fecha de aprobación).
- Para que la tabla quepa sin desplazamiento lateral, las dos valoraciones van en una sola columna de dos líneas
  (egresados / asesores) y «Deshabilitar» va debajo del estado.
- Ver más: `/admin/empresas/[id]`. «Editar datos» lleva a `/admin/empresas?editar=ID`, que abre el formulario de
  siempre.
- La lista de procesos del detalle ya muestra cohorte, modalidad, egresados con carrera y asesor; V4 le agrega el
  resultado.

### V2. Deshabilitar con motivo y bitácora de la empresa
- Al deshabilitar (o volver a habilitar) se pide confirmación **y un motivo obligatorio**.
- El motivo, la fecha y el administrador quedan en `historial_empresas` y se muestran en una pestaña «Bitácora» en Ver
  más (junto a los cambios de datos que ya se registran).
- **Reportes en contra:** el administrador puede registrar un reporte (fecha, origen, descripción, archivo opcional).
  Los reportes se ven en Ver más y cuentan en la tabla como alerta. El motivo de deshabilitar puede citar un reporte.

**Hecha (26-nov-2026).**
- Tabla nueva `reportes_empresa`: crear con `npx tsx --env-file=.env.local scripts/crear_reportes_empresa.ts`
  (ya corrido en desarrollo; en la base principal agregar `--confirmo-base-principal`).
- Acciones en `src/app/actions/estadoEmpresa.ts` (solo administrador): `cambiarEstadoEmpresa` (motivo de al menos 15
  caracteres y reporte citado opcional), `registrarReporteEmpresa` (fecha, quién reporta, proceso relacionado opcional,
  descripción, evidencia PDF/PNG/JPG de hasta 5 MB) y `archivarReporteEmpresa` (con nota). Se quitó
  `toggleEmpresaStatus`, que cambiaba el estado sin motivo y sin revisar la sesión.
- Bitácora: los eventos van en `historial_empresas.cambios` con `type` `estado`, `reporte` o `edicion` (el
  administrador editó datos: se guarda qué campos cambió). Textos en `src/lib/bitacoraEmpresa.ts`.
- Ver más tiene pestañas Resumen, Reportes y Bitácora (`?vista=reportes|bitacora`). La tabla muestra «N reportes»
  bajo el estado y tiene el filtro «Con reportes vigentes».
- El formulario del egresado ya mostraba las empresas deshabilitadas tachadas; ahora `updateEmpresa` de
  `actions/propuestas.ts` también lo valida en el servidor (salvo que la propuesta ya la tuviera elegida).

### V3. Valoraciones al cierre del proceso
- Tablas nuevas para las cuatro valoraciones y su aviso pendiente en los paneles del egresado y del asesor.
- Formulario corto (4 aspectos de 1 a 10 y comentario) con el diseño de la universidad.
- Conversión de la visita de 90 días a puntaje.
- Las columnas de valoración de la tabla de empresas y el detalle de Ver más se llenan con datos reales.

**Hecha (26-nov-2026).**
- Tabla nueva `valoraciones`: crear con `npx tsx --env-file=.env.local scripts/crear_valoraciones.ts` (ya corrido en
  desarrollo; en la base principal agregar `--confirmo-base-principal`).
- Aspectos, conversión de la visita y promedios: `src/lib/valoraciones.ts`. Procesos cerrados, pendientes y promedios
  por empresa: `src/lib/valoracionesServidor.ts`. Acción: `src/app/actions/valoraciones.ts`.
- **Proceso cerrado** = informe final por capítulos aprobado (`informes_finales_ficha`) o, en pasantía, el último
  informe de período aprobado (el número sale de la ficha). No se cubre todavía una ficha de proyecto o investigación
  sin etapa de informe final.
- Avisos «Valoraciones pendientes» en `/egresado` y `/asesor`; formularios en `/egresado/valoraciones/[id]` y
  `/asesor/valoraciones/[id]`. Cada integrante de un equipo valora por separado; el asesor valora a cada integrante.
  Sin empresa (p. ej. investigación) solo se valora al asesor o a los egresados.
- Supuestos hasta la reunión (§5): valorar no es obligatorio para cerrar; nadie ve las valoraciones individuales salvo
  el administrador; una valoración enviada no se puede cambiar.
- Visita: cuenta toda visita completada de la empresa, aunque el proceso no haya cerrado. «Equipo necesario: no es
  necesario» no aplica y no cuenta en el promedio.
- Colores de la nota: 8 o más verde, 6 a 7.9 ámbar, menos de 6 rojo. La tabla se puede ordenar por menor o mayor
  valoración (las empresas sin valoración van al final).
- La valoración del asesor al egresado y la del egresado al asesor ya se guardan; se muestran en V5.

### V4. Historial de egresados en la empresa (opción extra)
- En Ver más, lista de egresados que hicieron su proceso en la empresa: nombre, modalidad, carrera, cohorte, asesor,
  resultado (satisfactorio / no satisfactorio según cierre y valoraciones) y enlace al proceso.
- Así queda el recorrido de los egresados por las empresas y sus resultados.

**Hecha (26-nov-2026).**
- Pestaña «Egresados» en Ver más (`?vista=egresados`), una fila por egresado y proceso; el Resumen muestra un
  adelanto con enlace. Filtros por búsqueda, modalidad, cohorte, carrera y resultado; tarjetas de conteo por resultado
  que también filtran; descarga en CSV.
- Resultado (`src/lib/historialEmpresa.ts`): **En curso** (informe final sin aprobar), **Satisfactorio** (cerrado y el
  asesor valoró al egresado con 6 o más), **No satisfactorio** (menos de 6), **Concluido** (cerrado sin valoración del
  asesor) y **Dado de baja** (propuesta anulada con baja aprobada, con su motivo).
- Las bajas salen en el historial pero no cuentan en los procesos de la tabla de empresas. No había bajas aprobadas en
  desarrollo, así que ese caso no se probó en el navegador.
- Cada fila muestra la nota que el asesor dio al egresado y la que el egresado dio a la empresa.

### V5. Apartado «Asesores» separado de Usuarios
- Menú nuevo del administrador `/admin/asesores` con tabla: nombre, carreras, cohortes, procesos activos, procesos
  cerrados, **nota promedio histórica**, **última evaluación**, empresas con que trabajó, estado y acciones.
- Filtro y orden **por desempeño** (rangos de nota). El coordinador ve lo mismo para los asesores de su carrera.
- Ver más del asesor: datos, historial de procesos y valoraciones por cohorte, comentarios de los egresados.
- Deshabilitar con motivo obligatorio y su bitácora, igual que en empresas. Editar sigue usando el formulario actual de
  usuarios.
- La valoración que el asesor hace del egresado se ve en el expediente del egresado (admin y coordinador).

**Hecha (26-nov-2026).**
- `/admin/asesores` (menú «Asesores»): tarjetas por desempeño que filtran (alto 8 o más, medio 6 a 7.9, bajo menos
  de 6, sin valoraciones), búsqueda, carrera, estado y orden (nombre, mejor o peor nota, más procesos en curso o
  cerrados). Columnas: carreras, en curso, cerrados (y bajas), cohortes, empresas, nota histórica, última evaluación,
  estado y acciones (Ver más, Editar → formulario de Usuarios, Deshabilitar con motivo).
- Ver más `/admin/asesores/[id]`: indicadores, valoraciones por aspecto y por cohorte, comentarios de los egresados,
  procesos asesorados con su nota recibida, bitácora de habilitar/deshabilitar e «Historial como egresado» si la misma
  cuenta tuvo propuestas como egresado (caso del §4).
- Coordinador: menú «Asesores» (`/coordinador/asesores`), solo lectura y solo los asesores de sus carreras (su carrera
  y las asignadas; si no tiene ninguna, ve todos). Probado con Jose.luis@uni.test (carrera 9): ve a Mateo Rivas y a
  Asesor Demo, no a Marco Solís, y el detalle de un asesor de otra carrera da 404. Se corrigió de paso que el menú del
  coordinador marcaba dos pestañas a la vez (`DashboardHeader.tsx`).
- Tabla nueva `bitacora_usuarios`: `npx tsx --env-file=.env.local scripts/crear_bitacora_usuarios.ts` (ya corrido en
  desarrollo). Desactivar un asesor desde Usuarios también queda en la bitácora, sin motivo.
- Expediente: sección «Valoraciones del cierre» en `/admin/propuestas/[id]` y `/coordinador/propuestas/[id]`.

## 4. Pregunta: egresado que después es docente o asesor

Hoy el rol **no lo define el correo**: lo asigna el administrador al crear el usuario. Pero el correo es único y cada
cuenta tiene un solo rol, así que la misma persona no puede tener dos cuentas con el mismo correo.

| Caso | Qué hace el sistema |
|------|---------------------|
| La persona llega con otro correo (correo de docente distinto al de estudiante) | Se crea una cuenta nueva de asesor. Su historial de egresado queda en la cuenta vieja. Se puede **vincular** ambas cuentas para ver en su ficha de asesor que fue egresado. |
| Usa el mismo correo | El administrador **cambia el rol** de la cuenta a asesor. Sus propuestas de egresado siguen guardadas (están ligadas a su id) y se ven como «historial como egresado» en Ver más del asesor. |

Recomendación: un solo rol activo por cuenta; cambiar el rol con el mismo correo y conservar el historial. Un sistema
de roles múltiples (una cuenta con dos roles y selector al entrar) es posible pero toca el inicio de sesión y todos los
paneles; se deja para cuando se confirme que hace falta. Esto va en V5.

## 5. Preguntas para la reunión

1. ¿La escala de 1 a 10 sirve también para empresas y egresados, o la empresa va con otra escala?
2. ¿Los aspectos de la tabla del apartado 2 son los correctos?
3. ¿La valoración es obligatoria para cerrar el proceso o se puede omitir?
4. ¿El egresado ve la valoración que le hizo el asesor? ¿El asesor ve la que le hizo el egresado (anónima o con nombre)?
5. ¿Qué nota se considera «baja» para marcar a una empresa o un asesor en alerta (por ejemplo, menos de 6)?
6. ¿Quién puede registrar reportes en contra de una empresa: solo el administrador o también el asesor y el coordinador?
7. Egresado que pasa a asesor: ¿cambiar el rol con el mismo correo o roles múltiples?
