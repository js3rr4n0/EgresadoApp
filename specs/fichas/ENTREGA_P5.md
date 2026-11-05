# Ficha de proyecto: entrega P5, informes del período (5-nov-2026)

Ruta completa en [FICHA_PROYECTO.md](FICHA_PROYECTO.md) §6. La entrega anterior está en [ENTREGA_P4.md](ENTREGA_P4.md).

## Qué hace

Cada período tiene **un informe individual por integrante** y **un informe general del equipo**, como pide el documento de contexto. El informe **se arma solo** con el plan y los registros del período, así que no hay que volver a redactarlo. Por ahora la estructura está completa; la redacción exacta de cada parte se revisará después, como indica la nota del documento.

**Partes del informe** (`InformePeriodoProyecto`, armado por `lib/fichas/informePeriodo.ts`):

1. **Portada:** universidad, tipo de informe, período con sus fechas, integrantes con carné y docente asesor.
2. **Generalidades de la institución:** los actores de la propuesta (patrocinador, beneficiario, ejecutor y financista).
3. **Cronograma y presupuesto del período:** la parte del plan que cae en el período (individual o general). Lleva montos solo en las actividades ejecutadas, y cada nivel suma los de sus hijos.
4. **Informe de avances:** el avance del objetivo general sobre el total del proyecto, el de cada objetivo y macroactividad, y la narrativa de cada actividad (acciones y marco teórico). En el informe general se indica quién estuvo a cargo de cada actividad.
5. **Resultados obtenidos:** el estado de cada nivel (Finalizada, Avance parcial o Pendiente) con su porcentaje concluido y pendiente.
6. **Resultados por actividad,** con "Ver anexo n".
7. **Anexos:** quedan como "Próximamente", porque los registros todavía no permiten subir archivos.

El informe se puede imprimir o guardar como PDF desde el navegador.

**Recorrido:**

| Paso | Quién | Qué pasa | Lo que se valida |
|---|---|---|---|
| 1 | Cada integrante | Entrega su informe individual | Que todas sus actividades del período tengan registro enviado y, si la ficha lo exige, aprobado por el asesor. |
| 2 | Líder | Envía el informe general | Que hayan entregado todos los integrantes que tienen actividades en el período. |
| 3 | Asesor | Aprueba el general o pide ajustes | Las observaciones necesitan un comentario. Al aprobar el general, quedan aprobados también los individuales del período. |

- **Avisos:** el asesor recibe el aviso del envío, y el equipo, el de la revisión.
- **Si la ficha pide un solo informe por trabajo:** no hay individuales, y el líder envía el informe directamente.

**Dónde se ve:** una sección nueva, "Informes del período", en la pantalla de ejecución, con el estado de cada informe, "Ver informe" y los botones según el rol:
- egresado: `/egresado/ejecucion/informe`;
- asesor: `/asesor/ejecucion/[id]/informe`.

## Base de datos

`scripts/fichas/crear_informes_plan.ts`. Solo agrega, y se puede ejecutar más de una vez.

Crea la tabla `informes_plan`:
- una fila por propuesta, período y autor;
- `egresado_id` es nulo en el informe general;
- dos índices únicos: uno para los individuales y otro para el general.

Ahí solo se guarda el estado. El contenido se calcula siempre con el plan y los registros.

## Datos de prueba

`sembrar_equipo_proyecto.ts --registrar-periodo` registra y aprueba las actividades del período 1 que falten. Usa texto de ejemplo y deja la mitad al 100 % y la otra mitad al 50 %. No toca los registros que ya existían.

## Comprobado en el navegador

Sobre `dev-fichas`, con la propuesta 70:

1. **Sin registros:** el líder intentó entregar su informe y se le rechazó ("Te faltan 3 actividad(es)…"). El informe general también se rechazó, porque faltaban los 3 individuales.
2. **Registros sembrados:** con `--registrar-periodo` se agregaron 8 registros aprobados. El del integrante Uno, hecho en P4, se conservó.
3. **Entregas individuales:**
   - el líder entregó su informe;
   - su documento mostró el cronograma de sus 3 actividades del período, con un total de $325 sumado por nivel, los avances (100 %, 100 % y 50 %), los resultados y el avance del proyecto (73 %);
   - después entregaron Uno y Dos.
4. **Informe general:** el líder lo envió. Juntó a los 3 integrantes y las 9 actividades, cada una con su responsable, con un total del período de $875.
5. **Aprobación:** el asesor lo vio y lo aprobó.
6. **Corrección:** se cambió que al aprobar el general queden aprobados también los individuales. Antes seguían en "Enviado".

Además:
- `tsc` sin errores;
- `verificar_fichas.ts` 64 de 64, con 5 nuevas: solo se suma lo ejecutado, las actividades sin registro se cuentan, la suma de los individuales da el general y los borradores no cuentan;
- ESLint sin errores nuevos. Los 8 que reporta en `ProyectoPortadaForm` y `CartaProyectoForm` ya estaban en la fase 1.

## No probado todavía

- **Pedir ajustes al informe general y reenviarlo:** usa la misma lógica que el plan y los registros.
- **La aprobación conjunta de los individuales:** el cambio se hizo después de la prueba en el navegador. Se verificó por código.
- **El modo "un informe por trabajo".**

## Limitaciones conocidas

- **Redacción del informe:** se revisará con el asesor. El documento de contexto lo advierte.
- **Anexos de evidencia:** todavía no hay.
- **Informe final:** el compilado de los 5 informes queda para la entrega del cierre (constructor, pestaña Cierre).
- **Plantilla oficial:** el informe usa un formato propio, todavía no la plantilla oficial de documentos.

## Siguiente: P6

La prueba completa del flujo, de punta a punta, y el documento de referencia para las demás modalidades.
