'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

interface ObraSocialFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (nombre: string) => Promise<void>
  mes: number
  anio: number
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function ObraSocialFormModal({
  isOpen,
  onClose,
  onSave,
  mes,
  anio
}: ObraSocialFormModalProps) {
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setNombre('')
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nombre.trim()) {
      setError('El nombre de la obra social es requerido')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onSave(nombre.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la obra social')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.8)' }}
      onClick={onClose}
    >
      <div 
        className="relative rounded-2xl p-8 max-w-md w-full"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-green-400 mb-2">
            Crear Nueva Obra Social
          </h2>
          <p className="text-sm text-gray-400">
            Se agregará para <span className="text-green-400 font-semibold">{MESES[mes - 1]} {anio}</span>
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre de la Obra Social
            </label>
            <Input
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                setError(null)
              }}
              placeholder="Ej: 001 - PROVINCIA"
              className="bg-gray-800 border-green-500/50 text-white placeholder:text-gray-500 focus:border-green-400 focus:ring-green-400/50"
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Ingrese el código y nombre (ej: "001 - PROVINCIA", "004 - DAMSU")
            </p>
          </div>

          {error && (
            <div 
              className="p-3 rounded-lg text-sm"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !nombre.trim()}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </div>
              ) : (
                'Crear Obra Social'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

