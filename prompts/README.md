# Registro de prompts

Aquí se conserva el texto real de las solicitudes de trabajo visibles en esta conversación, sin corregir ortografía ni sustituirlo por resúmenes. Los metadatos están en este índice, no dentro del prompt original.

| ID | Fecha | Herramienta | Prompt | Resultado / alcance |
| --- | --- | --- | --- | --- |
| 001 | 2026-10-16 | OpenAI Codex | [Brief del MVP](001-mvp-brief.md) | Contexto del producto; no demuestra implementación |
| 002 | 2026-10-16 | OpenAI Codex | [Reparación de memoria](002-memory-repair.md) | Configuración local de Engram y comprobación de guardado |
| 003 | 2026-10-16 | OpenAI Codex | [Estructura y seguimiento](003-project-structure.md) | Documentación, registro de IA y tablero ODD |

## Cómo continuar

1. Guardar cada nuevo prompt de trabajo en `NNN-tema.md`, copiando su texto exacto antes de cerrar la tarea.
2. Añadir fecha, herramienta y enlace al resultado en este índice. Registrar correcciones como nuevas entradas, no reescribir el original.
3. Actualizar [AI_USAGE.md](../AI_USAGE.md) y la tarea correspondiente en [ODD](../odd/tasks/mvp.md).

No incluir credenciales, tokens, claves privadas ni datos personales. Si un prompt futuro los contiene, sustituir solo el secreto por `[REDACTED: motivo]` y declarar la redacción en el índice; nunca presentar una copia redactada como íntegra.

## Cobertura y límites

Este registro no es una exportación automática de la sesión: no incluye configuración del entorno, instrucciones internas, salidas de herramientas ni respuestas del asistente. No hubo prompts delegados en esta preparación. Si se usan otros agentes o herramientas para generar código, añadir también sus prompts de trabajo reales y su procedencia.

Los prompts que produjeron el código anterior a esta conversación no están disponibles. El equipo debe recuperarlos de sus herramientas originales; no se reconstruyen ni se inventan. La divulgación no estará completa hasta resolver esa brecha.

Fuente: [política de IA de Interledger](https://interledger.org/hackathon/ai-policy/), consultada el 2026-10-16.
