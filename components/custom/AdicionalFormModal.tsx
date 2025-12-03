'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const ESPECIALIDADES = [
  'Pediatría',
  'Ginecología',
  'Obstetricia',
  'Cirugía',
  'Clínica'
]

interface AdicionalFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    obra_social: string
    especialidad: string
    monto_base_adicional: number
    porcentaje_pago_medico: number
  }) => Promise<void>
}

export function AdicionalFormModal({ isOpen, onClose, onSave }: AdicionalFormModalProps) {
  const [obraSocial, setObraSocial] = useState('')
  const [especialidad, setEspecialidad] = useState('Pediatría')
  const [montoBase, setMontoBase] = useState('')
  const [porcentaje, setPorcentaje] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [obrasSociales, setObrasSociales] = useState<string[]>([])
  const [loadingObras, setLoadingObras] = useState(false)

  // Cargar obras sociales disponibles desde la base de datos
  useEffect(() => {
    const cargarObrasSociales = async () => {
      try {
        setLoadingObras(true)
        const { data, error } = await supabase
          .from('valores_consultas_obra_social')
          .select('obra_social')
          .order('obra_social', { ascending: true })

        if (error) throw error

        // Obtener obras sociales únicas y ordenadas
        const obrasUnicas = Array.from(
          new Set((data || []).map((v: any) => v.obra_social).filter(Boolean))
        ).sort() as string[]
        
        setObrasSociales(obrasUnicas)
      } catch (error) {
        console.error('Error cargando obras sociales:', error)
        setErrors(prev => ({
          ...prev,
          obraSocial: 'Error al cargar obras sociales'
        }))
      } finally {
        setLoadingObras(false)
      }
    }

    if (isOpen) {
      cargarObrasSociales()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      // Resetear formulario cuando se abre
      setObraSocial('')
      setEspecialidad('Pediatría')
      setMontoBase('')
      setPorcentaje('')
      setErrors({})
    }
  }, [isOpen])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!obraSocial.trim()) {
      newErrors.obraSocial = 'La obra social es requerida'
    }

    if (!especialidad) {
      newErrors.especialidad = 'La especialidad es requerida'
    }

    const montoBaseNum = parseFloat(montoBase)
    if (!montoBase || isNaN(montoBaseNum) || montoBaseNum <= 0) {
      newErrors.montoBase = 'El monto base debe ser un número mayor a 0'
    }

    const porcentajeNum = parseFloat(porcentaje)
    if (!porcentaje || isNaN(porcentajeNum) || porcentajeNum < 0 || porcentajeNum > 100) {
      newErrors.porcentaje = 'El porcentaje debe estar entre 0 y 100'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setLoading(true)
    setErrors({}) // Limpiar errores previos
    try {
      await onSave({
        obra_social: obraSocial.trim(),
        especialidad,
        monto_base_adicional: parseFloat(montoBase),
        porcentaje_pago_medico: parseFloat(porcentaje)
      })
      onClose()
    } catch (error) {
      console.error('Error guardando adicional:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setErrors({
        general: `Error al guardar: ${errorMessage}`
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-green-500/30"
        style={{
          background: 'rgba(17, 24, 39, 0.95)',
          backdropFilter: 'blur(20px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-green-400">Agregar Adicional</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{errors.general}</p>
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Obra Social <span className="text-red-400">*</span>
            </label>
            {loadingObras ? (
              <div className="bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-2 text-gray-500">
                Cargando obras sociales...
              </div>
            ) : (
              <select
                value={obraSocial}
                onChange={(e) => setObraSocial(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || loadingObras}
              >
                <option value="">Seleccione una obra social</option>
                {obrasSociales.map((obra) => (
                  <option key={obra} value={obra} className="bg-gray-800">
                    {obra}
                  </option>
                ))}
              </select>
            )}
            {errors.obraSocial && (
              <p className="text-red-400 text-xs mt-1">{errors.obraSocial}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Especialidad <span className="text-red-400">*</span>
            </label>
            <select
              value={especialidad}
              onChange={(e) => setEspecialidad(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={loading}
            >
              {ESPECIALIDADES.map(esp => (
                <option key={esp} value={esp}>{esp}</option>
              ))}
            </select>
            {errors.especialidad && (
              <p className="text-red-400 text-xs mt-1">{errors.especialidad}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Monto Base del Adicional <span className="text-red-400">*</span>
            </label>
            <Input
              type="number"
              value={montoBase}
              onChange={(e) => setMontoBase(e.target.value)}
              placeholder="Ej: 10000"
              step="0.01"
              min="0"
              className="bg-gray-800/50 border-gray-600 text-white"
              disabled={loading}
            />
            {errors.montoBase && (
              <p className="text-red-400 text-xs mt-1">{errors.montoBase}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Porcentaje que se paga al médico <span className="text-red-400">*</span>
            </label>
            <Input
              type="number"
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
              placeholder="Ej: 50 (para 50%)"
              step="0.1"
              min="0"
              max="100"
              className="bg-gray-800/50 border-gray-600 text-white"
              disabled={loading}
            />
            {errors.porcentaje && (
              <p className="text-red-400 text-xs mt-1">{errors.porcentaje}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Monto que recibe el médico: ${montoBase && porcentaje ? (parseFloat(montoBase) * (parseFloat(porcentaje) / 100)).toFixed(2) : '0.00'}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

