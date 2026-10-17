import { useState, useEffect, useRef } from 'react'
import {
  Header,
  BottomNav,
  IconAction,
  WalletCard,
  TransactionRow,
  EmptyState,
  OfflineBanner,
} from './components'
import {
  CollectView,
  PayView,
  VerificationView,
  OnboardingView,
  ScannerModal,
  ProfileView,
} from './views'
import { resolveRoute, type Route } from './model'
import { es } from './copy'
import {
  QrCode,
  ArrowUpRight,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import {
  getMerchantProfile,
  getVerifiedTotalToday,
  listRedeemedReceipts,
  listSales,
  saveMerchantProfile,
} from './storage'
import './App.css'

export default function App() {
  const [route, setRoute] = useState<Route>(() => resolveRoute(window.location.hash))
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [targetSaleId, setTargetSaleId] = useState<string | undefined>(undefined)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [animateTotal, setAnimateTotal] = useState(false)
  const prevTotalRef = useRef(0)

  const [merchant, setMerchant] = useState(() => getMerchantProfile())
  const verifiedTotal = getVerifiedTotalToday()

  // Trigger animation when total changes
  useEffect(() => {
    if (verifiedTotal !== prevTotalRef.current) {
      setAnimateTotal(true)
      prevTotalRef.current = verifiedTotal
      const timer = setTimeout(() => setAnimateTotal(false), 600)
      return () => clearTimeout(timer)
    }
  }, [verifiedTotal])

  const recentReceipts = listRedeemedReceipts()
  const recentSales = listSales()

  useEffect(() => {
    const handleHash = () => setRoute(resolveRoute(window.location.hash))
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('hashchange', handleHash)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('hashchange', handleHash)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const navigateTo = (newRoute: Route) => {
    window.location.hash = newRoute
    setRoute(newRoute)
  }

  // Handle direct scan from center nav button or quick action
  const handleQuickScan = (payload: string) => {
    setScannerOpen(false)
    if (payload.startsWith('relevo:receipt:')) {
      navigateTo('verificar' as Route)
    } else if (payload.startsWith('relevo:sale:')) {
      navigateTo('pagar')
    } else {
      navigateTo('verificar' as Route)
    }
  }

  // If user is on bienvenida route
  if (route === 'bienvenida') {
    return <OnboardingView onStart={() => navigateTo('inicio')} />
  }

  return (
    <div className="app-container">
      <Header
        currentRoute={route}
        onRouteChange={navigateTo}
        isOnline={isOnline}
      />

        <main className="screen-enter flex-1 pb-24 px-5 pt-4">
        {/* VIEW 1: HOME */}
        {route === 'inicio' && (
          <div className="flex flex-col gap-6">
            {/* Welcome Greeting (Reference style: "Hi Archie, Welcome back!") */}
            <div className="flex items-center justify-between pt-1">
              <div>
                  <span className="text-xs font-semibold text-[#6F6B76] uppercase tracking-wider">
                  {es.home.eyebrow}
                </span>
                <h1 className="text-2xl font-black text-[#17151D] tracking-tight">
                  Hola, Marta
                </h1>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('bienvenida')}
                className="w-9 h-9 rounded-full bg-[#F2ECFF] text-[#5634A3] flex items-center justify-center font-bold text-xs hover:bg-[#DFD2FF] transition-colors"
                title="Ver Onboarding"
                aria-label="Ver Onboarding"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>

            {/* Horizontal Hero Cards (Inspired by middle phone in reference image) */}
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x">
              {/* Card 1: Verified Total Today (Lime / Forest Green) */}
              <div className="min-w-[270px] flex-1 p-5 rounded-[24px] bg-[#CFFA86] text-[#260F61] card-shadow relative overflow-hidden snap-start flex flex-col justify-between h-38">
                <div className="relative z-10 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-extrabold opacity-80">
                      {es.home.today}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#260F61] text-[#CFFA86]">
                      {merchant.currency}
                    </span>
                  </div>
                  <span className={`text-3xl font-black tracking-tight tabular-nums mt-2 transition-transform duration-300 ${
                    animateTotal ? 'animate-verified-pulse' : ''
                  }`}>
                    {verifiedTotal.toLocaleString('es-CO')} {merchant.currency}
                  </span>
                </div>

                <div className="relative z-10 text-xs font-medium text-[#260F61]/80 flex items-center justify-between pt-2 border-t border-[#260F61]/10">
                  <span>{es.home.noBalance}</span>
                </div>

                {/* Abstract shape */}
                <div
                  className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/25 pointer-events-none"
                  aria-hidden="true"
                />
              </div>

              {/* Card 2: Offline Readiness (Forest Green & Lime) */}
              <div className="min-w-[240px] p-5 rounded-[24px] bg-[#174F3A] text-white card-shadow relative overflow-hidden snap-start flex flex-col justify-between h-38">
                <div className="relative z-10 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-bold text-[#CFFA86]">
                    Cobrar sin señal
                    </span>
                    <ShieldCheck className="w-4 h-4 text-[#CFFA86]" />
                  </div>
                  <span className="text-base font-bold mt-2">
                    {isOnline ? 'Listo para cobrar' : 'Cobrando sin datos'}
                  </span>
                  <span className="text-xs text-white/70 mt-0.5 truncate">
                    {merchant.name}
                  </span>
                </div>

                <div className="relative z-10 text-xs text-white/80 flex items-center justify-between pt-2 border-t border-white/10">
                  <span>Listo para usar</span>
                  <span className="text-[#CFFA86] font-bold">Activo</span>
                </div>
              </div>
            </div>

            {/* Offline notification if applicable */}
            {!isOnline && (
              <OfflineBanner isOffline={!isOnline} isReady={true} />
            )}

            {/* Quick Actions (Circular buttons as in reference) */}
            <div>
                  <h2 className="text-xs font-bold text-[#6F6B76] uppercase tracking-wider mb-3">
                {es.home.quick}
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <IconAction
                  label={es.actions.collect}
                  variant="lime"
                  icon={<QrCode className="w-6 h-6" />}
                  onClick={() => navigateTo('cobrar')}
                />
                <IconAction
                  label={es.actions.pay}
                  variant="violet"
                  icon={<ArrowUpRight className="w-6 h-6" />}
                  onClick={() => navigateTo('pagar')}
                />
                <IconAction
                  label={es.actions.scan}
                  variant="lavender"
                  icon={<ScanLine className="w-6 h-6" />}
                  onClick={() => setScannerOpen(true)}
                />
              </div>
            </div>

            {/* Recent Transactions List (Reference style) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-[#17151D]">
                  {es.home.recent}
                </h2>
                {recentReceipts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigateTo('movimientos')}
                    className="text-xs font-semibold text-[#5634A3] hover:underline"
                  >
                    {es.actions.all}
                  </button>
                )}
              </div>

              {recentReceipts.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {recentReceipts.slice(0, 3).map((r) => (
                    <TransactionRow
                      key={r.receiptId}
                      id={r.receiptId}
                      title={`Venta #${r.saleId.slice(0, 8)}`}
                      date={new Date(r.issuedAt).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      formattedAmount={r.amountReceived.value}
                      currency={r.amountReceived.assetCode}
                      statusLabel="Verificado offline"
                      statusTone="success"
                      onClick={() => navigateTo('movimientos')}
                    />
                  ))}
                </div>
              ) : recentSales.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {recentSales.slice(0, 2).map((s) => (
                    <TransactionRow
                      key={s.saleId}
                      id={s.saleId}
                      title={`Cobro generado`}
                      date={new Date(s.createdAt).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      formattedAmount={s.amount}
                      currency={s.currency}
                      statusLabel="Esperando pago"
                      statusTone="warning"
                      onClick={() => navigateTo('cobrar')}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={es.home.activityTitle}
                  description={es.home.activityBody}
                  action={{
                    label: es.actions.collect,
                    onClick: () => navigateTo('cobrar'),
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: COBRAR */}
        {route === 'cobrar' && (
          <CollectView
            onBack={() => navigateTo('inicio')}
            onScanReceipt={(saleId) => {
              setTargetSaleId(saleId)
              navigateTo('verificar' as Route)
            }}
          />
        )}

        {/* VIEW 3: PAGAR */}
        {route === 'pagar' && (
          <PayView
            onBack={() => navigateTo('inicio')}
          />
        )}

        {/* VIEW 4: VERIFICAR COMPROBANTE OFFLINE */}
        {(route as string) === 'verificar' && (
          <VerificationView
            saleId={targetSaleId}
            onBack={() => navigateTo('inicio')}
            onNewSale={() => {
              setTargetSaleId(undefined)
              navigateTo('cobrar')
            }}
            onHome={() => {
              setTargetSaleId(undefined)
              navigateTo('inicio')
            }}
          />
        )}

        {/* VIEW 5: MOVIMIENTOS */}
        {route === 'movimientos' && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-bold text-[#17151D]">{es.activity.title}</h1>
              <p className="text-sm text-[#6F6B76] mt-1">{es.activity.subtitle}</p>
            </div>

            {recentReceipts.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {recentReceipts.map((r) => (
                  <TransactionRow
                    key={r.receiptId}
                    id={r.receiptId}
                    title={`Venta #${r.saleId.slice(0, 8)}`}
                    date={new Date(r.issuedAt).toLocaleString('es-CO')}
                    formattedAmount={r.amountReceived.value}
                    currency={r.amountReceived.assetCode}
                    statusLabel="Verificado offline"
                    statusTone="success"
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title={es.activity.empty}
                description={es.activity.body}
                action={{
                  label: es.actions.collect,
                  onClick: () => navigateTo('cobrar'),
                }}
              />
            )}
          </div>
        )}

        {/* VIEW 6: CUENTA & CONFIGURACIÓN */}
        {(route === 'cuenta' || route === 'configurar') && (
          <ProfileView
            merchant={merchant}
            onMerchantChange={setMerchant}
          />
        )}
      </main>

      {/* Global Bottom Navigation */}
      <BottomNav
        currentRoute={route}
        onRouteChange={(r) => {
          if (r === 'escanear') {
            setScannerOpen(true)
          } else {
            navigateTo(r)
          }
        }}
      />

      {/* Global Quick Scanner Modal */}
      <ScannerModal
        title="Escanear código"
        subtitle="Escanea un cobro o un comprobante"
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleQuickScan}
      />
    </div>
  )
}
