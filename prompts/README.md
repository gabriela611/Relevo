# Registro de prompts

Aquí se conserva el texto real de las solicitudes de trabajo visibles en esta conversación, sin corregir ortografía ni sustituirlo por resúmenes. Los metadatos están en este índice, no dentro del prompt original.

| ID | Fecha | Herramienta | Prompt | Resultado / alcance |
| --- | --- | --- | --- | --- |
| 001 | 2026-10-16 | OpenAI Codex | [Brief del MVP](001-mvp-brief.md) | Contexto del producto; no demuestra implementación |
| 002 | 2026-10-16 | OpenAI Codex | [Reparación de memoria](002-memory-repair.md) | Configuración local de Engram y comprobación de guardado |
| 003 | 2026-10-16 | OpenAI Codex | [Estructura y seguimiento](003-project-structure.md) | Documentación, registro de IA y tablero ODD |
| 004 | 2026-10-16 | Antigravity (Gemini) | [Diseño frontend y UX](004-frontend-design.md) | Sistema visual, UX y contratos del modelo de datos de frontend |
| 005 | 2026-10-16 | Antigravity (Gemini) | [Sincronización con main](005-sync-main.md) | Fetch upstream, actualización de main y rebase de feat/frontend-design-system |
| 006 | 2026-10-16 | Antigravity (Gemini) | [Organización de docs y ODD](006-organize-docs-and-start-odd.md) | Organización de AI_USAGE, registro de prompts y ejecución del ODD T1 |
| 007 | 2026-10-16 | Antigravity (Gemini) | [Flujos principales y PWA](007-main-flows-and-pwa.md) | Flujos Cobrar, Pagar, Verificación exitosa, PWA y caché offline |
| 008 | 2026-10-16 | OpenAI Codex | [Plan responsive, organización y Open Payments](008-responsive-plan-and-open-payments.md) | Actualización del plan ODD, estructura objetivo del frontend, división CSS y frontera con el contrato Open Payments |
| 009 | 2026-10-16 | OpenAI Codex | [Instalación de Impeccable](009-install-impeccable.md) | Instalación de `impeccable@4.6.0` en `.claude` del proyecto |
| 010 | 2026-10-16 | OpenAI Codex | [Auditoría Impeccable del frontend](010-impeccable-frontend-audit.md) | Auditoría y simplificación de UX, QR, importes, estados de pago y responsive |
| 011 | 2026-10-16 | Antigravity (Gemini) | [Branding: fusión fondo A + R de B](011-brand-logo-and-icons.md) | Fusión en SVG del fondo de A y la R de B de round 1: logo, app icon, favicon y branding |
| 012 | 2026-10-16 | Antigravity (Gemini) | [Refinamiento de logo: R continua sin corte medio](012-brand-refinement-whole-r.md) | Ajuste de la Opción 1 manteniendo la R sólida y continua sin partirla en la mitad |
| 013 | 2026-10-16 | Antigravity (Gemini) | [Refinamiento de App Icon completo sin anidación](013-app-icon-refinement.md) | Icono de app a sangre completa (512x512) sin simular logo anidado dentro de otro |
| 014 | 2026-10-16 | Antigravity (Gemini) | [App Icon a sangre, favicon y profesionalización de README](014-app-icon-fullbleed-and-readme.md) | App icon a sangre sin anidación, sincronización en favicon y profesionalización de README sin emojis con tabla de marca |




## Cómo continuar

1. Guardar cada nuevo prompt de trabajo en `NNN-tema.md`, copiando su texto exacto antes de cerrar la tarea.
2. Añadir fecha, herramienta y enlace al resultado en este índice. Registrar correcciones como nuevas entradas, no reescribir el original.
3. Actualizar [AI_USAGE.md](../AI_USAGE.md) y la tarea correspondiente en [ODD](../odd/tasks/mvp.md).

No incluir credenciales, tokens, claves privadas ni datos personales. Si un prompt futuro los contiene, sustituir solo el secreto por `[REDACTED: motivo]` y declarar la redacción en el índice; nunca presentar una copia redactada como íntegra.

## Cobertura y límites

Este registro no es una exportación automática de la sesión: no incluye configuración del entorno, instrucciones internas, salidas de herramientas ni respuestas del asistente. No hubo prompts delegados en esta preparación. Si se usan otros agentes o herramientas para generar código, añadir también sus prompts de trabajo reales y su procedencia.

Los prompts que produjeron el código anterior a esta conversación no están disponibles. El equipo debe recuperarlos de sus herramientas originales; no se reconstruyen ni se inventan. La divulgación no estará completa hasta resolver esa brecha.

Fuente: [política de IA de Interledger](https://interledger.org/hackathon/ai-policy/), consultada el 2026-10-16.
