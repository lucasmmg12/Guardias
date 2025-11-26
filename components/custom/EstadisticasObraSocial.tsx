'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { BarChart3, TrendingUp, Users } from 'lucide-react'

interface EstadisticaObraSocial {
  obra_social: string
  cantidad_consultas: number
  porcentaje_del_total?: number
}

interface EstadisticasObraSocialProps {
  mes: number
  anio: number
  especialidad: string
}

export function EstadisticasObraSocial({ mes, anio, especialidad }: EstadisticasObraSocialProps) {
  const [estadisticas, setEstadisticas] = useState<EstadisticaObraSocial[]>([])
  const [loading, setLoading] = useState(true)
  const [totalConsultas, setTotalConsultas] = useState(0)

  useEffect(() => {
    cargarEstadisticas()
  }, [mes, anio, especialidad])

  async function cargarEstadisticas() {
    try {
      setLoading(true)
      
      // Llamar a la función de sincronización primero
      const { error: syncError } = await supabase.rpc('sincronizar_estadisticas_obra_social', {
        p_mes: mes,
        p_anio: anio,
        p_especialidad: especialidad
      })

      if (syncError) {
        console.error('Error sincronizando estadísticas:', syncError)
        // Continuar aunque haya error en sincronización
      }

      // Obtener estadísticas desde la vista consolidada
      const { data, error } = await supabase
        .from('v_estadisticas_obra_social_consolidado')
        .select('obra_social, cantidad_consultas, porcentaje_del_total, total_consultas_mes')
        .eq('mes', mes)
        .eq('anio', anio)
        .eq('especialidad', especialidad)
        .order('cantidad_consultas', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        setEstadisticas(data as EstadisticaObraSocial[])
        setTotalConsultas(data[0].total_consultas_mes || 0)
      } else {
        setEstadisticas([])
        setTotalConsultas(0)
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400">
        Cargando estadísticas...
      </div>
    )
  }

  if (estadisticas.length === 0) {
    return (
      <div 
        className="p-6 rounded-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="text-center text-gray-400">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No hay estadísticas disponibles para este período</p>
        </div>
      </div>
    )
  }

  const maxConsultas = Math.max(...estadisticas.map(e => e.cantidad_consultas))

  return (
    <div 
      className="p-6 rounded-xl space-y-4"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <BarChart3 className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Estadísticas por Obra Social
            </h3>
            <p className="text-sm text-gray-400">
              {mes}/{anio} - {especialidad}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-400">{totalConsultas}</div>
          <div className="text-xs text-gray-400">Total consultas</div>
        </div>
      </div>

      {/* Lista de estadísticas */}
      <div className="space-y-2">
        {estadisticas.map((estadistica, index) => {
          const porcentaje = estadistica.porcentaje_del_total || 0
          const anchoBarra = (estadistica.cantidad_consultas / maxConsultas) * 100
          const esParticulares = estadistica.obra_social.includes('042') || estadistica.obra_social.includes('PARTICULARES')

          return (
            <div
              key={index}
              className="p-3 rounded-lg"
              style={{
                background: esParticulares 
                  ? 'rgba(251, 191, 36, 0.1)' 
                  : 'rgba(255, 255, 255, 0.03)',
                border: esParticulares
                  ? '1px solid rgba(251, 191, 36, 0.3)'
                  : '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Users className={`h-4 w-4 flex-shrink-0 ${esParticulares ? 'text-yellow-400' : 'text-gray-400'}`} />
                  <span className={`font-medium truncate ${esParticulares ? 'text-yellow-300' : 'text-gray-300'}`}>
                    {estadistica.obra_social}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold text-green-400">
                    {estadistica.cantidad_consultas}
                  </span>
                  <span className="text-xs text-gray-400 w-12 text-right">
                    {porcentaje.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              {/* Barra de progreso */}
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${anchoBarra}%`,
                    background: esParticulares
                      ? 'linear-gradient(90deg, rgba(251, 191, 36, 0.8), rgba(251, 191, 36, 0.6))'
                      : 'linear-gradient(90deg, rgba(34, 197, 94, 0.8), rgba(34, 197, 94, 0.6))',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Resumen */}
      <div className="pt-4 border-t border-white/10">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-green-400">{estadisticas.length}</div>
            <div className="text-xs text-gray-400">Obras Sociales</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-400">
              {estadisticas.filter(e => e.obra_social.includes('042') || e.obra_social.includes('PARTICULARES')).length}
            </div>
            <div className="text-xs text-gray-400">Particulares</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-400">
              {estadisticas[0]?.cantidad_consultas || 0}
            </div>
            <div className="text-xs text-gray-400">Mayor cantidad</div>
          </div>
        </div>
      </div>
    </div>
  )
}

