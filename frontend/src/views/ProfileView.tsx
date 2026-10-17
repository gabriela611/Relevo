import { useState } from 'react'
import { Edit2, Save, X } from 'lucide-react'
import { saveMerchantProfile, type StoredMerchant } from '../storage'

interface ProfileViewProps {
  merchant: StoredMerchant
  onMerchantChange: (merchant: StoredMerchant) => void
}

export function ProfileView({ merchant, onMerchantChange }: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<StoredMerchant>(merchant)

  const handleSave = () => {
    if (!editData.name.trim()) return
    saveMerchantProfile(editData)
    onMerchantChange(editData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData(merchant)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-6">
        {/* Display Mode */}
        <div className="space-y-4">
          {/* Name Card */}
          <div className="p-5 rounded-lg bg-[#CFFA86] text-[#260F61]">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#260F61]/70 mb-1">
              Tu negocio
            </div>
            <div className="text-2xl font-semibold">
              {merchant.name || '—'}
            </div>
          </div>

          {/* Currency Card */}
          <div className="p-5 rounded-lg bg-[#260F61] text-white">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#CFFA86] mb-1">
              Moneda
            </div>
            <div className="text-2xl font-semibold">
              {merchant.currency}
            </div>
          </div>

          {/* Language Card */}
          <div className="p-5 rounded-lg bg-[#F9F8FC] border border-[#EAE8EF]">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6F6B76] mb-1">
              Idioma
            </div>
            <div className="text-lg font-semibold text-[#17151D]">
              {merchant.language === 'en' ? 'English' : 'Español'}
            </div>
          </div>
        </div>

        {/* Edit Button */}
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="h-12 rounded-lg bg-[#F9F8FC] border border-[#EAE8EF] text-[#5634A3] font-semibold text-base hover:bg-[#F0FBD9] hover:border-[#D5F5A3] transition-all flex items-center justify-center gap-2"
        >
          <Edit2 className="w-5 h-5" />
          Editar
        </button>

        {/* Info */}
        <div className="p-4 rounded-lg bg-[#F0FBD9] border border-[#D5F5A3] flex gap-3">
          <div className="w-5 h-5 rounded-full bg-[#177454] text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
            ✓
          </div>
          <div className="text-sm text-[#177454] leading-relaxed">
            Tu información se guarda solo en tu teléfono. Nada se envía a internet.
          </div>
        </div>
      </div>
    )
  }

  // Edit Mode
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold text-[#17151D]">Editar perfil</h2>

      {/* Name Input */}
      <div className="flex flex-col gap-2">
        <label htmlFor="edit-name" className="text-sm font-semibold text-[#17151D]">
          Nombre del negocio
        </label>
        <input
          id="edit-name"
          type="text"
          value={editData.name}
          onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
          className="h-11 px-4 rounded-lg border border-[#EAE8EF] bg-white text-base focus:outline-none focus:ring-2 focus:ring-[#CFFA86] focus:border-transparent transition-all"
        />
      </div>

      {/* Currency Select */}
      <div className="flex flex-col gap-2">
        <label htmlFor="edit-currency" className="text-sm font-semibold text-[#17151D]">
          Moneda
        </label>
        <select
          id="edit-currency"
          value={editData.currency}
          onChange={(e) => setEditData(prev => ({ ...prev, currency: e.target.value }))}
          className="h-11 px-4 rounded-lg border border-[#EAE8EF] bg-white text-base focus:outline-none focus:ring-2 focus:ring-[#CFFA86] focus:border-transparent transition-all"
        >
          <option value="COP">COP — Pesos</option>
          <option value="USD">USD — Dólares</option>
          <option value="EUR">EUR — Euros</option>
          <option value="BRL">BRL — Reales</option>
          <option value="MXN">MXN — Pesos</option>
        </select>
      </div>

      {/* Language Select */}
      <div className="flex flex-col gap-2">
        <label htmlFor="edit-language" className="text-sm font-semibold text-[#17151D]">
          Idioma
        </label>
        <select
          id="edit-language"
          value={editData.language || 'es'}
          onChange={(e) => setEditData(prev => ({ ...prev, language: e.target.value as 'es' | 'en' }))}
          className="h-11 px-4 rounded-lg border border-[#EAE8EF] bg-white text-base focus:outline-none focus:ring-2 focus:ring-[#CFFA86] focus:border-transparent transition-all"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4 border-t border-[#EAE8EF]">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 h-11 rounded-lg border border-[#EAE8EF] bg-white text-[#17151D] font-semibold text-base hover:bg-[#F9F8FC] transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-5 h-5" />
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!editData.name.trim()}
          className="flex-1 h-11 rounded-lg bg-[#CFFA86] text-[#260F61] font-semibold text-base hover:bg-[#B8EA63] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          Guardar
        </button>
      </div>
    </div>
  )
}
