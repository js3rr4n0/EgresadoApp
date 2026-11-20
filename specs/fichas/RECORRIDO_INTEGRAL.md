# Recorrido integral de las 3 modalidades (preparación para la próxima reunión)

**Pedido de la reunión:** "Hay que correr y revisar los procesos para los 3 elementos/modalidades desde el inicio, crear una cohorte, las fichas, usuarios, etc., y probar todo." Para qué sirve:
- ajustar cosas antes de dárselo a alguien para que lo pruebe en cada rol;
- tener la base de los manuales de usuario;
- ver qué hay que ajustar.

Este documento es el guion del recorrido y la lista de lo que falta. Se llena con hallazgos a medida que se recorre. Los ajustes al documento final quedan para el final.

**Estado de cada paso:**
- ✅ funciona hoy;
- ⚠️ funciona con salvedades;
- ❌ falta;
- 🔎 por recorrer.

## 1. Datos limpios para el recorrido

Todo se crea **desde las pantallas**, no con scripts, para recorrer lo mismo que hará un administrador real. Los datos de prueba anteriores no se tocan: la cohorte, los usuarios y las fichas son nuevos.

| Qué | Dónde | Propuesta para el recorrido |
|---|---|---|
| Cohorte | Admin › Fechas y Periodos | `DEMO-2026`, recepción abierta |
| Facultad y carrera | Admin › Facultades y Carreras | Las existentes: Ingeniería › Ingeniería en Sistemas |
| Usuarios | Admin › Usuarios (uno por uno) o Carga Masiva (`usuarios.csv`) | Coordinador, asesor, decanato y 6 egresados de `DEMO-2026` |
| Empresa | Admin › Catálogo de Empresas | Una empresa para la pasantía y otra para el proyecto |
| Fichas | Admin › Editar Bloques Propuestas | Una ficha por modalidad para Ingeniería en Sistemas |

**Egresados de la cohorte DEMO:**
- **Pasantía:** 1, individual.
- **Proyecto:** equipo de 3 (líder y dos integrantes).
- **Investigación:** 2, uno individual y otro como líder de un equipo de 2. Para el equipo se usa uno de los egresados de proyecto, o se crea un séptimo.

## 2. Guion por modalidad

### 2.1 Común a todas
1. ✅ El admin crea la cohorte, los usuarios y la ficha, y la habilita (constructor, "Habilitar…").
2. ⚠️ **Cohorte y ficha:** la cohorte **no se liga a una versión de la ficha**. La propuesta toma la última versión habilitada que corresponde a la carrera del egresado. Las columnas "Cohortes" y "Procesos" de la lista de fichas están vacías (entrega 3 pendiente).
3. 🔎 El egresado entra, cambia la contraseña temporal y elige la modalidad.
4. 🔎 La coordinación revisa, asigna el asesor y dictamina la propuesta. El decanato interviene donde corresponda.

### 2.2 Pasantía
| # | Paso | Rol | Estado |
|---|---|---|---|
| 1 | Propuesta con el asistente de 7 pasos y carta de aceptación | Egresado | ✅ (fase 1) |
| 2 | Revisión y aprobación, con asignación de asesor | Coordinación y asesor | ✅ (fase 1) |
| 3 | Primer contacto y visita | Asesor | ✅ (fase 1) |
| 4 | Ejecución por subperíodos, bitácora e informes mensuales | Egresado y asesor | ✅ (fase 1) |
| 5 | Informe final y cierre | Egresado y asesor | 🔎 |
| — | **La ficha de pasantía no gobierna el proceso** | Admin | ❌ |

Sobre la última fila: el asistente de pasantía sigue siendo el de la fase 1, con sus pasos fijos, así que cambiar la ficha no cambia lo que ve el egresado. Conectar la pasantía a la ficha es la "entrega 4".

### 2.3 Proyecto
| # | Paso | Rol | Estado |
|---|---|---|---|
| 1 | Propuesta desde la ficha, en equipo, con invitaciones y firmas | Equipo | ✅ (P0–P2) |
| 2 | Aprobación | Coordinación y asesor | ✅ |
| 3 | Plan de trabajo general e individual, con presupuesto, y aprobación | Equipo y asesor | ✅ (P3) |
| 4 | Dar inicio | Coordinación | ✅ |
| 5 | Ejecución por actividad: avance, evidencias, Gantt, productos por objetivo, bitácora y adelantar | Equipo y asesor | ✅ (P4 y 13-nov) |
| 6 | Informes del período | Equipo y asesor | ✅ (P5) |
| 7 | Informe final o cierre del proyecto | Equipo y asesor | ❌ |
| — | Solicitudes de cambio al cronograma; decanato ante cambios muy grandes | Asesor y decanato | ❌ |
| — | Primer contacto y demás hitos de la ejecución de proyecto | Asesor | ❌ |

Sobre el informe final: hoy el proyecto termina en los informes del período.

### 2.4 Investigación
| # | Paso | Rol | Estado |
|---|---|---|---|
| 1 | Propuesta desde la ficha | Egresado o equipo | ✅ |
| 2 | Aprobación | Coordinación y asesor | ✅ |
| 3 | Protocolo: 14 partes, fuentes y citas, recursos y presupuesto, PDF y Word, ratificación | Equipo | ✅ (I3 y 19-nov) |
| 4 | Plan: cronograma de investigación, metodología por objetivo, dictamen junto con el protocolo | Equipo y asesor | ✅ (19-nov) |
| 5 | Dar inicio | Coordinación | ✅ |
| 6 | Ejecución por elementos, validación por elemento, bitácora aceptada por el asesor | Equipo y asesor | ✅ (E3) |
| 7 | Informes del período | Equipo y asesor | 🔎 (con la estructura nueva) |
| 8 | Informe final por capítulos, con el capítulo por objetivo, ratificación y entrega | Equipo y asesor | ✅ (I5 y E4) |
| — | Agregar subactividades durante la ejecución (hallazgos) | Equipo y asesor | ❌ |

## 3. Constructor de fichas y catálogo: lo que ya se vio (19-nov)

- ✅ **Crear una ficha** (modalidad, facultad, carrera; el código se genera solo): funciona.
- ✅ **Partir de una copia** de cualquier versión de otra ficha de la misma modalidad.
- ⚠️ **"Partir de la ficha base" de proyecto o investigación trae solo la propuesta.**
  - El protocolo, el plan, la ejecución y el informe final hay que agregarlos uno por uno, con los botones de cada pestaña.
  - Se probó con una investigación nueva (borrador INV-GEN-001): con los tres botones quedó completa y "sin problemas", con los valores recomendados (cronograma de investigación, 5 × 30 días, informe por capítulos).
  - **Ajuste propuesto:** una opción "Plantilla recomendada" en "Partir de", que cree la ficha completa de una vez.
- ⚠️ **Textos desactualizados en el constructor:**
  - "Esta ficha no tiene protocolo" todavía menciona el "esquema del informe final", que se quitó.
  - El plan vacío explica solo el cronograma de proyecto.
  - La lista de fichas dice "Los egresados todavía usan el asistente actual; las fichas se conectarán… en la entrega 4", pero proyecto e investigación ya están conectados.
- ⚠️ **"Partir de" lista todas las versiones** (13 de INV-ING-001), aun las viejas. Conviene mostrar solo las habilitadas o la última.
- ⚠️ **Catálogo de elementos:** es solo de consulta. "+ Nuevo elemento" y "Editar campos" dicen "entrega posterior". Para el recorrido basta; se decide en la reunión si hacen falta.
- ❌ **Pestañas Cierre, Presentación de revisión, Presentación pública y Roles:** son solo de diseño.
- 🔎 **Pendiente de recorrer:**
  - armar desde cero una ficha de proyecto y una de pasantía;
  - la vista del egresado de cada una;
  - qué pasa al habilitar una versión nueva con propuestas en curso.

## 4. Lo que falta por modalidad (resumen para la reunión)

| Modalidad | Falta | Prioridad sugerida |
|---|---|---|
| Común | Ligar la cohorte a la versión de la ficha (entrega 3) | Alta: el recorrido la expone |
| Común | Plantilla recomendada al crear una ficha; textos del constructor | Alta y barata |
| Común | Cierre, presentaciones y roles | Media: definir en la reunión |
| Pasantía | Que la ficha gobierne el asistente y la ejecución (entrega 4) | Media: hoy funciona con la fase 1 |
| Proyecto | Informe final o cierre; solicitudes de cambio y decanato; hitos de ejecución | Alta: el recorrido termina sin cierre |
| Investigación | Subactividades nuevas durante la ejecución; Q5 (quién redacta el protocolo) y Q6 (feriados) | Media |
| Todos | Ajustes al documento final | Al final, según lo acordado |

## 5. Orden propuesto del recorrido

1. **Arreglos baratos del constructor** que estorban al recorrido: la plantilla recomendada al crear la ficha y los textos desactualizados.
2. **Datos DEMO desde las pantallas:** cohorte, usuarios (probando la carga masiva) y empresas.
3. **Fichas DEMO** de las tres modalidades, armadas en el constructor y habilitadas.
4. **Recorridos, cada uno de punta a punta, rol por rol:** investigación (la más completa), después proyecto y por último pasantía. Se anota cada hallazgo aquí y las capturas sirven para los manuales.
5. **Lista final para la reunión:** lo ajustado y lo que queda.

## 6. Datos DEMO creados (20-nov)

- **Ciclo:** DEMO-2026, recepción del 19-nov al 15-dic-2026 (fechas calculadas por la pantalla).
- **Fichas:** las dos con la plantilla recomendada, para *Ingeniería en desarrollo de software*, y habilitadas:
  - INV-ING-002-SOFT v1;
  - PRO-ING-002-SOFT v1.
- **Pasantía:** sin ficha DEMO, porque se recorre con la fase 1 (H6).
- **Usuarios:** 10, por la carga masiva (`usuarios.csv`), con la contraseña inicial de la carga y todos de Ingeniería en desarrollo de software.

| Rol | Correo |
|---|---|
| Coordinación | coord.demo@demo.test |
| Asesor | asesor.demo@demo.test |
| Decanato | decanato.demo@demo.test |
| Pasantía | pas.demo@demo.test |
| Proyecto | pro.lider.demo, pro.int1.demo y pro.int2.demo (@demo.test) |
| Investigación individual | inv.solo.demo@demo.test |
| Investigación en equipo | inv.lider.demo e inv.int.demo (@demo.test) |

- **Inicio de sesión:** inv.solo.demo entra y ve su panel con los documentos obligatorios.
- **Empresas:** todavía no se crearon; se ven en el recorrido de pasantía y de proyecto.

**Recorrido de investigación (inv.solo.demo, propuesta 75), hecho desde las pantallas:**
1. ✅ Crear la propuesta: queda ligada a INV-ING-002-SOFT v1.
2. ✅ Llenar los 7 pasos: portada, actores, carta en PDF con el supervisor, problema, justificación, 4 objetivos y documentos de soporte.
3. ⚠️ Subir los 3 documentos obligatorios del panel y ratificar (H14, H15), y enviar.
4. ✅ El admin asigna la coordinación DEMO.
5. ✅ La coordinación asigna el asesor DEMO y el asesor acepta.
6. ⚠️ El asesor sube los 3 PDF de dictámenes y aprueba con "Dar OK (Aprobar Plan)" (H17): la propuesta queda **aprobada**.
7. ✅ Protocolo desde las pantallas: la introducción y el desarrollo inicial citado se escribieron a mano; el resto, con datos de prueba (`--completar-protocolo`, `--fuentes-prueba` y `--cronograma-prueba --sin-aprobar`, con `--propuesta 75`).
8. ✅ El protocolo y el plan quedaron sin pendientes. La egresada los envió y el asesor los aprobó con su dictamen escrito (H21, H22).
9. ✅ La coordinación da inicio: el botón se habilita solo con el plan aprobado (H17 resuelto, H23).
10. ✅ Ejecución: la egresada registra la metodología 1.1.1 (25 %, "Concluido, por validar") y el asesor la valida (H24).
11. ✅ El informe final muestra el capítulo "Desarrollo de la investigación por objetivo" que genera el sistema. La redacción, la ratificación y la entrega ya se habían probado en I5 y E4; aquí no se repitieron.
12. 🔎 Pendiente del recorrido de investigación: el trabajo en equipo (las invitaciones y la ratificación ya se probaron en proyecto) (inv.lider.demo con inv.int.demo), para probar invitaciones, ratificación y el aviso "Esta propuesta espera su revisión".

**Recorrido de proyecto (equipo pro.lider/pro.int1/pro.int2.demo, propuesta 76), desde las pantallas:**
1. ✅ El líder crea la propuesta (ligada a PRO-ING-002-SOFT v1), llena los 8 pasos e invita a los dos integrantes.
2. ⚠️ Los integrantes aceptan, suben sus documentos y ratifican. Hubo que arreglar H25, y una firma quedó sin valor sin que nadie lo viera (H26). El líder ratifica y envía.
3. ✅ Asignaciones: admin, coordinación y asesor; ya no aparece el botón de Gantt.
4. ✅ El asesor ve "Esta propuesta espera su revisión" y aprueba con "Aprobar propuesta": H17 verificado en una propuesta nueva.
5. ✅ El líder arma el plan: agrega 3 objetivos (H27), asigna 3 por integrante y pone productos, macroactividad, actividad y montos. Queda sin pendientes, con una carga de 05 por integrante, y lo envía.
6. ✅ El asesor aprueba el plan y sube los 3 dictámenes; la coordinación da inicio.
7. ✅ La integrante Paula registra su actividad 1.4.1.1 con una evidencia; el asesor la ve en "Por revisar" y la aprueba.
8. ✅ Se genera el informe general del período 1, con el cronograma y el presupuesto.
9. ❌ No hay informe final ni cierre del proyecto (H7).

## 7. Hallazgos del recorrido

| # | Dónde | Hallazgo | Estado |
|---|---|---|---|
| H1 | Fechas y Periodos | La cohorte no se liga a una versión de la ficha | Abierto (entrega 3) |
| H2 | Nueva ficha | "Partir de la ficha base" de proyecto o investigación trae solo la propuesta | **Resuelto (20-nov):** "Plantilla recomendada", la opción por defecto en proyecto e investigación |
| H3 | Constructor | Textos desactualizados: protocolo, plan vacío y aviso de la lista de fichas | **Resuelto (20-nov)** |
| H4 | Nueva ficha | "Partir de" lista todas las versiones, también las viejas | **Resuelto (20-nov):** solo la versión vigente de cada ficha |
| H5 | Catálogo | "Nuevo elemento" y "Editar campos" no disponibles | **Decidido (20-nov): sí debe poder hacerlo, es un paso esencial.** Diseño y entregas C1–C4 en `CATALOGO_EDITABLE.md`. **C1–C4 hechas (20-nov):** crear y publicar elementos propios, agregarlos a las fichas como copia, llenarlos en la propuesta, el protocolo y el informe final, y agregar campos adicionales a los elementos del sistema. Los campos del sistema siguen fijos (ver §8 de CATALOGO_EDITABLE.md) |
| H6 | Pasantía | La ficha no gobierna el proceso | Abierto (entrega 4) |
| H7 | Proyecto | Sin informe final ni cierre | Abierto |
| H8 | Fechas y Periodos | El formulario del ciclo está pensado para pasantía (4 informes, visita, 150 días); proyecto e investigación usan los períodos de su ficha | Para la reunión |
| H9 | Carga masiva y usuario nuevo | La cohorte se exigía con el formato "C12026", pero los ciclos se llaman "C1-2026" o "DEMO-2026": un CSV real fallaba. Una lista inválida en carreras o cohortes asignadas rompía la carga | **Resuelto (20-nov):** la cohorte debe ser un ciclo existente, el egresado la necesita y las listas inválidas dan un error claro. El usuario nuevo elige la cohorte asignada de los ciclos |
| H10 | Usuarios | **No existe el cambio de contraseña**, aunque el formulario dice "deberá cambiarla al primer acceso". No hay "olvidé mi contraseña". La carga masiva pone "Egresado123!" a todos y no lo decía | Fuera del alcance: es de otro módulo (la carga masiva ya avisa la contraseña inicial) |
| H11 | Dos fichas para la misma carrera | Si hay dos fichas habilitadas de la misma modalidad y carrera, la propuesta toma la de número de versión más alto, no la más nueva. Por eso las fichas DEMO van en otra carrera | Para la reunión (se resuelve con H1) |
| H12 | Inicio del egresado | Los documentos obligatorios dicen "CUM requerido para optar a pasantía" en todas las modalidades | **Resuelto (20-nov):** "CUM requerido para el trabajo de graduación" |
| H13 | Propuesta de investigación (asistente) | Textos de proyecto en investigación: "motiva el desarrollo de este proyecto", "Integrantes… a este proyecto", la ratificación habla de la "versión final del proyecto". "Título al que se quiere optar" se llena con el nombre de la carrera, no con el título | **Resuelto (20-nov).** Además de los textos, "Título al que se quiere optar" y "PARA OPTAR AL TÍTULO DE" se deducen de la carrera (`lib/tituloCarrera.ts`): "Ingeniería en…" → "Ingeniero(a) en…" |
| H14 | Documentos del egresado | Hay **dos juegos de documentos obligatorios distintos**. El panel pide servicio social, notas y pago; el paso 7 pide hoja de inscripción, constancia de horas sociales y carta de servicio social. El envío exige los seis. Es el pendiente O3 | **Resuelto (20-nov).** Decisión: son 3, hoja de inscripción, constancia de servicio social y hoja de notas. Eran los mismos 3 archivos con nombres distintos en el panel y en el paso de documentos; ahora todas las pantallas, la impresión, el catálogo y los mensajes usan los mismos nombres |
| H15 | Envío de la propuesta | En trabajo **individual** también hay que "ratificar". El botón está solo en el paso 1, no confirma nada visible y el error sale crudo: "RATIFICACION_INCOMPLETA: … versión final del plan de trabajo" | **Resuelto (20-nov).** El error dice quién falta. En trabajo individual no hay que ratificar aparte: la portada lo explica y el envío deja ratificada la versión enviada (no probado en el navegador: hace falta enviar una propuesta completa) |
| H16 | Propuesta enviada | El resumen dice "Sin supervisor asignado" aunque el supervisor se llenó en el paso de la carta | **Resuelto (20-nov):** en proyecto e investigación el resumen muestra el supervisor que se escribió en la carta |
| H17 | Aprobación (fase 1 en investigación) | **Asignación en 3 pasos:** admin → coordinación, coordinación → asesor, el asesor acepta. **La aprobación queda escondida:** el asesor la da con "✅ Dar OK (Aprobar Plan)", debajo de un Gantt de pasantía vacío ("0 actividades"). **Dictámenes:** hay que subir 3 PDF, entre ellos un "Dictamen de Plan de Trabajo" antes de que exista el plan. **Otras pantallas:** la coordinación ve "Dar inicio al plan" y "Gantt", y la página del asesor dice "el equipo todavía no ha empezado su plan" antes de aprobar | **Resuelto (20-nov) para proyecto e investigación.** Asesor: la pestaña se llama "Revisión de la propuesta", con un aviso "Esta propuesta espera su revisión" y el botón "✅ Aprobar propuesta", sin el Gantt de pasantía; el estado dice "Aprobada: el equipo elabora el protocolo y el plan de trabajo" y el aviso del plan solo aparece después de aprobar. Dictámenes: explican que se suben al aprobar el plan. Coordinación: "Dar inicio" queda bloqueado con el motivo ("Falta que el asesor apruebe el protocolo y el plan…") y sin botones de Gantt. Egresado: el panel dice "Propuesta aprobada: ahora sigue el protocolo y el plan de trabajo". La asignación en 3 pasos se mantiene (fase 1) |
| H18 | Coordinación e historial | "Fecha aprobación" muestra la fecha de envío. El historial registra "coordinador_asignado → solicitud_asesor_enviada" aunque el estado no cambió | **Resuelto (20-nov).** Columna "Fecha" con envío o aprobación. El historial (egresado y coordinación) muestra los eventos como tales, "Solicitud de asesoría enviada al docente (estado: Coordinador asignado)", y los cambios con nombres legibles (`lib/historialEstados.ts`) |
| H19 | Objetivos | La propuesta de la ficha base pide de 4 a 6 objetivos específicos y el protocolo de 3 a 5: una propuesta con 6 no pasa el protocolo | **Resuelto (20-nov).** Decisión: que se alinee. Propuesta, protocolo, plan e informe final usan el mismo rango (`lib/fichas/objetivos.ts`) |
| H20 | Trabajo individual | Textos de equipo para una sola persona. Egresada: "Como líder, estructuras el plan y asignas un responsable a cada objetivo". Asesor: "que la carga del equipo sea equitativa" | **Resuelto (20-nov):** textos para trabajo individual en el plan (egresado y asesor) |
| H21 | Panel del asesor | **En proyecto e investigación no hay bandeja.** El panel no avisa que llegó el protocolo y el plan, ni que hay registros de la ejecución por revisar; hay que entrar a "Ver progreso" y desde ahí a la ejecución. La bandeja actual solo muestra pasantía | **Resuelto (20-nov):** el panel del asesor tiene "Por revisar: proyectos e investigaciones" (`actions/bandejaFichas.ts`, `BandejaFichasAsesor.tsx`) con plan y protocolo enviados, registros, informes del período, productos por objetivo y capítulos o informe final entregado, por días de espera y con su enlace. Probado con Marco: 7 pendientes, los enlaces abren la revisión |
| H22 | Página del asesor | El aviso dice "El equipo envió su plan de trabajo"; en investigación debería decir "el protocolo y el plan de trabajo" | **Resuelto (20-nov):** en investigación dice "el protocolo y el plan de trabajo" |
| H23 | Coordinación | La pestaña dice "Validar Documentos (4 Obligatorios)", pero son 3 | **Resuelto (20-nov):** "Validar Documentos Obligatorios" |
| H24 | Ejecución de investigación | El resumen dice "Avance del proyecto" y "0 de 4 actividades enviadas" | **Resuelto (20-nov):** "Avance de la investigación" y "elementos o subactividades enviados" |
| H25 | Equipo: panel del integrante | **Bloqueante.** El integrante que acepta la invitación deja de ver sus documentos obligatorios, y su panel dice "enviada a revisión" aunque la propuesta sigue en redacción. Como el envío exige los documentos de todos, el equipo no podía enviar | **Resuelto (20-nov):** mientras la propuesta del equipo está en redacción, el integrante ve y sube sus documentos |
| H26 | Equipo: ratificación | No se ve quién ratificó ni qué firmas dejaron de valer (por ejemplo, cuando otro integrante acepta, cambia la huella). El líder solo ve "RATIFICACION_INCOMPLETA…" | **Resuelto (20-nov).** La portada muestra "Firmas de la versión actual: X de N" con ✓ firmó, ↺ debe volver a firmar (la propuesta o el equipo cambió) y ○ falta firmar; se actualiza al ratificar y al guardar el título. Probado con la propuesta 78 |
| H27 | Proyecto: objetivos | La propuesta permite hasta 6 objetivos y el plan exige 3 por integrante (9 en un equipo de 3), así que el líder tiene que agregar objetivos en el plan. Es la pregunta abierta de FICHA_PROYECTO §7 | **Resuelto (20-nov).** Decisión: de 3 a 4 objetivos por integrante. El elemento «Objetivos» de la ficha define el rango por integrante; la propuesta pide ese rango por la cantidad de integrantes, el plan lo exige por integrante (mínimo y máximo) y el envío lo vuelve a revisar por si cambió el equipo. Las fichas ya habilitadas conservan su 4 a 6, que ahora se entiende por integrante; las versiones nuevas parten de 3 a 4 |
| H28 | Estados después del plan | Con el plan aprobado, el estado del asesor sigue diciendo "Aprobada: el equipo elabora el plan de trabajo". En proyecto el panel decía "envíelos" | **Resuelto (20-nov):** "envíelo" en proyecto; el estado del asesor dice "Por revisar: …" con el plan enviado y "Plan aprobado: falta que la coordinación dé inicio" cuando ya lo aprobó |
| H29 | Pasantía: empresa nueva | Para registrar una empresa nueva hacen falta **dos aprobaciones seguidas del admin**: primero la empresa y después su supervisor, y la propuesta queda bloqueada en cada una. Además, la empresa nueva deja un supervisor vacío (sin nombre) en la lista para elegir | **Resuelto (20-nov).** La solicitud de empresa nueva trae una sección "Supervisor en la empresa"; con una sola aprobación quedan la empresa, su supervisor y la propuesta ligada a él. Si no se llena, ya no se crea un supervisor vacío. Probado con la propuesta 79 (empresa "Laboratorio Demo H29") |

## 8. Lista para la reunión

**Recorrido hecho desde las pantallas con datos DEMO:**
- **Investigación individual (propuesta 75):** de la propuesta a la ejecución y el informe final.
- **Proyecto en equipo (76):** de la propuesta a la ejecución y el informe del período.
- **Pasantía con empresa nueva (77):** de la propuesta al primer contacto. Lo que sigue en pasantía es la fase 1, que ya tenía su prueba de regresión.

**Arreglado durante el recorrido:**
- **H2:** plantilla recomendada.
- **H3:** textos del constructor.
- **H4:** "Partir de" solo con la versión vigente.
- **H9:** carga masiva por ciclo.
- **H17:** aprobación de la propuesta en proyecto e investigación.
- **H25:** documentos del integrante del equipo.
- **H28:** un texto del panel.

**Decisiones de la reunión (20-nov):**
- **H14:** los obligatorios son 3: hoja de inscripción, constancia de servicio social y hoja de notas. Hecho.
- **H27:** de 3 a 4 objetivos por integrante. Hecho.
- **H19:** alinear los rangos. Hecho.
- **H5:** el catálogo debe permitir crear elementos y editar campos. Diseño en `CATALOGO_EDITABLE.md`; C1–C4 hechas.

**Siguen para decidir:**
1. **H1 y H11:** qué versión de la ficha usa cada cohorte, incluida la cohorte en curso cuando se habilita una versión nueva.
2. **H7 y H6:** informe final o cierre de proyecto, y si la ficha de pasantía debe gobernar su proceso.
3. **H8:** el formulario del ciclo está pensado para pasantía.

**Pendientes de trabajo, por prioridad:**
1. ~~H21~~ **Resuelto (20-nov).**
2. ~~H26~~ **Resuelto (20-nov):** estado de las firmas en la portada; el error de envío dice quién falta (H15).
3. ~~H29~~ **Resuelto (20-nov):** empresa nueva con su supervisor en una sola aprobación, sin supervisor vacío.
4. ~~Textos~~ **Resueltos (20-nov):** H12, H13 (con el título al que se opta), H15, H16, H18 (con el historial), H20, H22, H23, H24 y H28.
5. **Sin probar todavía:** investigación en equipo. Las invitaciones y la ratificación ya se probaron en proyecto.
