'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface MesSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (mes: number, anio: number) => void
  mesDetectado: number | null
  anioDetectado: number | null
  mesActual: number
  anioActual: number
}

const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

export function MesSelectorModal({
  isOpen,
  onClose,
  onConfirm,
  mesDetectado,
  anioDetectado,
  mesActual,
  anioActual
}: MesSelectorModalProps) {
  const [mes, setMes] = useState(mesDetectado || mesActual)
  const [anio, setAnio] = useState(anioDetectado || anioActual)

  useEffect(() => {
    if (isOpen) {
      setMes(mesDetectado || mesActual)
      setAnio(anioDetectado || anioActual)
    }
  }, [isOpen, mesDetectado, anioDetectado, mesActual, anioActual])

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(mes, anio)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative z-10 w-full max-w-md mx-4 rounded-2xl p-6"
        style={{
          background: 'rgba(17, 24, 39, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.3)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-green-400">
            Seleccionar Período
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="space-y-6">
          {/* Detección automática */}
          {mesDetectado && anioDetectado && (
            <div 
              className="p-4 rounded-lg"
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}
            >
              <p className="text-sm text-green-400 mb-2">
                ✓ Mes detectado automáticamente
              </p>
              <p className="text-sm text-gray-300">
                {MESES[mesDetectado - 1].label} {anioDetectado}
              </p>
            </div>
          )}

          {/* Selector de Mes */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Mes
            </label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-800 border border-green-500/50 rounded-lg text-white focus:border-green-400 focus:outline-none"
            >
              {MESES.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Año */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Año
            </label>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              min={2020}
              max={2100}
              className="w-full px-4 py-2 bg-gray-800 border border-green-500/50 rounded-lg text-white focus:border-green-400 focus:outline-none"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white"
            >
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

