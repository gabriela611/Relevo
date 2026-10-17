# Progreso de RELEVO

El [tablero del MVP](tasks/mvp.md) es la fuente de progreso: especificaciones, tareas, evidencia y log. El [brief original](../prompts/001-mvp-brief.md) conserva lo pedido sin reinterpretarlo.

## Estructura que conservamos

| Ruta | Responsabilidad |
| --- | --- |
| `frontend/` | Interfaz React y experiencia del vendedor/comprador |
| `backend/` | API, integración Open Payments, firma y persistencia del servidor |
| `shared/` | Tipos y utilidades compartidas |
| `odd/tasks/mvp.md` | Tablero general de progreso del MVP (T0–T7) |
| `odd/tasks/frontend-design-system.md` | Sistema de diseño frontend y UX mobile-first (T1–T3) |
| `prompts/` | Solicitudes reales a las herramientas de IA |
| `AI_USAGE.md` | Herramientas usadas, alcance y procedencia pendiente |


## Ciclo de trabajo

1. Leer la tarea y sus `S#`; inspeccionar el código existente antes de cambiarlo.
2. Registrar el prompt real. Si cambia el alcance, añadir el pedido literal al log y actualizar solo las especificaciones afectadas.
3. Implementar la unidad autorizada. Para comportamiento con prueba determinista aplicable, observar fallo antes del arreglo y éxito después; para documentación, hacer lectura y comprobación estructural.
4. Registrar comando, resultado, limitaciones y commit si lo hay. Marcar completado solo con evidencia; sincronizar el documento completo con Engram en `odd/mvp/tasks`.

Estados: **Pendiente**, **En curso**, **Bloqueado** (con motivo), **Completado** (con evidencia). Son estados del trabajo, no estados de pagos.

## Orden de avance

Pago real entre test wallets → quote multidivisa si es compatible → cobro offline → recibo firmado → verificación offline → reconciliación. Preparar la entrega después de demostrar esos resultados.

La existencia de una función, un mock, una captura o una prueba vacía no demuestra un pago. No marcar el MVP como terminado por haber preparado este seguimiento. El siguiente trabajo es **T1**.
