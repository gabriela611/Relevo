# Relevo — Perfil ultra-simple para personas mayores ✅

**Objetivo completado:** Registro y perfil rediseñados para máxima simplici dad — sin billetera manual, solo nombre/moneda/idioma. Apple Design limpio. Para usuarios no técnicos.

**Rama:** `feature/frontend-design-system` (rebased + simplificado)

## ✅ Implementado

### OnboardingView (2 pasos ultra-simple)
- **Paso 1:** Hero screen expresiva (marca + call-to-action)
- **Paso 2:** Form minimalista — nombre, moneda, idioma
  - Sin billetera (backend la maneja)
  - Fonts grandes (2xl título, base cuerpo)
  - Contraste alto
  - Copy en español, sin jerga

### ProfileView (Display + Edit limpio)
- **Display:** 3 tarjetas visuales
  - Nombre (fondo lima #CFFA86)
  - Moneda (fondo púrpura #260F61)
  - Idioma (fondo soft #F9F8FC)
- **Edit:** Inline, botones grandes, simple
  - Edit → edit mode
  - Cancel, Save visibles
  - Sin confirmaciones extra

### StoredMerchant simplificado
```ts
{
  name: string                    // Usuario ingresa
  currency: string                // Usuario elige
  language: 'es' | 'en'          // Usuario elige
  walletAddress?: string          // OPACO (backend)
  assetScale?: number             // OPACO (backend)
  createdAt?: number              // OPACO
}
```

### Design coherente
- ✅ Apple Design limpio (blanco/lima/púrpura)
- ✅ Sin gradientes complicados
- ✅ Shadows suaves (#EAE8EF borders)
- ✅ Tipografía accesible (títulos 2-3xl)
- ✅ Buttons 48-56px (acceso fácil)
- ✅ Inputs 44px+ (grandes)

## Verificación
- ✅ `npm run typecheck` — 0 errores
- ✅ Build limpio (Vite)
- ✅ Commit con AI_USAGE.md registrado
- ✅ Storage compila

## Next
- QA: probar flujo completo (inicio → onboarding → home → perfil)
- Backend: asegurar wallet-address auto-configurada
- Frontend: integración con API de cobros (Cobrar view)
