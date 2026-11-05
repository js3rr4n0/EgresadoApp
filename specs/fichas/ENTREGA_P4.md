# Ficha de proyecto: entrega P4, ejecución en equipo (5-nov-2026)

Ruta completa en [FICHA_PROYECTO.md](FICHA_PROYECTO.md) §6. La entrega anterior está en [ENTREGA_P3.md](ENTREGA_P3.md).

## Qué hace

Cuando coordinación da inicio al plan, cada integrante registra, **período a período, las actividades de su plan individual**. El asesor ve al equipo completo, sabe quién hizo qué y revisa cada registro.

- **Períodos:**
  - salen de la ejecución de la ficha;
  - las fechas se calculan desde el inicio de la carta;
  - el período 1 se abre al dar inicio, y los siguientes según la fecha.
- **Actividades del período:** son las hojas del plan que tienen monto o marca en las columnas de ese período.
- **Registro de una actividad,** con las reglas de la ficha:

  | Campo | Regla |
  |---|---|
  | Avance (%) | Si la ficha lo pide. |
  | Acciones realizadas | Límites de "descripción"; 0 = sin mínimo. |
  | Resultado obtenido | Límites de "conclusión"; 0 = sin mínimo. |
  | Marco teórico | Obligatorio, opcional o no se pide. |
  | Anexos de evidencia | Se muestran como "Próximamente". |

- **Permisos:** solo el **responsable** de la actividad la registra (el líder también, pero solo lo suyo). El servidor valida el responsable, que el período esté abierto, que la actividad esté planificada en él y las reglas de la ficha.
- **Ciclo de cada registro:** borrador → enviado → aprobado. Si el asesor pide ajustes, queda "con observaciones" y el integrante lo corrige y lo vuelve a enviar. El asesor recibe un aviso al enviarse un registro, y el integrante, al revisarse.
- **Avance:**
  - cada actividad toma su último avance registrado;
  - cada objetivo y el objetivo general muestran el promedio de lo que tienen debajo (`avancePorNodo`);
  - es la base del "informe de avances" del período (P5).
- **Vista de equipo:** muestra la tabla del período con cada actividad, su responsable, su avance y su estado, y un resumen por integrante (actividades, enviadas, aprobadas).
- **Dónde se ve:**
  - **Egresado:** la nueva opción "Ejecución del proyecto" del menú (`/egresado/ejecucion`).
  - **Asesor:** el botón "Ejecución del equipo" en el aviso de la propuesta, que aparece con el plan aprobado (`/asesor/ejecucion/[id]`).

**La pasantía no se toca:** sigue con sus registros por subperíodo (`registrosActividad.ts`). La ejecución de proyecto es un módulo aparte.

## Base de datos

`scripts/fichas/crear_registros_plan.ts`. Solo agrega, y se puede ejecutar más de una vez.

Crea la tabla `registros_plan`, con una fila por propuesta, actividad del plan (`nodo_id`, el id estable del plan) y período. Guarda el autor, el avance, las acciones, el resultado, el marco teórico, el estado y el comentario del asesor.

## Datos de prueba

`sembrar_equipo_proyecto.ts --iniciar` pone en ejecución la propuesta del líder de prueba si su plan está aprobado, y lo registra en el historial. Es un atajo, en lugar de que coordinación suba los documentos de aprobación y dé inicio.

## Comprobado en el navegador

Sobre `dev-fichas`, con la propuesta 70:

1. **Pantalla del integrante Uno:**
   - mostró los 5 períodos con las fechas de la carta (26 nov–25 dic, 26 dic–24 ene…), con los futuros marcados "aún no";
   - mostró sus 3 actividades del período 1, con su ruta (objetivo › macroactividad);
   - mostró la tabla del equipo con las 9 actividades y sus responsables.
2. **Registro:** el integrante registró "Diseño de pantallas" con 60 %, acciones y resultado, y lo envió.
   - El objetivo 1.2 quedó en 60 % y el proyecto en 7 % (60 / 9 objetivos).
   - El resumen mostró "1 enviada" para ese integrante.
3. **Asesor:**
   - vio el registro completo en la tabla del equipo y lo aprobó;
   - la fila pasó a "Aprobado" y el resumen, a "1 aprobada";
   - su vista no tiene "Mis actividades".

Además: `tsc` sin errores, `verificar_fichas.ts` 59 de 59 (5 nuevas), y ESLint sin errores nuevos.

## No probado todavía

- **El camino de observaciones de un registro** (pedir ajustes, corregir y reenviar) no se probó en el navegador. Usa la misma lógica que el plan, que sí se probó en P3.
- **Que un integrante no pueda registrar la actividad de otro:** en la pantalla no aparece, y el servidor lo rechaza. Se verificó por código.

## Limitaciones conocidas

- **Anexos:** los de evidencia (imágenes y documentos) todavía no se suben.
- **Cambios al cronograma:** no hay solicitudes para agregar, mover o quitar actividades durante la ejecución, como sí tiene la pasantía.
- **Pasantía:** el panel de coordinación y los paneles de seguimiento todavía no muestran la ejecución de proyecto.
- **Hitos:** el primer contacto y los demás hitos de la ejecución de proyecto todavía no están conectados.

## Siguiente: P5

Los informes del período: uno individual por integrante, armado con sus registros, y el informe general del período. Llevan el cronograma y el presupuesto del período, los avances por objetivo, los resultados y los anexos.
