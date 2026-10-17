# Prompt 017 — Tareas de Persona 3 (Core, Seguridad, IndexedDB & DevOps)

**Fecha:** 2026-10-17  
**Herramienta:** Antigravity (Gemini 3.8 Flash)  
**Entrada:**

```markdown
okay frontend and backend should be done, lets start with person 3 tasks
```

## Alcance ejecutado
1. **Suite Criptográfica y Anti-Fraude (`shared/test/anti-fraud.test.ts`):** 11 tests automatizados que cubren alteración de 1 centavo, swaps de moneda, trucos de escala, replay attack (doble gasto), ventas cruzadas, firmas con llaves ajenas y tolerancia a QRs corruptos.
2. **Motor de Persistencia IndexedDB y Cola de Sincronización (`frontend/src/storage.ts` y `frontend/tests/storage.test.mjs`):** Almacén asíncrono IndexedDB con retrocompatibilidad síncrona en cliente, `syncQueue` para despacho en lote a `POST /api/sync` y listener automático al recuperar internet (`window.addEventListener('online')`).
3. **Barra de Simulación y Demo para Jurados (`frontend/src/components/DemoToolbar.tsx`):** Inyector flotante de 1-clic para simular pagos legítimos, fraude con alteración de importe, replay attack, modo avión simulado y reset de datos.
4. **DevOps & CI/CD (`.github/workflows/ci.yml` y `scripts/tunnel.ps1`):** Pipeline automatizado de GitHub Actions con Node 24 para build, typecheck y tests de los 3 workspaces; script PowerShell para túneles rápidos Cloudflare sobre Vite.
5. **Guión Oficial de Demo y Pitch (`DEMO.md`):** Protocolo cronometrado de 3 minutos para los jurados con narrativa de Doña Elena, checklist de dispositivos en modo avión y preguntas frecuentes del jurado.
