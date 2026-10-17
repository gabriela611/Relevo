import { useState } from 'react'
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react'
import { saveMerchantProfile, type StoredMerchant } from '../storage'

interface OnboardingViewProps {
  onStart: () => void
}

export function OnboardingView({ onStart }: OnboardingViewProps) {
  const [step, setStep] = useState<'intro' | 'setup'>('intro')
  const [formData, setFormData] = useState<StoredMerchant>({
    name: '',
    currency: 'COP',
    language: 'es',
    createdAt: Date.now(),
  })

  const handleInputChange = (field: 'name' | 'currency' | 'language', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleStart = () => {
    setStep('setup')
  }

  const handleSetupComplete = () => {
    if (!formData.name.trim()) return
    saveMerchantProfile(formData)
    onStart()
  }

  if (step === 'intro') {
    return (
      <div className="min-h-[100dvh] bg-[#260F61] text-white flex flex-col justify-between p-6 sm:p-8 relative overflow-hidden select-none">
        {/* Subtle geometric shapes */}
        <div
          className="absolute -top-12 -left-12 w-64 h-64 rounded-[48px] border-[14px] border-[#CFFA86] rotate-12 opacity-95 pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-28 -right-16 w-56 h-56 rounded-[40px] bg-[#FFF7E8]/20 rotate-45 pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-40 -left-10 w-44 h-44 rounded-full bg-[#DFD2FF]/10 blur-xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Brand */}
        <div className="relative z-10 pt-4">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="Relevo" className="w-8 h-8 object-contain" />
            <span className="text-2xl font-semibold tracking-tight">Relevo</span>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10 my-auto py-12">
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.1] text-white">
            Cobra sin complicaciones.
          </h1>
          <p className="text-2xl font-semibold text-[#CFFA86] mt-3">
            Verifica sin internet.
          </p>

          <p className="text-base text-white/80 mt-6 max-w-sm leading-relaxed font-normal">
            Un QR para cobrar. Otro para saber que llegó. Eso es todo lo que necesitas.
          </p>
        </div>

        {/* CTA */}
        <div className="relative z-10 pb-4 flex flex-col gap-4">
          <button
            type="button"
            onClick={handleStart}
            className="w-full h-14 rounded-full bg-white text-[#260F61] font-semibold text-base flex items-center justify-between pl-6 pr-2 hover:bg-white/95 active:scale-[0.98] transition-all shadow-lg"
          >
            <span>Empezar</span>
            <div className="w-10 h-10 rounded-full bg-[#260F61] text-white flex items-center justify-center">
              <ArrowRight className="w-5 h-5" />
            </div>
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-white/70">
            <ShieldCheck className="w-4 h-4 text-[#CFFA86]" />
            <span>Tus fondos permanecen en tu billetera.</span>
          </div>
        </div>
      </div>
    )
  }

  // Setup: solo nombre y moneda, muy simple
  return (
    <div className="min-h-[100dvh] bg-white flex flex-col p-6 sm:p-8">
      {/* Header */}
      <div className="pb-6 border-b border-[#EAE8EF]">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="Relevo" className="w-6 h-6" />
          <span className="text-lg font-semibold text-[#17151D]">Relevo</span>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full gap-6 py-12">
        <div>
          <h2 className="text-3xl font-semibold text-[#17151D] tracking-tight">
            Bienvenido
          </h2>
          <p className="text-base text-[#6F6B76] mt-3">
            Cuéntanos tu nombre y qué moneda cobras.
          </p>
        </div>

        {/* Business Name */}
        <div className="flex flex-col gap-3">
          <label htmlFor="name" className="text-sm font-semibold text-[#17151D]">
            Nombre de tu negocio
          </label>
          <input
            id="name"
            type="text"
            autoFocus
            placeholder="Ej: Doña Arepas"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="h-12 px-4 rounded-lg border border-[#EAE8EF] bg-white text-base focus:outline-none focus:ring-2 focus:ring-[#CFFA86] focus:border-transparent transition-all"
          />
        </div>

        {/* Currency */}
        <div className="flex flex-col gap-3">
          <label htmlFor="currency" className="text-sm font-semibold text-[#17151D]">
            ¿En qué moneda cobras?
          </label>
          <select
            id="currency"
            value={formData.currency}
            onChange={(e) => handleInputChange('currency', e.target.value)}
            className="h-12 px-4 rounded-lg border border-[#EAE8EF] bg-white text-base focus:outline-none focus:ring-2 focus:ring-[#CFFA86] focus:border-transparent transition-all"
          >
            <option value="COP">COP — Pesos (Colombia)</option>
            <option value="USD">USD — Dólares</option>
            <option value="EUR">EUR — Euros</option>
            <option value="BRL">BRL — Reales (Brasil)</option>
            <option value="MXN">MXN — Pesos (México)</option>
          </select>
        </div>

        {/* Language */}
        <div className="flex flex-col gap-3">
          <label htmlFor="language" className="text-sm font-semibold text-[#17151D]">
            Idioma
          </label>
          <select
            id="language"
            value={formData.language || 'es'}
            onChange={(e) => handleInputChange('language', e.target.value as 'es' | 'en')}
            className="h-12 px-4 rounded-lg border border-[#EAE8EF] bg-white text-base focus:outline-none focus:ring-2 focus:ring-[#CFFA86] focus:border-transparent transition-all"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* Info */}
        <div className="p-4 rounded-lg bg-[#F0FBD9] border border-[#D5F5A3] flex gap-3 mt-2">
          <ShieldCheck className="w-5 h-5 text-[#177454] shrink-0 mt-0.5" />
          <div className="text-sm text-[#177454] leading-relaxed">
            Datos guardados solo en tu teléfono. Nada se envía a internet.
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t border-[#EAE8EF]">
        <button
          type="button"
          onClick={() => setStep('intro')}
          className="flex-1 h-12 px-4 rounded-lg border border-[#EAE8EF] bg-white text-[#17151D] font-semibold text-base hover:bg-[#F9F8FC] transition-colors"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={handleSetupComplete}
          disabled={!formData.name.trim()}
          className="flex-1 h-12 px-4 rounded-lg bg-[#CFFA86] text-[#260F61] font-semibold text-base hover:bg-[#B8EA63] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
