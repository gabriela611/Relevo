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
    walletAddress: '',
    currency: 'COP',
    assetScale: 0,
    language: 'es',
    theme: 'auto',
    createdAt: Date.now(),
  })

  const handleInputChange = (field: keyof StoredMerchant, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleStart = () => {
    setStep('setup')
  }

  const handleSetupComplete = () => {
    saveMerchantProfile(formData)
    onStart()
  }

  if (step === 'intro') {
    return (
      <div className="min-h-[100dvh] bg-[#260F61] text-white flex flex-col justify-between p-6 sm:p-8 relative overflow-hidden select-none">
        {/* Subtle geometric shapes background */}
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
        <div className="relative z-10 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="Relevo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-semibold tracking-tight">Relevo</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#CFFA86] flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>Pagos sin complicaciones</span>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10 my-auto py-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#CFFA86] mb-3 inline-block">
            Sin intermediarios · Offline
          </span>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1] text-white">
            Cobra en cualquier moneda.
          </h1>
          <p className="text-2xl sm:text-3xl font-semibold text-[#CFFA86] mt-2">
            Comprueba sin internet.
          </p>

          <p className="text-sm text-white/80 mt-5 max-w-xs leading-relaxed font-normal">
            Un QR para cobrar. Otro para saber que sí llegó. Tu negocio no se detiene cuando la señal se va.
          </p>
        </div>

        {/* CTA */}
        <div className="relative z-10 pb-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleStart}
            className="w-full h-14 rounded-full bg-white text-[#260F61] font-semibold text-base flex items-center justify-between pl-6 pr-2 hover:bg-white/95 active:scale-[0.98] transition-all shadow-lg group"
          >
            <span>Empezar</span>
            <div className="w-10 h-10 rounded-full bg-[#260F61] text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
              <ArrowRight className="w-5 h-5" />
            </div>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-white/70 pt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#CFFA86]" />
            <span>Tus fondos permanecen en tu billetera. No custodiamos dinero.</span>
          </div>
        </div>
      </div>
    )
  }

  // Setup step: clean and simple form
  return (
    <div className="min-h-[100dvh] bg-white flex flex-col p-6 sm:p-8">
      {/* Header */}
      <div className="pb-6 border-b border-[#EAE8EF]">
        <div className="flex items-center gap-2.5 mb-4">
          <img src="/favicon.svg" alt="Relevo" className="w-6 h-6" />
          <span className="text-base font-semibold text-[#17151D]">Relevo</span>
        </div>
        <div className="text-xs text-[#6F6B76] font-medium">Paso 1 de 1</div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full gap-5 py-8">
        <div>
          <h2 className="text-2xl font-semibold text-[#17151D] tracking-tight">
            Configura tu perfil
          </h2>
          <p className="text-sm text-[#6F6B76] mt-2">
            Estos datos se guardan en tu dispositivo. Puedes cambiarlos cuando quieras.
          </p>
        </div>

        {/* Business Name */}
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-xs font-semibold text-[#17151D] uppercase tracking-wider">
            Nombre de tu negocio
          </label>
          <input
            id="name"
            type="text"
            placeholder="Doña Arepas"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="h-11 px-4 rounded-lg border border-[#EAE8EF] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5634A3] focus:border-transparent transition-all"
          />
        </div>

        {/* Currency */}
        <div className="flex flex-col gap-2">
          <label htmlFor="currency" className="text-xs font-semibold text-[#17151D] uppercase tracking-wider">
            Moneda que cobras
          </label>
          <select
            id="currency"
            value={formData.currency}
            onChange={(e) => handleInputChange('currency', e.target.value)}
            className="h-11 px-4 rounded-lg border border-[#EAE8EF] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5634A3] focus:border-transparent transition-all"
          >
            <option value="COP">COP — Peso Colombiano</option>
            <option value="USD">USD — Dólar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="BRL">BRL — Real</option>
            <option value="MXN">MXN — Peso Mexicano</option>
          </select>
        </div>

        {/* Wallet */}
        <div className="flex flex-col gap-2">
          <label htmlFor="wallet" className="text-xs font-semibold text-[#17151D] uppercase tracking-wider">
            Tu billetera Interledger
          </label>
          <input
            id="wallet"
            type="url"
            placeholder="$api.example.com/accounts/handle"
            value={formData.walletAddress}
            onChange={(e) => handleInputChange('walletAddress', e.target.value)}
            className="h-11 px-4 rounded-lg border border-[#EAE8EF] bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#5634A3] focus:border-transparent transition-all"
          />
          <p className="text-xs text-[#6F6B76] mt-1">
            Formato: <code className="bg-[#F9F8FC] px-2 py-0.5 rounded text-[#5634A3]">$dominio.com/accounts/handle</code>
          </p>
        </div>

        {/* Security Info */}
        <div className="p-3 rounded-lg bg-[#F0FBD9] border border-[#D5F5A3] flex gap-3 mt-2">
          <ShieldCheck className="w-4 h-4 text-[#177454] shrink-0 mt-0.5" />
          <div className="text-xs text-[#177454] leading-relaxed">
            Datos guardados solo en tu dispositivo. Nunca se envían a nuestros servidores.
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t border-[#EAE8EF]">
        <button
          type="button"
          onClick={() => setStep('intro')}
          className="flex-1 h-11 px-4 rounded-lg border border-[#EAE8EF] bg-white text-[#17151D] font-semibold text-sm hover:bg-[#F9F8FC] transition-colors"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={handleSetupComplete}
          disabled={!formData.name || !formData.walletAddress}
          className="flex-1 h-11 px-4 rounded-lg bg-[#CFFA86] text-[#260F61] font-semibold text-sm hover:bg-[#B8EA63] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span>Continuar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
