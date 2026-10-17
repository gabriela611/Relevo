import { useState } from 'react'
import {
  Copy,
  Globe,
  Trash2,
  Wallet,
  LogOut,
  Info,
  Check,
} from 'lucide-react'
import { saveMerchantProfile, type StoredMerchant } from '../storage'

interface ProfileViewProps {
  merchant: StoredMerchant
  onMerchantChange: (merchant: StoredMerchant) => void
  onLogout?: () => void
}

export function ProfileView({ merchant, onMerchantChange, onLogout }: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<StoredMerchant>(merchant)
  const [copied, setCopied] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleInputChange = (field: keyof StoredMerchant, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    saveMerchantProfile(editData)
    onMerchantChange(editData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData(merchant)
    setIsEditing(false)
  }

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleClearHistory = () => {
    try {
      localStorage.removeItem('relevo_device_sales')
      localStorage.removeItem('relevo_redeemed_receipts')
      setShowDeleteConfirm(false)
      window.location.reload()
    } catch (err) {
      console.error('Error clearing history:', err)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end gap-4">
        <div className="w-12 h-12 rounded-full bg-[#CFFA86] flex items-center justify-center text-sm font-semibold text-[#260F61]">
          {editData.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[#17151D] tracking-tight">
            {editData.name || 'Sin nombre'}
          </h1>
          <p className="text-xs text-[#6F6B76] mt-0.5">
            {editData.currency}
          </p>
        </div>
      </div>

      {/* Wallet Card */}
      <div className="p-4 rounded-lg bg-[#260F61] text-white shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#CFFA86]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#CFFA86]">
              Billetera
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(editData.walletAddress, 'wallet')}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            title="Copiar"
          >
            {copied === 'wallet' ? (
              <Check className="w-4 h-4 text-[#CFFA86]" />
            ) : (
              <Copy className="w-4 h-4 text-white/60" />
            )}
          </button>
        </div>
        <p className="text-sm font-mono break-all text-white/90 mb-2">
          {editData.walletAddress || '—'}
        </p>
        <div className="text-xs text-white/70">
          Formato ILP: <code className="text-[#CFFA86]">$provider/accounts/handle</code>
        </div>
      </div>

      {/* Edit Toggle */}
      {!isEditing && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="w-full h-10 rounded-lg bg-[#F9F8FC] border border-[#EAE8EF] text-[#5634A3] font-semibold text-sm hover:bg-[#F0FBD9] hover:border-[#D5F5A3] transition-all"
        >
          Editar perfil
        </button>
      )}

      {/* Edit Form */}
      {isEditing && (
        <div className="p-4 rounded-lg bg-[#F9F8FC] border border-[#EAE8EF] flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-[#17151D]">Editar</h3>

          <div className="flex flex-col gap-2">
            <label htmlFor="edit-name" className="text-xs font-semibold text-[#17151D] uppercase tracking-wider">
              Nombre
            </label>
            <input
              id="edit-name"
              type="text"
              value={editData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="h-10 px-3 rounded-lg border border-[#EAE8EF] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5634A3] focus:border-transparent transition-all"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="edit-currency" className="text-xs font-semibold text-[#17151D] uppercase tracking-wider">
              Moneda
            </label>
            <select
              id="edit-currency"
              value={editData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="h-10 px-3 rounded-lg border border-[#EAE8EF] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5634A3] focus:border-transparent transition-all"
            >
              <option value="COP">COP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="BRL">BRL</option>
              <option value="MXN">MXN</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="edit-wallet" className="text-xs font-semibold text-[#17151D] uppercase tracking-wider">
              Billetera
            </label>
            <input
              id="edit-wallet"
              type="url"
              value={editData.walletAddress}
              onChange={(e) => handleInputChange('walletAddress', e.target.value)}
              className="h-10 px-3 rounded-lg border border-[#EAE8EF] bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#5634A3] focus:border-transparent transition-all"
              placeholder="$provider.com/accounts/handle"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-[#EAE8EF]">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 h-9 rounded-lg border border-[#EAE8EF] bg-white text-[#17151D] font-semibold text-sm hover:bg-[#F9F8FC] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 h-9 rounded-lg bg-[#CFFA86] text-[#260F61] font-semibold text-sm hover:bg-[#B8EA63] active:scale-[0.98] transition-all"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Preferences & Actions */}
      <div className="space-y-3">
        {/* Open Payments Info */}
        <div className="p-3 rounded-lg bg-[#EDE9FF] border border-[#D9D0FF] flex gap-3">
          <Wallet className="w-4 h-4 text-[#5634A3] shrink-0 mt-0.5" />
          <div className="text-xs text-[#5634A3] leading-relaxed">
            <strong>Interledger:</strong> Tu billetera recibe pagos en cualquier moneda usando el protocolo abierto.
          </div>
        </div>

        {/* Security Info */}
        <div className="p-3 rounded-lg bg-[#F0FBD9] border border-[#D5F5A3] flex gap-3">
          <Info className="w-4 h-4 text-[#177454] shrink-0 mt-0.5" />
          <div className="text-xs text-[#177454] leading-relaxed">
            <strong>Privacidad:</strong> Tu perfil se guarda solo en tu dispositivo.
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-3 rounded-lg bg-[#FEF1F0] border border-[#FDD9D6] flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-[#8B3830] uppercase tracking-wider">
            Zona de riesgo
          </h4>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center justify-between p-2.5 rounded text-[#8B3830] text-sm font-semibold hover:bg-white/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>Borrar historial</span>
            </div>
            <span className="text-xs opacity-60">→</span>
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center justify-between p-2.5 rounded text-[#8B3830] text-sm font-semibold hover:bg-white/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </div>
              <span className="text-xs opacity-60">→</span>
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg p-5 max-w-sm w-full">
            <h3 className="text-base font-semibold text-[#8B3830] mb-2">
              ¿Borrar historial?
            </h3>
            <p className="text-sm text-[#6F6B76] mb-5">
              Se borrarán todos tus cobros y comprobantes verificados. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-10 rounded-lg border border-[#EAE8EF] bg-white text-[#17151D] font-semibold text-sm hover:bg-[#F9F8FC] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="flex-1 h-10 rounded-lg bg-[#E87C73] text-white font-semibold text-sm hover:bg-[#D86962] active:scale-[0.98] transition-all"
              >
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
