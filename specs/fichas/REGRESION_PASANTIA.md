# Lista de regresión — pasantía (y sanidad de proyecto e investigación)

Se pasa **siempre sobre la base de desarrollo** (`DB_ENTORNO=desarrollo`, ver [ENTREGA_0.md](ENTREGA_0.md)):

- al cerrar cada entrega del módulo de fichas;
- antes de unir la rama `fase-2-fichas`.

El proyecto no tiene pruebas automáticas, así que esta lista es la red de seguridad.

**Cómo usarla:**
- Marcar ✓ o ✗ en cada punto y anotar la fecha de la pasada.
- Un ✗ que ya fallaba en la primera pasada (antes de cambiar nada) se anota como "ya existía" y no bloquea la entrega.
- La columna **Entrega** indica qué entrega del módulo puede romper ese punto. Esos puntos se revisan con más cuidado.

**Usuarios:**
- Los de `TESTING.md` (admin, decanato, asesor, egresado del seed).
- Los sembrados por `scripts/sembrar_pasantias_prueba.ts`: Andrea (pasantía completa) y Kevin (pasantía en curso, con muchos estados distintos).
- Julio, de la propuesta 40, para probar el formulario de visita.
- Volver a sembrar solo en la base de desarrollo: borra y vuelve a crear a Andrea y Kevin.

Pasada: ____ / ____ / ______ · Entrega: ____ · Responsable: __________

## A. Propuesta de pasantía (egresado)

| # | Prueba | Resultado esperado | Entrega | ✓/✗ |
|---|---|---|---|---|
| A1 | Crear una propuesta de pasantía desde el panel del egresado | Se crea en estado "Redactando" y abre el paso 1 | 4 | |
| A2 | Revisar los pasos del lado izquierdo | 7 pasos en este orden: Portada, Datos empresariales, Datos de supervisor, Carta de aceptación, Descripción de actividades, Justificación del proceso, Documentos del estudiante | 4 | |
| A3 | Intentar abrir un paso posterior sin completar los anteriores | No se puede: los pasos siguientes están bloqueados | 4 | |
| A4 | Paso 1: guardar el título | Se guarda y habilita el paso 2 | 4 | |
| A5 | Paso 2: elegir una empresa existente | Avanza al paso 3 | 4 | |
| A6 | Paso 2: registrar una empresa nueva | La propuesta queda en "Revisando Nueva Empresa"; solo Portada, Datos empresariales y Carta siguen editables | 4 | |
| A7 | Aprobar esa empresa en `/admin/empresas/solicitudes` | La propuesta vuelve a permitir avanzar | 4 | |
| A8 | Paso 3: elegir un supervisor de la empresa, o registrar uno nuevo | Con uno existente avanza; con uno nuevo queda "En Revisión Administrativa" | 4 | |
| A9 | Paso 4: fecha de inicio de la carta | No se puede elegir un inicio antes de emisión + 21 días; la fecha de fin se pone sola en inicio + 150 días | 4 | |
| A10 | Paso 5: cronograma | Muestra 5 períodos; cada uno con 4 subperíodos (7, 7, 7 y 9 días) | 4 y 5 | |
| A11 | Paso 5: guardar con menos de 4 actividades en un período o un subperíodo vacío | No deja guardar y explica el motivo | 4 | |
| A12 | Paso 6: dejar la justificación vacía | No deja continuar; con texto, avanza | 4 | |
| A13 | Paso 7: documentos | Pide comprobante de pago de TG, certificación de notas y carta de servicio social | 4 | |
| A14 | Enviar la propuesta completa | Estado "Enviada a Revisión"; las otras propuestas del egresado quedan en solo lectura | 4 | |
| A15 | Imprimir la propuesta (`/egresado/redactar/imprimir`) | El documento muestra todos los apartados con los datos ingresados | 4 | |

## B. Revisión y aprobación de la propuesta

| # | Prueba | Resultado esperado | Entrega | ✓/✗ |
|---|---|---|---|---|
| B1 | Admin: ver la propuesta en `/admin/propuestas/[id]` y asignarla a un coordinador | Aparece en el panel del coordinador | 4 | |
| B2 | Coordinador: aceptar la asignación y asignar un asesor | El asesor recibe la solicitud | — | |
| B3 | Asesor: aceptar la solicitud | La propuesta aparece en sus propuestas | — | |
| B4 | Asesor: solicitar ajustes con observaciones | El egresado ve el recuadro de observaciones, entra directo al paso 5 (cronograma) y puede "Reenviar Propuesta Ajustada" | 4 | |
| B5 | Asesor: aprobar la propuesta | Estado "Propuesta Aprobada" | — | |
| B6 | Coordinador: subir los 4 documentos de aprobación | Pide: propuesta aceptada, plan de trabajo firmado, dictamen del plan y dictamen de la propuesta | 4 | |
| B7 | Coordinador: dar inicio al plan de trabajo | La propuesta pasa a "en ejecución" | — | |
| B8 | Asesor: informe de primer contacto | Se crea con plazo de 7 días y valida las actividades del cronograma | 5 | |

## C. Ejecución de la pasantía (usar a Kevin)

| # | Prueba | Resultado esperado | Entrega | ✓/✗ |
|---|---|---|---|---|
| C1 | Egresado: abrir `/egresado/reportes` | Muestra los 5 informes con su fecha de entrega (día 30 de cada período) | 5 | |
| C2 | Registrar una actividad con una descripción fuera de 200–300 palabras o una conclusión fuera de 40–60 | No deja enviar y lo explica | 5 | |
| C3 | Registrar una actividad con 3 imágenes | Solo admite 2 (A y B), con su origen | 5 | |
| C4 | Enviar un subperíodo | Pide la declaración de autoría; queda enviado al asesor | 5 | |
| C5 | Trabajar el siguiente subperíodo con el actual enviado | Queda adelantado en borrador; no se envía hasta que el asesor apruebe el anterior | 5 | |
| C6 | Asesor: revisar el subperíodo 5.2 en `/asesor/seguimiento/[id]/semana/5/2` | Muestra la comparación de versiones, los comentarios por apartado, las marcas y el borrador de revisión | — | |
| C7 | Egresado: pedir una segunda eliminación de actividad en el mismo período | No lo permite (máximo 1 por período) | 5 | |
| C8 | Intentar enviar un informe de período con actividades sin aprobar | No lo permite | 5 | |
| C9 | Enviar un informe de período con menos de 20 páginas | No lo permite (requisito de extensión) | 5 | |
| C10 | Asesor: aprobar un informe sin comentarios para el decanato, o con menos de 40 palabras por pregunta | No lo permite | 5 | |
| C11 | Asesor (con Julio): formulario de visita | Solo se habilita entre los días 90 y 100; es requisito para aprobar el informe 3 | 5 | |
| C12 | Abrir un informe de período en vista de impresión y en Word | Se generan sin errores; Word no avisa que el archivo está dañado | — | |
| C13 | Informe final (informe 5) | Pide introducción, agradecimientos y carta de finalización; el asesor debe verificar la carta para aprobar | 5 | |
| C14 | Bitácora del egresado, del asesor y del coordinador | Registra los eventos de las pruebas anteriores | — | |

## D. Administración

| # | Prueba | Resultado esperado | Entrega | ✓/✗ |
|---|---|---|---|---|
| D1 | `/admin/periodos`: crear o editar una cohorte | Calcula las fechas máximas de los informes como hoy | 5 | |
| D2 | `/admin/bloques-propuestas` | Antes de la entrega 2: "Próximamente". Después: el constructor de fichas | 2 | |
| D3 | Ingresar con cada rol (admin, decanato, coordinador, asesor, egresado) | Cada uno entra a su panel sin errores | — | |

## E. Sanidad de proyecto e investigación

El asistente de la propuesta es compartido, así que la entrega 4 también puede afectar a estas modalidades.

| # | Prueba | Resultado esperado | Entrega | ✓/✗ |
|---|---|---|---|---|
| E1 | Crear una propuesta de proyecto | 8 pasos: Portada, Actores intervinientes, Carta, Descripción del problema, Justificación del proyecto, Alcance, Objetivos, Documentación de soporte | 4 | |
| E2 | Crear una propuesta de investigación | 7 pasos (sin Alcance) | 4 | |
| E3 | Invitar a un integrante y aceptar la invitación con otro egresado | Aparece en el equipo | 4 | |
| E4 | Objetivos con menos de 4 específicos | No deja continuar | 4 | |
| E5 | Enviar sin que todos ratifiquen o sin los documentos de cada integrante | No deja enviar y explica el motivo | 4 | |

## Resultado de la pasada

- Puntos con ✗ nuevos (no existían en la primera pasada): ________________________________
- ¿Se puede cerrar la entrega? Sí / No
