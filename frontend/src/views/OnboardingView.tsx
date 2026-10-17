import { ArrowRight, ShieldCheck, Zap } from 'lucide-react'

interface OnboardingViewProps {
  onStart: () => void
}

export function OnboardingView({ onStart }: OnboardingViewProps) {
  return (
    <div className="min-h-[100dvh] bg-[#260F61] text-white flex flex-col justify-between p-6 sm:p-8 relative overflow-hidden select-none">
      {/* Abstract geometric shapes inspired by the reference image */}
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

      {/* Brand Wordmark & Tagline */}
      <div className="relative z-10 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="Relevo" className="w-8 h-8 object-contain" />
          <span className="text-xl font-extrabold tracking-tight">Relevo</span>
        </div>
        <div className="px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#CFFA86] flex items-center gap-1">
          <Zap className="w-3 h-3" />
           <span>Pagos sencillos</span>
        </div>
      </div>

      {/* Hero Copy (Editorial, inspired by reference) */}
      <div className="relative z-10 my-auto py-12">
        <span className="text-xs font-black uppercase tracking-widest text-[#CFFA86] mb-3 inline-block">
          Sin intermediarios · Modo Offline
        </span>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.1] text-white">
          Cobra en cualquier moneda.
        </h1>
        <p className="text-3xl sm:text-4xl font-extrabold text-[#CFFA86] mt-1.5">
          Comprueba sin internet.
        </p>

        <p className="text-sm text-white/80 mt-5 max-w-xs leading-relaxed font-normal">
          Un QR para cobrar. Otro para saber que sí llegó. Tu negocio no se detiene cuando la señal se va.
        </p>
      </div>

      {/* Action Button: Pill with Arrow circle (as in reference) */}
      <div className="relative z-10 pb-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={onStart}
          className="w-full h-15 rounded-full bg-white text-[#260F61] font-bold text-base flex items-center justify-between pl-8 pr-2 hover:bg-[#F0FBD9] active:scale-[0.98] transition-all shadow-xl group"
        >
          <span className="text-lg tracking-tight">Empezar</span>
          <div className="w-11 h-11 rounded-full bg-[#260F61] text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
            <ArrowRight className="w-5 h-5" />
          </div>
        </button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-white/60 pt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#CFFA86]" />
          <span>Tus fondos permanecen en tu billetera. No custodiamos dinero.</span>
        </div>
      </div>
    </div>
  )
}
