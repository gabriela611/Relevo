import { useState } from 'react'
import { ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react'
import { saveMerchantProfile, type StoredMerchant } from '../storage'
import { es, en } from '../copy'

interface OnboardingViewProps {
  onStart: () => void
}

export function OnboardingView({ onStart }: OnboardingViewProps) {
  const [step, setStep] = useState<'intro' | 'setup'>('intro')
  const [language, setLanguage] = useState<'es' | 'en'>('es')
  const [formData, setFormData] = useState<StoredMerchant>(() => ({
    name: '',
    currency: 'COP',
    language: 'es',
    createdAt: Date.now(),
  }))

  const t = language === 'en' ? en : es

  const handleInputChange = (field: 'name' | 'currency' | 'language', value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (field === 'language') {
      setLanguage(value as 'es' | 'en')
    }
  }

  const handleSetupComplete = () => {
    if (!formData.name.trim()) return
    saveMerchantProfile(formData)
    onStart()
  }

  if (step === 'intro') {
    return (
      <div className="min-h-[100dvh] bg-[#260F61] text-white flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden select-none screen-enter">
        {/* Abstract geometric shapes (Apple / Brand Design) */}
        <div
          className="absolute -top-12 -left-12 w-64 h-64 rounded-[48px] border-[14px] border-[#CFFA86] rotate-12 opacity-90 pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-28 -right-16 w-56 h-56 rounded-[40px] bg-[#FFF7E8]/15 rotate-45 pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-40 -left-10 w-48 h-48 rounded-full bg-[#DFD2FF]/10 blur-2xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Brand Wordmark & Tagline */}
        <div className="relative z-10 pt-4 flex items-center justify-between max-w-xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="Relevo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-extrabold tracking-tight">Relevo</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#CFFA86]">
            {t.onboarding.tagline || 'Pagos directos'}
          </span>
        </div>

        {/* Hero Editorial Copy */}
        <div className="relative z-10 my-auto py-8 max-w-xl mx-auto w-full">
          <span className="text-xs font-black uppercase tracking-widest text-[#CFFA86] mb-3 inline-block">
            Modo 100% Offline · Cero Comisiones
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.1] text-white">
            Cobra en cualquier moneda.
          </h1>
          <p className="text-3xl sm:text-4xl font-extrabold text-[#CFFA86] mt-2">
            Comprueba sin internet.
          </p>
          <p className="text-sm sm:text-base text-white/80 mt-5 leading-relaxed font-normal max-w-md">
            Un QR para cobrar. Otro para saber que sí llegó. Tu negocio nunca se detiene cuando la señal se va.
          </p>
        </div>

        {/* Bottom CTA */}
        <div className="relative z-10 pb-4 flex flex-col gap-3.5 max-w-xl mx-auto w-full">
          <button
            type="button"
            onClick={() => setStep('setup')}
            className="w-full h-14 sm:h-16 rounded-full bg-white text-[#260F61] font-bold text-base sm:text-lg flex items-center justify-between pl-8 pr-2 hover:bg-[#F0FBD9] active:scale-[0.98] transition-all shadow-xl group btn-press cursor-pointer"
          >
            <span>{t.actions.start}</span>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#260F61] text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
              <ArrowRight className="w-5 h-5" />
            </div>
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-white/70 pt-1">
            <ShieldCheck className="w-4 h-4 text-[#CFFA86] shrink-0" />
            <span>{t.onboarding.security}</span>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Minimalist, accessible setup form
  return (
    <div className="min-h-[100dvh] bg-[#F9F8FC] flex flex-col justify-between p-6 sm:p-10 screen-enter">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center gap-6">
        <div>
          <button
            type="button"
            onClick={() => setStep('intro')}
            className="p-2 -ml-2 rounded-full hover:bg-[#F2ECFF] text-[#17151D] transition-colors inline-flex items-center gap-1.5 text-xs font-semibold mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
          <h2 className="text-2xl sm:text-3xl font-black text-[#17151D] tracking-tight">
            {t.onboarding.register}
          </h2>
          <p className="text-sm text-[#6F6B76] mt-1.5">
            {t.onboarding.setupHint}
          </p>
        </div>

        {/* Business Name Field */}
        <div className="flex flex-col gap-2">
          <label htmlFor="merchant-name" className="text-xs font-bold uppercase tracking-wider text-[#6F6B76]">
            {t.onboarding.name}
          </label>
          <input
            id="merchant-name"
            type="text"
            autoFocus
            placeholder={t.onboarding.namePlaceholder}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="h-12 px-4 rounded-2xl border border-[#EAE8EF] bg-white text-sm font-semibold text-[#17151D] focus:outline-none focus:ring-2 focus:ring-[#5634A3] focus:border-transparent transition-all shadow-sm"
          />
        </div>

        {/* Currency Select */}
        <div className="flex flex-col gap-2">
          <label htmlFor="merchant-currency" className="text-xs font-bold uppercase tracking-wider text-[#6F6B76]">
            {t.onboarding.currency}
          </label>
          <select
            id="merchant-currency"
            value={formData.currency}
            onChange={(e) => handleInputChange('currency', e.target.value)}
            className="h-12 px-4 rounded-2xl border border-[#EAE8EF] bg-white text-sm font-semibold text-[#17151D] focus:outline-none focus:ring-2 focus:ring-[#5634A3] focus:border-transparent transition-all shadow-sm"
          >
            <option value="COP">COP — {t.onboarding.currencyCOP}</option>
            <option value="USD">USD — {t.onboarding.currencyUSD}</option>
            <option value="EUR">EUR — {t.onboarding.currencyEUR}</option>
            <option value="BRL">BRL — {t.onboarding.currencyBRL}</option>
            <option value="MXN">MXN — {t.onboarding.currencyMXN}</option>
          </select>
        </div>

        {/* Language Select */}
        <div className="flex flex-col gap-2">
          <label htmlFor="merchant-language" className="text-xs font-bold uppercase tracking-wider text-[#6F6B76]">
            {t.onboarding.language}
          </label>
          <select
            id="merchant-language"
            value={language}
            onChange={(e) => handleInputChange('language', e.target.value)}
            className="h-12 px-4 rounded-2xl border border-[#EAE8EF] bg-white text-sm font-semibold text-[#17151D] focus:outline-none focus:ring-2 focus:ring-[#5634A3] focus:border-transparent transition-all shadow-sm"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* Privacy Note */}
        <div className="p-4 rounded-2xl bg-[#F0FBD9] border border-[#D5F5A3] flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#177454] shrink-0 mt-0.5" />
          <p className="text-xs text-[#177454] leading-relaxed font-medium">
            {t.onboarding.privacyHint}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="max-w-md mx-auto w-full pt-6 flex gap-3">
        <button
          type="button"
          onClick={() => setStep('intro')}
          className="flex-1 h-12 rounded-full border border-[#EAE8EF] bg-white text-sm font-bold text-[#17151D] hover:bg-[#F2ECFF] active:scale-95 transition-all btn-press"
        >
          {t.actions.back}
        </button>
        <button
          type="button"
          onClick={handleSetupComplete}
          disabled={!formData.name.trim()}
          className="flex-1 h-12 rounded-full bg-[#260F61] text-white text-sm font-bold hover:bg-[#34177F] active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed btn-press"
        >
          {t.actions.continue}
        </button>
      </div>
    </div>
  )
}
