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
import { cn } from '@/lib/utils'

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
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Fondo con auroras de servidor GrowLabs */}
      <div className="fixed inset-0 z-0 text-white">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Header Premium */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 animate-in slide-in-from-top-4 duration-700">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[#00FF88] text-xs font-bold tracking-widest uppercase">
              <Plus className="h-3 w-3" />
              Supplemental Intelligence
            </div>
            <h1 className="text-6xl font-black tracking-tighter leading-none">
              GESTIÓN DE<br />
              <span className="text-[#00FF88] italic uppercase">ADICIONALES</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-md font-medium leading-relaxed">
              Configuración de honorarios suplementarios por especialidad y cobertura médica.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => router.push('/')}
              className="group flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-bold text-sm tracking-tight"
            >
              <ArrowLeft className="h-4 w-4 text-gray-400 group-hover:text-white group-hover:-translate-x-1 transition-all" />
              VOLVER
            </button>
            <button
              onClick={() => setShowFormModal(true)}
              className="flex items-center gap-3 px-8 py-4 rounded-full bg-[#00FF88] text-black font-black text-sm tracking-tighter hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,255,136,0.3)]"
            >
              <Plus className="h-5 w-5" />
              NUEVO ADICIONAL
            </button>
          </div>
        </div>

        {/* Action Bar & Month Selector */}
        <div
          className="p-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-12 animate-in fade-in slide-in-from-bottom-2 duration-1000"
        >
          <div className="flex flex-col md:flex-row gap-2 items-center">
            <div className="flex bg-white/5 rounded-full p-1 gap-2 ml-1">
              <select
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value))}
                className="bg-transparent border-none text-white font-bold text-xs px-6 focus:outline-none cursor-pointer uppercase tracking-widest"
              >
                {MESES.map(m => (
                  <option key={m.value} value={m.value} className="bg-black">{m.label}</option>
                ))}
              </select>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(parseInt(e.target.value))}
                className="bg-black/50 border border-white/10 rounded-full w-24 py-2 px-4 text-xs font-black focus:border-[#00FF88]/50 outline-none text-center"
              />
            </div>

            <div className="flex-1"></div>

            <div className="flex gap-2 pr-1.5">
              <button
                onClick={() => {
                  if (!copiarConAumento) {
                    const porcentaje = prompt('Ingrese el porcentaje de aumento:')
                    if (porcentaje && !isNaN(Number(porcentaje))) {
                      setPorcentajeAumento(Number(porcentaje))
                      setCopiarConAumento(true)
                    }
                  } else {
                    setCopiarConAumento(false)
                    setPorcentajeAumento(0)
                  }
                }}
                className={cn(
                  "px-8 py-3 rounded-full font-black text-xs tracking-tighter transition-all flex items-center gap-2",
                  copiarConAumento
                    ? "bg-[#00D1FF] text-black shadow-[0_0_20px_rgba(0,209,255,0.3)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {copiarConAumento ? (
                  <>
                    <CopyCheck className="h-4 w-4" />
                    AUMENTO {porcentajeAumento}% ACTIVO
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    HABILITAR AUMENTO %
                  </>
                )}
              </button>

              <button
                onClick={handleCopiarDesdeMesAnterior}
                className="flex items-center gap-2 px-8 py-3 rounded-full bg-white/5 border border-white/10 text-white font-black text-xs tracking-tighter hover:bg-white/10 transition-all"
              >
                <Copy className="h-4 w-4" />
                COPIAR MES ANTERIOR
              </button>
            </div>
          </div>
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

