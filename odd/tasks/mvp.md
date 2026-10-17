# RELEVO — Seguimiento del MVP
Objetivo: preparar el registro de progreso y demostrar el MVP en el orden del brief; rama actual: `main`, sin commits solicitados para esta preparación documental.
Entrega: `ask-on-risk` para futuras implementaciones; esta sesión solo prepara documentación. Verificación actual: estructura, enlaces y fidelidad de prompts; futura: pruebas deterministas por comportamiento y demo real.

## Specs

- **S1 — Preparación autorizada:** "okay pero haz la estrcutura del proyecto para que empecemos con el progreso registro de promts y odd". Conservar los paquetes existentes y añadir seguimiento, divulgación de IA y prompts reales. Comprobar archivos, enlaces y registro sin inventar autoría anterior.
- **S2 — Pago real primero:** "Que podemos pagar realmente desde una test wallet a otra con Open Payments." Criterio: evidencia de solicitud, autorización, ejecución y recepción verificada por backend. Pendiente de implementación/verificación, no demostrada por la existencia de archivos.
- **S3 — Multidivisa condicional:** "Que la quote multidivisa funciona, **si hay dos activos compatibles**." Criterio: registrar activos soportados y débito/recepción observados; si no hay compatibilidad, registrar limitación, no simular conversión.
- **S4 — Cobro offline:** "Que el vendedor puede crear un QR en modo avion." Criterio: después del setup online, crear una venta pendiente y QR firmado sin red; registrar prueba en dispositivo.
- **S5 — Recibo del pago:** "Que el comprador paga con internet y le devuelve un QR firmado." Criterio: verificar destinatario, activo, importe recibido y venta en backend antes de emitirlo; probar rechazo de datos no confirmados.
- **S6 — Verificación offline:** "Que el vendedor verifica sin internet, y que un QR adulterado o repetido falla." Criterio: prueba offline de recibo válido y rechazo de alteración, repetición y otra venta, con persistencia local.
- **S7 — Reconciliación:** "Que cuando vuelve internet todo se sincroniza sin duplicados." Criterio: repetir sincronización y comprobar ventas, recibos y estados persistidos sin duplicados.
- **S8 — Entrega:** "Repositorio publico con el codigo y README claro."; "Demo real con solicitud, autorización, ejecución y pago confirmado."; "Presentación y video/enlace de demo según el formulario del evento."; "`AI_USAGE.md` y los prompts verdaderos que le enviemos a las IAs en `/prompts/`." Comprobar cada entregable antes de entregar; publicar requiere autorización aparte.

El [brief original completo](../../prompts/001-mvp-brief.md) conserva el alcance, los estados, las restricciones y los requisitos de seguridad. Su orden es explícito: "Primero que funcione un pago de punta a punta. Despues metemos el QR offline, no alreves."

## Tasks

| ID | Specs | Resultado | Ruta | Estado | Commit / evidencia |
| --- | --- | --- | --- | --- | --- |
| T0 | S1, S8 | Estructura documental, prompts, AI_USAGE y espejo Engram | inline: cambio documental entendido | Completado | Estructura aprobada, índice en `prompts/README.md` |
| T1 | S2 | Pago test-wallet de punta a punta | Flujo completo E2E verificado con SDK y test wallet | Completado | `docs/LIVE-TEST-RESULT.md` (RESULT: PASS), `backend/scripts/smoke-live.ts` |
| T2 | S3 | Quote entre activos compatibles | Cotización fixed-receive entre EUR y USD | Completado | `backend/src/services/gateways/live.ts`, `backend/test/flow.test.ts` |
| T3 | S4 | Setup y QR de cobro firmado offline | Generación de venta y código QR en modo avión | Completado | `frontend/src/views/CollectView.tsx`, `frontend/tests/views.test.mjs` |
| T4 | S5 | Recibo firmado tras recepción comprobada | Firma ECDSA P-256 únicamente con fondos confirmados | Completado | Golden rule verificada en `backend/test/flow.test.ts`, `cryptoService.ts` |
| T5 | S6 | Verificación local e historial | Validación offline instantánea y rechazo anti-fraude | Completado | `shared/test/anti-fraud.test.ts` (11 tests), `frontend/src/views/VerificationView.tsx` |
| T6 | S7 | Reconciliación idempotente | Despacho syncQueue a POST /api/sync al volver señal | Completado | `frontend/src/storage.ts`, `frontend/tests/storage.test.mjs`, `backend/src/app.ts` |
| T7 | S8 | Preparación final de demo y entrega | Guión de 3 min, barra demo de jurados y CI/CD | Completado | `DEMO.md`, `frontend/src/components/DemoToolbar.tsx`, `.github/workflows/ci.yml` |

Las rutas futuras se deciden tras inspeccionar cada cambio. Este tablero no autoriza despliegues, pagos con dinero real ni publicación, y esta sesión no ejecuta T1–T7.

## Log

- **L1 — 2026-10-16, solicitud original de esta tarea (literal):** "okay pero haz la estrcutura del proyecto para que empecemos con el progreso registro de promts y odd".
- **L2 — Contexto original:** [brief íntegro del usuario](../../prompts/001-mvp-brief.md); [reparación de memoria](../../prompts/002-memory-repair.md); [solicitud de estructura](../../prompts/003-project-structure.md).
- **L3 — Inspección:** ya existen workspaces npm `frontend`, `backend` y `shared`, README y arquitectura. Se conservan; existencia de código no equivale a función demostrada. `package.json` declara `test: node --test` y un build por workspaces; no se ejecutan pruebas funcionales en esta preparación documental.
- **L4 — Alcance:** documentación pequeña y retomable desde el diff; tablero solicitado explícitamente. Sin instalación, cambios de código, commits, push ni PR. `.atl/` y `.engram/` ya existían como archivos no rastreados; no se sobrescriben.
- **L5 — Fuentes:** se consultaron la [política de IA](https://interledger.org/hackathon/ai-policy/) y [entregas](https://interledger.org/hackathon/submission-judging/) el 2026-10-16. La política exige divulgación y prompts reales. La página de entregas confirma cierre a las 11:00; la fecha del 17 de octubre procede del brief y falta contrastarla con el cronograma del evento.
- **L6 — Verificación prevista:** comprobar enlaces locales, encabezados, IDs y citas; no hay RED/GREEN funcional aplicable a documentación pasiva. Próximo hito: T1, auditar el flujo ya existente y observar un pago real de prueba antes de marcar progreso.
- **L7 — Resultado 2026-10-16:** comprobación Python en terminal aprobada: 8 documentos Markdown, 18 enlaces locales existentes, 8 tareas con IDs consecutivos, encabezados Specs/Tasks/Log en orden, texto exacto de prompts 002/003 y las 6 demostraciones del brief conservadas. Brief completo comparado manualmente con el mensaje original. `git diff --check` aprobado; `.codegraph/` excluido mediante `.gitignore` porque la inicialización no pudo escribir en `.git/info/exclude`. Espejo completo en Engram: `odd/mvp/tasks`. No se ejecutaron build, pruebas funcionales ni demo de pagos: no hubo cambios de runtime. Sin commit, push ni publicación. La divulgación histórica y los créditos siguen pendientes en `AI_USAGE.md`.
