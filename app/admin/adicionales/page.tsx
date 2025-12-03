'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { ConfiguracionAdicional, ConfiguracionAdicionalInsert } from '@/lib/types'
import { NotificationModal, NotificationType } from '@/components/custom/NotificationModal'
import { InlineEditCell } from '@/components/custom/InlineEditCell'
import { AdicionalFormModal } from '@/components/custom/AdicionalFormModal'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, ArrowLeft, Copy, CopyCheck } from 'lucide-react'

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

const ESPECIALIDADES = [
  'Pediatría',
  'Ginecología',
  'Obstetricia',
  'Cirugía',
  'Clínica'
]

export default function AdicionalesPage() {
  const router = useRouter()
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [adicionales, setAdicionales] = useState<ConfiguracionAdicional[]>([])
  const [loading, setLoading] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [copiarConAumento, setCopiarConAumento] = useState(false)
  const [porcentajeAumento, setPorcentajeAumento] = useState(0)
  const [notification, setNotification] = useState<{
    isOpen: boolean
    type: NotificationType
    title?: string
    message: string
  }>({
    isOpen: false,
    type: 'info',
    message: ''
  })

  useEffect(() => {
    cargarAdicionales()
  }, [mes, anio])

  const showNotification = (type: NotificationType, message: string, title?: string) => {
    setNotification({
      isOpen: true,
      type,
      message,
      title
    })
  }

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }))
  }

  async function cargarAdicionales() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('configuracion_adicionales')
        .select('*')
        .eq('mes', mes)
        .eq('anio', anio)
        .order('especialidad', { ascending: true })
        .order('obra_social', { ascending: true })

      if (error) throw error

      const adicionalesData = (data || []) as ConfiguracionAdicional[]
      setAdicionales(adicionalesData)
    } catch (error) {
      console.error('Error cargando adicionales:', error)
      showNotification('error', 'Error al cargar adicionales: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAgregar(data: {
    obra_social: string
    especialidad: string
    monto_base_adicional: number
    porcentaje_pago_medico: number
  }) {
    try {
      setLoading(true)

      // Calcular monto adicional
      const montoAdicional = data.monto_base_adicional * (data.porcentaje_pago_medico / 100)

      // Verificar si ya existe
      const { data: existente } = await supabase
        .from('configuracion_adicionales')
        .select('id')
        .eq('obra_social', data.obra_social.trim())
        .eq('especialidad', data.especialidad)
        .eq('mes', mes)
        .eq('anio', anio)
        .single()

      if (existente) {
        showNotification('error', 'Ya existe un adicional para esta obra social, especialidad y período', 'Error')
        return
      }

      const nuevoAdicional: ConfiguracionAdicionalInsert = {
        obra_social: data.obra_social.trim(),
        especialidad: data.especialidad,
        mes,
        anio,
        aplica_adicional: true,
        monto_base_adicional: data.monto_base_adicional,
        porcentaje_pago_medico: data.porcentaje_pago_medico,
        monto_adicional: montoAdicional
      }

      const { error } = await supabase
        .from('configuracion_adicionales')
        // @ts-ignore
        .insert(nuevoAdicional)

      if (error) throw error

      await cargarAdicionales()
      showNotification('success', `Adicional agregado correctamente. Monto que recibe el médico: $${montoAdicional.toFixed(2)}`, 'Éxito')
      setShowFormModal(false)
    } catch (error) {
      console.error('Error agregando adicional:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      showNotification('error', `Error al agregar adicional: ${errorMessage}`, 'Error')
      showNotification('error', 'Error al agregar adicional: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopiarDesdeMesAnterior() {
    try {
      setLoading(true)
      
      // Calcular mes anterior
      let mesAnterior = mes - 1
      let anioAnterior = anio
      if (mesAnterior === 0) {
        mesAnterior = 12
        anioAnterior = anio - 1
      }

      // Obtener adicionales del mes anterior
      const { data: adicionalesAnteriores, error } = await supabase
        .from('configuracion_adicionales')
        .select('*')
        .eq('mes', mesAnterior)
        .eq('anio', anioAnterior)

      if (error) throw error

      const adicionalesAnterioresData = (adicionalesAnteriores || []) as ConfiguracionAdicional[]

      if (adicionalesAnterioresData.length === 0) {
        showNotification('warning', 'No hay adicionales en el mes anterior para copiar', 'Sin datos')
        return
      }

      // Eliminar adicionales existentes del mes actual
      await supabase
        .from('configuracion_adicionales')
        .delete()
        .eq('mes', mes)
        .eq('anio', anio)

      // Copiar adicionales con o sin aumento
      const nuevosAdicionales = adicionalesAnterioresData.map(a => {
        let montoBase = a.monto_base_adicional || a.monto_adicional || 0
        let porcentaje = a.porcentaje_pago_medico || 100
        
        if (copiarConAumento && montoBase > 0) {
          montoBase = montoBase * (1 + porcentajeAumento / 100)
        }
        
        const montoAdicional = montoBase * (porcentaje / 100)
        
        return {
          obra_social: a.obra_social,
          especialidad: a.especialidad,
          mes: mes,
          anio: anio,
          aplica_adicional: a.aplica_adicional,
          monto_base_adicional: montoBase,
          porcentaje_pago_medico: porcentaje,
          monto_adicional: montoAdicional
        }
      })

      const { error: insertError } = await supabase
        .from('configuracion_adicionales')
        // @ts-ignore
        .insert(nuevosAdicionales)

      if (insertError) throw insertError

      await cargarAdicionales()
      showNotification('success', `Se copiaron ${nuevosAdicionales.length} adicionales desde ${MESES[mesAnterior - 1].label} ${anioAnterior}`, 'Copia exitosa')
    } catch (error) {
      console.error('Error copiando desde mes anterior:', error)
      showNotification('error', 'Error al copiar adicionales: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCellUpdate(
    id: string,
    campo: 'monto_base_adicional' | 'porcentaje_pago_medico' | 'aplica_adicional',
    newValue: number | boolean
  ) {
    try {
      let updateData: any = {}
      
      if (campo === 'aplica_adicional') {
        updateData.aplica_adicional = newValue
      } else if (campo === 'monto_base_adicional') {
        updateData.monto_base_adicional = newValue
        // Recalcular monto_adicional
        const adicional = adicionales.find(a => a.id === id)
        if (adicional && adicional.porcentaje_pago_medico) {
          updateData.monto_adicional = (newValue as number) * (adicional.porcentaje_pago_medico / 100)
        }
      } else if (campo === 'porcentaje_pago_medico') {
        updateData.porcentaje_pago_medico = newValue
        // Recalcular monto_adicional
        const adicional = adicionales.find(a => a.id === id)
        if (adicional && adicional.monto_base_adicional) {
          updateData.monto_adicional = adicional.monto_base_adicional * ((newValue as number) / 100)
        }
      }

      const { error } = await supabase
        .from('configuracion_adicionales')
        // @ts-ignore
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      await cargarAdicionales()
    } catch (error) {
      console.error('Error actualizando adicional:', error)
      throw error
    }
  }

  async function handleEliminar(id: string, obraSocial: string, especialidad: string) {
    if (!confirm(`¿Está seguro de que desea eliminar el adicional de "${obraSocial}" para ${especialidad} en ${MESES[mes - 1].label} ${anio}?`)) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('configuracion_adicionales')
        .delete()
        .eq('id', id)

      if (error) throw error

      await cargarAdicionales()
      showNotification('success', 'Adicional eliminado correctamente', 'Éxito')
    } catch (error) {
      console.error('Error eliminando adicional:', error)
      showNotification('error', 'Error al eliminar adicional: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'Error')
    } finally {
      setLoading(false)
    }
  }

  const adicionalesPorEspecialidad = adicionales.reduce((acc, a) => {
    if (!acc[a.especialidad]) {
      acc[a.especialidad] = []
    }
    acc[a.especialidad].push(a)
    return acc
  }, {} as Record<string, ConfiguracionAdicional[]>)

  return (
    <div className="min-h-screen relative p-8 pb-20 overflow-hidden">
      {/* Efectos de luz */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-green-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="border-green-500/50 text-green-400 hover:bg-green-500/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-2 tracking-tight">
              <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                Administración de Adicionales
              </span>
            </h1>
            <p className="text-gray-400">Configuración de adicionales por obra social y especialidad</p>
          </div>
        </div>

        {/* Selectores de mes/año */}
        <div 
          className="p-6 rounded-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}
        >
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Mes</label>
              <select
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value))}
                className="bg-gray-900/50 border border-green-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {MESES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Año</label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(parseInt(e.target.value))}
                className="bg-gray-900/50 border border-green-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
                min="2020"
              />
            </div>
            <div className="flex-1"></div>
            <Button
              onClick={() => setShowFormModal(true)}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Adicional
            </Button>
            <Button
              onClick={handleCopiarDesdeMesAnterior}
              disabled={loading}
              variant="outline"
              className="border-green-500/50 text-green-400 hover:bg-green-500/20"
            >
              {copiarConAumento ? <CopyCheck className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Copiar Mes Anterior
            </Button>
          </div>
          
          {copiarConAumento && (
            <div className="mt-4 flex items-center gap-2">
              <label className="text-sm text-gray-400">Aumento porcentual:</label>
              <input
                type="number"
                value={porcentajeAumento}
                onChange={(e) => setPorcentajeAumento(parseFloat(e.target.value) || 0)}
                className="bg-gray-900/50 border border-green-500/30 rounded-lg px-3 py-1 text-white focus:outline-none focus:ring-2 focus:ring-green-500 w-24"
                step="0.1"
              />
              <span className="text-sm text-gray-400">%</span>
              <Button
                onClick={() => setCopiarConAumento(false)}
                variant="outline"
                size="sm"
                className="ml-2"
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>

        {/* Tabla de adicionales */}
        {loading && adicionales.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : adicionales.length === 0 ? (
          <div 
            className="p-8 rounded-xl text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <p className="text-gray-400">No hay adicionales configurados para {MESES[mes - 1].label} {anio}</p>
          </div>
        ) : (
          Object.entries(adicionalesPorEspecialidad).map(([especialidad, adicionalesEspecialidad]) => (
            <div 
              key={especialidad}
              className="p-6 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}
            >
              <h2 className="text-xl font-bold text-green-400 mb-4">{especialidad}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-2 text-left text-gray-400">Obra Social</th>
                      <th className="px-4 py-2 text-left text-gray-400">Monto Base</th>
                      <th className="px-4 py-2 text-left text-gray-400">% Pago Médico</th>
                      <th className="px-4 py-2 text-left text-gray-400">Monto Médico</th>
                      <th className="px-4 py-2 text-left text-gray-400">Aplica</th>
                      <th className="px-4 py-2 text-left text-gray-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adicionalesEspecialidad.map(adicional => {
                      const montoMedico = (adicional.monto_base_adicional || 0) * ((adicional.porcentaje_pago_medico || 0) / 100)
                      return (
                        <tr key={adicional.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="px-4 py-2 text-white">{adicional.obra_social}</td>
                          <td className="px-4 py-2">
                            <InlineEditCell
                              value={adicional.monto_base_adicional || 0}
                              onSave={async (newValue) => {
                                const numValue = typeof newValue === 'string' ? parseFloat(newValue) : newValue
                                await handleCellUpdate(adicional.id, 'monto_base_adicional', numValue)
                              }}
                              type="number"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <InlineEditCell
                              value={adicional.porcentaje_pago_medico || 0}
                              onSave={async (newValue) => {
                                const numValue = typeof newValue === 'string' ? parseFloat(newValue) : newValue
                                await handleCellUpdate(adicional.id, 'porcentaje_pago_medico', numValue)
                              }}
                              type="number"
                            />
                          </td>
                          <td className="px-4 py-2 text-green-400 font-semibold">
                            ${montoMedico.toFixed(2)}
                          </td>
                          <td className="px-4 py-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={adicional.aplica_adicional}
                                onChange={async (e) => {
                                  await handleCellUpdate(adicional.id, 'aplica_adicional', e.target.checked)
                                }}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-green-500 focus:ring-green-500"
                              />
                              <span className="text-sm text-gray-300">
                                {adicional.aplica_adicional ? 'Sí' : 'No'}
                              </span>
                            </label>
                          </td>
                          <td className="px-4 py-2">
                            <Button
                              onClick={() => handleEliminar(adicional.id, adicional.obra_social, adicional.especialidad)}
                              variant="outline"
                              size="sm"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Notificación */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />

      {/* Modal de Formulario */}
      <AdicionalFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleAgregar}
      />
    </div>
  )
}

