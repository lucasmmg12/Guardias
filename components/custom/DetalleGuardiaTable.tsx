'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { DetalleGuardia, LiquidacionGuardia, EstadoLiquidacion } from '@/lib/types'
import { InlineEditCell } from './InlineEditCell'
import { Save, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DetalleGuardiaTableProps {
  liquidacionId: string
  liquidacion: LiquidacionGuardia | null
  onEstadoChange?: (nuevoEstado: EstadoLiquidacion) => void
}

// Mapa de estados a etiquetas
const ESTADOS_LABEL: Record<EstadoLiquidacion, string> = {
  'borrador': 'Borrador',
  'procesando': 'Procesando',
  'pendiente_revision': 'Pendiente de Revisión',
  'revisado': 'Revisado',
  'listo_para_liquidar': 'Listo para Liquidar',
  'finalizada': 'Finalizada',
  'error': 'Error'
}

export function DetalleGuardiaTable({ liquidacionId, liquidacion, onEstadoChange }: DetalleGuardiaTableProps) {
  const [detalles, setDetalles] = useState<DetalleGuardia[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({})
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [obrasSociales, setObrasSociales] = useState<string[]>([])
  
  // Debounce timer para guardado automático
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingChangesRef = useRef<Map<string, Partial<DetalleGuardia>>>(new Map())
  const isUnmountingRef = useRef(false)

  // Cargar detalles desde la BD
  const cargarDetalles = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('detalle_guardia')
        .select('*')
        .eq('liquidacion_id', liquidacionId)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true })

      if (error) throw error
      setDetalles((data as DetalleGuardia[]) || [])
    } catch (error) {
      console.error('Error cargando detalles:', error)
    } finally {
      setLoading(false)
    }
  }, [liquidacionId])

  // Cargar obras sociales disponibles
  const cargarObrasSociales = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('valores_consultas_obra_social')
        .select('obra_social')
        .eq('tipo_consulta', 'CONSULTA GINECOLOGICA')

      if (error) throw error
      
      const obrasUnicas = Array.from(new Set((data || []).map((v: any) => v.obra_social).filter(Boolean)))
      setObrasSociales(obrasUnicas.sort())
    } catch (error) {
      console.error('Error cargando obras sociales:', error)
    }
  }, [])

  useEffect(() => {
    cargarDetalles()
    cargarObrasSociales()
  }, [cargarDetalles, cargarObrasSociales])

  // Guardar cambios pendientes
  const guardarCambios = useCallback(async (force = false) => {
    if (pendingChangesRef.current.size === 0) {
      setSaveStatus('idle')
      return
    }

    // Si no es forzado y hay un timer activo, cancelarlo
    if (!force && saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    setSaveStatus('saving')
    const cambios = Array.from(pendingChangesRef.current.entries())

    try {
      // Guardar todos los cambios en paralelo
      const promesas = cambios.map(async ([id, cambios]) => {
        const { error } = await supabase
          .from('detalle_guardia')
          // @ts-ignore
          .update({
            ...cambios,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)

        if (error) throw error
      })

      await Promise.all(promesas)

      // Limpiar cambios pendientes
      pendingChangesRef.current.clear()
      setSaveStatus('saved')
      setLastSaved(new Date())

      // Actualizar estado local
      await cargarDetalles()

      // Resetear estado después de 2 segundos
      setTimeout(() => {
        if (!isUnmountingRef.current) {
          setSaveStatus('idle')
        }
      }, 2000)
    } catch (error) {
      console.error('Error guardando cambios:', error)
      setSaveStatus('error')
      
      // Reintentar después de 3 segundos
      setTimeout(() => {
        if (!isUnmountingRef.current && pendingChangesRef.current.size > 0) {
          guardarCambios(true)
        }
      }, 3000)
    }
  }, [cargarDetalles])

  // Programar guardado automático con debounce
  const programarGuardado = useCallback((detalleId: string, cambios: Partial<DetalleGuardia>) => {
    // Agregar a cambios pendientes
    const cambiosExistentes = pendingChangesRef.current.get(detalleId) || {}
    pendingChangesRef.current.set(detalleId, { ...cambiosExistentes, ...cambios })

    // Cancelar timer anterior
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    // Programar nuevo guardado (500ms de debounce)
    saveTimerRef.current = setTimeout(() => {
      guardarCambios(true)
    }, 500)
  }, [guardarCambios])

  // Guardar antes de desmontar
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      // Guardar cambios pendientes antes de desmontar
      if (pendingChangesRef.current.size > 0) {
        guardarCambios(true)
      }
    }
  }, [guardarCambios])

  // Guardar antes de cerrar/recargar página
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingChangesRef.current.size > 0) {
        e.preventDefault()
        e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?'
        // Intentar guardar sincrónicamente (limitado por navegador)
        guardarCambios(true)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [guardarCambios])

  // Guardado periódico cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingChangesRef.current.size > 0) {
        guardarCambios(true)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [guardarCambios])

  const handleObraSocialUpdate = useCallback(async (detalleId: string, nuevaObraSocial: string | null) => {
    // Actualizar estado local inmediatamente
    setDetalles(prev => prev.map(d => 
      d.id === detalleId ? { ...d, obra_social: nuevaObraSocial } : d
    ))

    // Programar guardado automático
    programarGuardado(detalleId, { obra_social: nuevaObraSocial })
  }, [programarGuardado])

  const handleEstadoChange = useCallback(async (nuevoEstado: EstadoLiquidacion) => {
    if (!liquidacion) return

    try {
      const { error } = await supabase
        .from('liquidaciones_guardia')
        // @ts-ignore
        .update({ estado: nuevoEstado })
        .eq('id', liquidacion.id)

      if (error) throw error
      
      if (onEstadoChange) {
        onEstadoChange(nuevoEstado)
      }
    } catch (error) {
      console.error('Error actualizando estado:', error)
    }
  }, [liquidacion, onEstadoChange])

  const formatearMoneda = (valor: number | null): string => {
    if (!valor) return '$0.00'
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor)
  }

  const formatearFecha = (fecha: string | null): string => {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-AR')
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Clock className="h-8 w-8 mx-auto mb-4 animate-spin" />
        Cargando detalles...
      </div>
    )
  }

  if (detalles.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No hay detalles para mostrar
      </div>
    )
  }

  const filasSinObraSocial = detalles.filter(d => !d.obra_social || d.obra_social.trim() === '').length

  return (
    <div className="space-y-4">
      {/* Barra de estado y controles */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 border border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <>
                <Clock className="h-4 w-4 text-yellow-400 animate-spin" />
                <span className="text-sm text-yellow-400">Guardando...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400">
                  Guardado {lastSaved ? `a las ${lastSaved.toLocaleTimeString('es-AR')}` : ''}
                </span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-400">Error al guardar. Reintentando...</span>
              </>
            )}
            {saveStatus === 'idle' && pendingChangesRef.current.size > 0 && (
              <span className="text-sm text-gray-400">
                {pendingChangesRef.current.size} cambio(s) pendiente(s)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {liquidacion && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-300">Estado:</label>
              <select
                value={liquidacion.estado}
                onChange={(e) => handleEstadoChange(e.target.value as EstadoLiquidacion)}
                className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-green-400 focus:outline-none"
              >
                {Object.entries(ESTADOS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}
          
          {pendingChangesRef.current.size > 0 && (
            <Button
              onClick={() => guardarCambios(true)}
              size="sm"
              className="bg-green-600 hover:bg-green-500"
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar ahora
            </Button>
          )}
        </div>
      </div>

      {/* Alerta de filas sin obra social */}
      {filasSinObraSocial > 0 && (
        <div className="p-4 rounded-xl bg-yellow-500/20 border border-yellow-500/50">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold">
              {filasSinObraSocial} fila(s) sin obra social - Requiere revisión
            </span>
          </div>
        </div>
      )}

      {/* Tabla de detalles */}
      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-green-400 sticky left-0 bg-gray-800 z-10">Fecha</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-green-400">Hora</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-green-400">Médico</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-green-400">Paciente</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-green-400">Obra Social</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-green-400">Monto Facturado</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-green-400">Importe Calculado</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-green-400">Horario Formativo</th>
            </tr>
          </thead>
          <tbody>
            {detalles.map((detalle) => {
              const sinObraSocial = !detalle.obra_social || detalle.obra_social.trim() === ''
              
              return (
                <tr
                  key={detalle.id}
                  className={`border-b border-gray-800 hover:bg-gray-800/50 ${
                    sinObraSocial ? 'bg-yellow-500/10' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-gray-300 sticky left-0 bg-gray-900 z-10">
                    {formatearFecha(detalle.fecha)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {detalle.hora || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {detalle.medico_nombre || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {detalle.paciente || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <InlineEditCell
                      value={detalle.obra_social || ''}
                      onSave={(newValue) => handleObraSocialUpdate(detalle.id, typeof newValue === 'string' ? (newValue || null) : String(newValue) || null)}
                      className={sinObraSocial ? 'bg-yellow-500/20 border-yellow-500/50' : ''}
                      columnName="Obra Social"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300 text-right">
                    {formatearMoneda(detalle.monto_facturado)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300 text-right font-semibold">
                    {formatearMoneda(detalle.importe_calculado)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {detalle.es_horario_formativo ? (
                      <span className="text-yellow-400">Sí</span>
                    ) : (
                      <span className="text-gray-500">No</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

