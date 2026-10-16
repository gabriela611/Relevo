# Uso de inteligencia artificial

Registro parcial y verificable del uso de IA en RELEVO. Última actualización: 2026-10-16. No atribuye a esta sesión el código que ya existía.

## Herramientas y alcance observado

| Herramienta | Uso | Archivos / componentes | Validación |
| --- | --- | --- | --- |
| OpenAI Codex | Diagnóstico y configuración local de memoria Engram | `.engram/config.json` | Guardado y recuperación de memoria comprobados |
| OpenAI Codex | Organización del progreso y documentación de IA | `README.md`, `AI_USAGE.md`, `odd/README.md`, `odd/tasks/mvp.md`, `prompts/*.md`, `.gitignore` | Comprobación estructural; no acredita pruebas funcionales |

- **Modelo exacto:** no expuesto de forma verificable en esta sesión; completar desde el historial de la herramienta si está disponible.
- **Plan de pago y créditos consumidos:** no disponibles para el agente; el responsable debe registrar el plan y consumo reales antes de entregar, si corresponde. No se declara consumo cero.
- **Skills consultadas para esta preparación:** `cognitive-doc-design` y `work-unit-commits`. Son instrucciones auxiliares, no autores ni modelos independientes.
- **Herramientas auxiliares:** Engram para memoria y CodeGraph para consultar la estructura. El índice local de CodeGraph no es un entregable del producto.

## Participación humana y procedencia pendiente

El usuario aportó el brief, las restricciones y las solicitudes registradas en [prompts](prompts/README.md). No se presume que el brief se haya escrito sin asistencia de IA.

`frontend/`, `backend/`, `shared/`, los manifiestos npm, el lockfile, `README.md` y `ARCHITECTURE.md` ya existían antes de esta preparación. Su autoría y uso previo de IA no se han determinado. Esta sesión no modificó el código de la aplicación ni verificó pagos reales.

**Archivos con uso mínimo o nulo de IA:** todavía no identificados por el equipo. No se afirma que el servicio Open Payments ni otro archivo cumpla esa condición sin evidencia.

## Antes de entregar

- [ ] Recuperar herramientas, modelos y prompts del trabajo anterior.
- [ ] Identificar contribuciones humanas y archivos con uso mínimo o nulo de IA.
- [ ] Completar el consumo real de créditos de herramientas pagas, si corresponde.
- [ ] Mantener el registro de prompts completo y revisar que no publique secretos.
- [ ] Revisar, comprender y probar el código asistido; registrar evidencia en ODD.

Los [prompts reales disponibles](prompts/README.md) y el [seguimiento del MVP](odd/tasks/mvp.md) son los registros asociados. Esta declaración sigue la [política oficial de IA](https://interledger.org/hackathon/ai-policy/), consultada el 2026-10-16; los pendientes anteriores impiden declarar cumplimiento completo.
