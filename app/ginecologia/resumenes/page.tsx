'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { calcularResumenPorMedico, calcularResumenPorPrestador, ResumenPorMedico, ResumenPorPrestador, obtenerResidentesFormativos, TotalesResidentesFormativos } from '@/lib/ginecologia-resumenes'
import { exportPDFResumenPorMedico } from '@/lib/pdf-exporter-resumen-medico'
import { exportPDFResumenPorPrestador } from '@/lib/pdf-exporter-resumen-prestador'
import { LiquidacionGuardia } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileDown, Download, History, Eye, FileSpreadsheet, GraduationCap } from 'lucide-react'
import { ExcelDataTable } from '@/components/custom/ExcelDataTable'
import { cargarExcelDataDesdeBD } from '@/lib/excel-reconstructor'
import { ExcelData } from '@/lib/excel-reader'

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

export default function ResumenesGinecologiaPage() {
  const router = useRouter()

  // Cargar mes y año desde localStorage al inicializar
  const [mes, setMes] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedMes = localStorage.getItem('ginecologia_resumenes_mes')
      return savedMes ? parseInt(savedMes, 10) : new Date().getMonth() + 1
    }
    return new Date().getMonth() + 1
  })

  const [anio, setAnio] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedAnio = localStorage.getItem('ginecologia_resumenes_anio')
      return savedAnio ? parseInt(savedAnio, 10) : new Date().getFullYear()
    }
    return new Date().getFullYear()
  })
  const [resumenesPorMedico, setResumenesPorMedico] = useState<Map<string, ResumenPorMedico[]>>(new Map())
  const [resumenesPorPrestador, setResumenesPorPrestador] = useState<ResumenPorPrestador[]>([])
  const [historial, setHistorial] = useState<LiquidacionGuardia[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [tabActiva, setTabActiva] = useState<'medicos' | 'prestadores' | 'historial' | 'excel' | 'residentes'>('medicos')
  const [liquidacionExpandida, setLiquidacionExpandida] = useState<string | null>(null)
  const [excelData, setExcelData] = useState<ExcelData | null>(null)
  const [liquidacionActual, setLiquidacionActual] = useState<LiquidacionGuardia | null>(null)
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [residentesFormativos, setResidentesFormativos] = useState<TotalesResidentesFormativos>({
    resumenes: [],
    totalConsultas: 0,
    totalValor: 0
  })
  const [loadingResidentes, setLoadingResidentes] = useState(false)

  // Guardar mes y año en localStorage cuando cambian
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ginecologia_resumenes_mes', mes.toString())
      localStorage.setItem('ginecologia_resumenes_anio', anio.toString())
    }
  }, [mes, anio])

  useEffect(() => {
    if (tabActiva === 'historial') {
      cargarHistorial()
    } else if (tabActiva === 'excel') {
      cargarExcelData()
    } else if (tabActiva === 'residentes') {
      cargarResidentesFormativos()
    } else {
      cargarResumenes()
    }
  }, [mes, anio, tabActiva])

  // Cargar ExcelData desde la liquidación del mes seleccionado
  async function cargarExcelData() {
    setLoadingExcel(true)
    try {
      // Buscar liquidación del mes/año seleccionado
      const { data: liquidacion, error } = await supabase
        .from('liquidaciones_guardia')
        .select('*')
        .eq('especialidad', 'Ginecología')
        .eq('mes', mes)
        .eq('anio', anio)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error cargando liquidación:', error)
        setExcelData(null)
        setLiquidacionActual(null)
        return
      }

      if (liquidacion) {
        const liq = liquidacion as LiquidacionGuardia
        setLiquidacionActual(liq)

        // Cargar ExcelData desde BD
        const excelDataCargado = await cargarExcelDataDesdeBD(liq.id, supabase)
        if (excelDataCargado) {
          setExcelData(excelDataCargado)
        } else {
          setExcelData(null)
        }
      } else {
        setLiquidacionActual(null)
        setExcelData(null)
      }
    } catch (error) {
      console.error('Error cargando ExcelData:', error)
      setExcelData(null)
      setLiquidacionActual(null)
    } finally {
      setLoadingExcel(false)
    }
  }

  // Función para actualizar celda (similar a ginecologia/page.tsx)
  const cambiosPendientesRef = useRef<Map<string, { liquidacionId: string; filaExcel: number; columna: string; valor: any }>>(new Map())
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleCellUpdate = useCallback(async (rowIndex: number, column: string, newValue: any) => {
    if (!liquidacionActual || !excelData) return

    const filaExcel = rowIndex + 1

    // Actualizar ExcelData local inmediatamente (optimista)
    if (excelData.rows[rowIndex]) {
      excelData.rows[rowIndex][column] = newValue
      setExcelData({ ...excelData })
    }

    // Guardar cambio pendiente
    const key = `${liquidacionActual.id}-${filaExcel}-${column}`
    cambiosPendientesRef.current.set(key, {
      liquidacionId: liquidacionActual.id,
      filaExcel,
      columna: column,
      valor: newValue
    })

    // Cancelar timer anterior
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    // Programar guardado automático (500ms de debounce)
    saveTimerRef.current = setTimeout(async () => {
      await guardarCambiosPendientes()
    }, 500)
  }, [liquidacionActual, excelData])

  const guardarCambiosPendientes = async () => {
    if (cambiosPendientesRef.current.size === 0 || !liquidacionActual) return

    const cambios = Array.from(cambiosPendientesRef.current.values())

    try {
      // Agrupar cambios por fila
      const cambiosPorFila = new Map<number, Map<string, any>>()
      cambios.forEach(cambio => {
        if (!cambiosPorFila.has(cambio.filaExcel)) {
          cambiosPorFila.set(cambio.filaExcel, new Map())
        }
        const filaCambios = cambiosPorFila.get(cambio.filaExcel)!

        // Mapear nombre de columna del Excel a campo de BD
        if (cambio.columna.toLowerCase().includes('cliente') || cambio.columna.toLowerCase().includes('obra')) {
          filaCambios.set('obra_social', cambio.valor)
        } else if (cambio.columna.toLowerCase().includes('responsable') || cambio.columna.toLowerCase().includes('medico')) {
          filaCambios.set('medico_nombre', cambio.valor)
        } else if (cambio.columna.toLowerCase().includes('paciente')) {
          filaCambios.set('paciente', cambio.valor)
        }
      })

      // ✅ Detectar filas donde se cambió la obra social
      const filasConObraSocialCambiada = new Set<number>()
      cambiosPorFila.forEach((campos, filaExcel) => {
        if (campos.has('obra_social')) {
          filasConObraSocialCambiada.add(filaExcel)
        }
      })

      // Guardar cada fila y recalcular si cambió la obra social
      const promesas = Array.from(cambiosPorFila.entries()).map(async ([filaExcel, campos]) => {
        const updateData: any = {}
        campos.forEach((valor, campo) => {
          updateData[campo] = valor
        })

        // ✅ Si se cambió la obra social, recalcular importes
        // NOTA: Ginecología NO tiene retención del 30% ni adicionales
        if (campos.has('obra_social')) {
          const nuevaObraSocial = String(campos.get('obra_social')).trim()

          try {
            // Obtener detalle actual para verificar si es horario formativo
            const { data: detalleActualData } = await supabase
              .from('detalle_guardia')
              .select('es_horario_formativo')
              .eq('liquidacion_id', liquidacionActual.id)
              .eq('fila_excel', filaExcel)
              .maybeSingle()

            const detalleActual = detalleActualData as { es_horario_formativo: boolean } | null
            const esHorarioFormativo = detalleActual?.es_horario_formativo || false

            // Cargar valor de consulta para la nueva obra social
            const { data: valorConsultaData } = await supabase
              .from('valores_consultas_obra_social')
              .select('valor')
              .eq('tipo_consulta', 'CONSULTA GINECOLOGICA')
              .eq('mes', mes)
              .eq('anio', anio)
              .eq('obra_social', nuevaObraSocial)
              .maybeSingle()

            const valorConsulta = valorConsultaData as { valor: number } | null
            let montoFacturado = valorConsulta?.valor || 0
            let importeCalculado = montoFacturado

            // Si es horario formativo, no se paga
            if (esHorarioFormativo) {
              montoFacturado = 0
              importeCalculado = 0
            }

            // Actualizar campos calculados
            // Ginecología: sin retención, sin adicionales
            updateData.monto_facturado = montoFacturado
            updateData.monto_retencion = null
            updateData.monto_adicional = 0
            updateData.importe_calculado = importeCalculado
            updateData.porcentaje_retencion = null

            // También actualizar ExcelData local para reflejar los cambios
            if (excelData && excelData.rows[filaExcel - 1]) {
              excelData.rows[filaExcel - 1]['Importe'] = montoFacturado
            }
          } catch (error) {
            console.error(`Error recalculando importes para fila ${filaExcel}:`, error)
          }
        }

        updateData.updated_at = new Date().toISOString()

        const { error } = await supabase
          .from('detalle_guardia')
          // @ts-ignore
          .update(updateData)
          .eq('liquidacion_id', liquidacionActual.id)
          .eq('fila_excel', filaExcel)

        if (error) throw error
      })

      await Promise.all(promesas)

      // ✅ Si se cambió alguna obra social, actualizar ExcelData y recargar resúmenes
      if (filasConObraSocialCambiada.size > 0) {
        // Actualizar estado local de ExcelData
        if (excelData) {
          setExcelData({ ...excelData })
        }

        // Actualizar totales de liquidación
        const actualizarTotales = async () => {
          const { data: detalles } = await supabase
            .from('detalle_guardia')
            .select('importe_calculado, monto_facturado')
            .eq('liquidacion_id', liquidacionActual.id) as { data: Array<{ importe_calculado: number | null; monto_facturado: number | null }> | null }

          if (detalles) {
            const totalConsultas = detalles.length
            const totalBruto = detalles.reduce((sum, d) => sum + (d.monto_facturado || 0), 0)
            const totalNeto = detalles.reduce((sum, d) => sum + (d.importe_calculado || 0), 0)

            await supabase
              .from('liquidaciones_guardia')
              // @ts-ignore
              .update({
                total_consultas: totalConsultas,
                total_bruto: totalBruto,
                total_neto: totalNeto
              })
              .eq('id', liquidacionActual.id)
          }
        }

        // Ejecutar actualización de totales en background
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          requestIdleCallback(actualizarTotales, { timeout: 1000 })
        } else {
          setTimeout(actualizarTotales, 100)
        }

        // ✅ Recargar resúmenes automáticamente si estamos en la tab correspondiente
        if (tabActiva === 'medicos' || tabActiva === 'prestadores') {
          // Pequeño delay para asegurar que la BD se actualizó
          setTimeout(() => {
            cargarResumenes()
          }, 500)
        }
      }

      // Limpiar cambios pendientes
      cambiosPendientesRef.current.clear()
    } catch (error) {
      console.error('Error guardando cambios:', error)
    }
  }

  // Función para eliminar fila - MEJORADA para recargar datos después de eliminar
  const handleDeleteRow = useCallback(async (rowIndex: number) => {
    if (!liquidacionActual || !excelData) return

    // Obtener la fila y su fila_excel
    const row = excelData.rows[rowIndex]
    if (!row) return

    // Obtener información para el log
    const filaExcel = (row as any).__fila_excel ?? (rowIndex + 1)
    const paciente = (row as any).paciente || (row as any).Paciente
    const fecha = (row as any).fecha || (row as any)['Fecha Visita']

    try {
      // Eliminar de BD usando fila_excel directamente
      const { error } = await supabase
        .from('detalle_guardia')
        .delete()
        .eq('liquidacion_id', liquidacionActual.id)
        .eq('fila_excel', filaExcel)

      if (error) {
        console.error('Error eliminando fila:', error)
        return
      }

      // Recargar ExcelData desde BD para asegurar sincronización
      // Esto actualiza los índices y asegura que todo esté correcto
      const excelDataRecargado = await cargarExcelDataDesdeBD(liquidacionActual.id, supabase)
      if (excelDataRecargado) {
        setExcelData(excelDataRecargado)
      }

      // Actualizar totales de liquidación en background
      const actualizarTotales = async () => {
        const { data: detalles } = await supabase
          .from('detalle_guardia')
          .select('importe_calculado, monto_facturado')
          .eq('liquidacion_id', liquidacionActual.id) as { data: Array<{ importe_calculado: number | null; monto_facturado: number | null }> | null }

        if (detalles) {
          const totalConsultas = detalles.length
          const totalBruto = detalles.reduce((sum, d) => sum + (d.monto_facturado || 0), 0)
          const totalNeto = detalles.reduce((sum, d) => sum + (d.importe_calculado || 0), 0)

          await supabase
            .from('liquidaciones_guardia')
            // @ts-ignore
            .update({
              total_consultas: totalConsultas,
              total_bruto: totalBruto,
              total_neto: totalNeto
            })
            .eq('id', liquidacionActual.id)
        }
      }

      // Ejecutar en background
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(actualizarTotales, { timeout: 1000 })
      } else {
        setTimeout(actualizarTotales, 100)
      }
    } catch (error: any) {
      console.error('Error eliminando fila:', error)
    }
  }, [liquidacionActual, excelData])

  async function cargarResumenes() {
    setLoading(true)
    try {
      console.log(`[Ginecología Resúmenes] Cargando resúmenes para ${mes}/${anio}`)

      // Obtener liquidación específica de Ginecología para trabajar solo con ese archivo
      const { data: liquidacion } = await supabase
        .from('liquidaciones_guardia')
        .select('id')
        .eq('especialidad', 'Ginecología')
        .eq('mes', mes)
        .eq('anio', anio)
        .maybeSingle()

      if (!liquidacion || !(liquidacion as any).id) {
        console.warn(`[Ginecología Resúmenes] No se encontró liquidación de Ginecología para ${mes}/${anio}`)
        setResumenesPorPrestador([])
        setResumenesPorMedico(new Map())
        return
      }

      const liquidacionId = (liquidacion as any).id
      console.log(`[Ginecología Resúmenes] Liquidación ID: ${liquidacionId}`)

      // Calcular resumen por prestador pasando liquidacionId específico
      const resumenPrestadores = await calcularResumenPorPrestador(mes, anio, liquidacionId)
      console.log(`[Ginecología Resúmenes] Resúmenes por prestador: ${resumenPrestadores.length}`)
      const totalConsultasPrestadores = resumenPrestadores.reduce((sum, r) => sum + r.cantidad, 0)
      console.log(`[Ginecología Resúmenes] Total de consultas en prestadores: ${totalConsultasPrestadores}`)
      setResumenesPorPrestador(resumenPrestadores)

      // Calcular resumen por médico pasando liquidacionId específico
      const resumenMedicos = await calcularResumenPorMedico(mes, anio, liquidacionId)
      console.log(`[Ginecología Resúmenes] Resúmenes por médico: ${resumenMedicos.length}`)
      const totalConsultasMedicos = resumenMedicos.reduce((sum, r) => sum + r.cantidad, 0)
      console.log(`[Ginecología Resúmenes] Total de consultas en médicos: ${totalConsultasMedicos}`)

      // Agrupar por médico - usar nombre normalizado si no hay ID para evitar agrupar médicos diferentes
      const resumenesPorMedicoMap = new Map<string, ResumenPorMedico[]>()
      resumenMedicos.forEach(resumen => {
        // Usar ID si existe, sino usar nombre normalizado como clave única
        const nombreNormalizado = resumen.medico_nombre.toLowerCase().trim().replace(/\s+/g, ' ')
        const clave = resumen.medico_id || `nombre-${nombreNormalizado}`

        if (!resumenesPorMedicoMap.has(clave)) {
          resumenesPorMedicoMap.set(clave, [])
        }
        resumenesPorMedicoMap.get(clave)!.push(resumen)
      })

      console.log(`[Ginecología Resúmenes] Médicos únicos: ${resumenesPorMedicoMap.size}`)
      setResumenesPorMedico(resumenesPorMedicoMap)
    } catch (error) {
      console.error('Error cargando resúmenes:', error)
    } finally {
      setLoading(false)
    }
  }

  async function cargarHistorial() {
    setLoadingHistorial(true)
    try {
      const { data, error } = await supabase
        .from('liquidaciones_guardia')
        .select('*')
        .eq('especialidad', 'Ginecología')
        .order('anio', { ascending: false })
        .order('mes', { ascending: false })

      if (error) throw error

      setHistorial((data as LiquidacionGuardia[]) || [])
    } catch (error) {
      console.error('Error cargando historial:', error)
    } finally {
      setLoadingHistorial(false)
    }
  }

  async function cargarResidentesFormativos() {
    setLoadingResidentes(true)
    try {
      // Obtener liquidación específica
      const { data: liquidacion } = await supabase
        .from('liquidaciones_guardia')
        .select('id')
        .eq('especialidad', 'Ginecología')
        .eq('mes', mes)
        .eq('anio', anio)
        .maybeSingle()

      if (!liquidacion || !(liquidacion as any).id) {
        setResidentesFormativos({
          resumenes: [],
          totalConsultas: 0,
          totalValor: 0
        })
        return
      }

      const liquidacionId = (liquidacion as any).id
      const residentes = await obtenerResidentesFormativos(mes, anio, liquidacionId)
      setResidentesFormativos(residentes)
    } catch (error) {
      console.error('Error cargando residentes formativos:', error)
    } finally {
      setLoadingResidentes(false)
    }
  }

  function formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor)
  }

  function handleExportarPDFMedico(medicoNombre: string, resumenes: ResumenPorMedico[]) {
    exportPDFResumenPorMedico({
      resumenes,
      mes,
      anio,
      medicoNombre
    })
  }

  function handleExportarPDFPrestadores() {
    exportPDFResumenPorPrestador({
      resumenes: resumenesPorPrestador,
      mes,
      anio
    })
  }

  // Obtener lista de médicos únicos
  const medicos = Array.from(resumenesPorMedico.keys()).map(medicoId => {
    const resumenes = resumenesPorMedico.get(medicoId) || []
    return resumenes[0]?.medico_nombre || 'Desconocido'
  }).sort()

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Fondo con auroras de servidor GrowLabs */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00D1FF]/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#1E3A8A]/15 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Header Premium */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 animate-in slide-in-from-top-4 duration-700">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D1FF]/10 border border-[#00D1FF]/20 text-[#00D1FF] text-xs font-bold tracking-widest uppercase">
              <History className="h-3 w-3" />
              Intelligence Hub
            </div>
            <h1 className="text-6xl font-black tracking-tighter leading-none">
              RESÚMENES<br />
              <span className="text-[#00D1FF] italic uppercase">Ginecología</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-md font-medium leading-relaxed">
              Analítica detallada de producción ginecológica con validación horaria automática.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => router.push('/ginecologia')}
              className="group flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-bold text-sm tracking-tight"
            >
              <ArrowLeft className="h-4 w-4 text-gray-400 group-hover:text-white group-hover:-translate-x-1 transition-all" />
              VOLVER
            </button>
            <div className="flex bg-white/5 backdrop-blur-md border border-white/10 rounded-full p-1.5 gap-2">
              <select
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value))}
                className="bg-transparent border-none text-white font-bold text-sm px-4 focus:outline-none cursor-pointer"
              >
                {MESES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(parseInt(e.target.value))}
                className="bg-black border border-white/10 rounded-full w-24 py-1.5 px-4 text-sm font-bold focus:border-[#00D1FF]/50 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tabs Premium */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full w-fit mb-12 animate-in fade-in slide-in-from-bottom-2 duration-1000 no-scrollbar">
          <button
            onClick={() => setTabActiva('medicos')}
            className={`px-8 py-3 rounded-full font-bold text-xs whitespace-nowrap tracking-tighter transition-all flex items-center gap-2 ${tabActiva === 'medicos'
              ? 'bg-[#00D1FF] text-black shadow-[0_0_20px_rgba(0,209,255,0.2)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            POR MÉDICO
          </button>
          <button
            onClick={() => setTabActiva('prestadores')}
            className={`px-8 py-3 rounded-full font-bold text-xs whitespace-nowrap tracking-tighter transition-all flex items-center gap-2 ${tabActiva === 'prestadores'
              ? 'bg-[#00D1FF] text-black shadow-[0_0_209,255,0.2)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            POR PRESTADOR
          </button>
          <button
            onClick={() => setTabActiva('residentes')}
            className={`px-8 py-3 rounded-full font-bold text-xs whitespace-nowrap tracking-tighter transition-all flex items-center gap-2 ${tabActiva === 'residentes'
              ? 'bg-[#00D1FF] text-black shadow-[0_0_209,255,0.2)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <GraduationCap className="h-4 w-4" />
            RESIDENTES FORMATIVOS
          </button>
          <button
            onClick={() => setTabActiva('historial')}
            className={`px-8 py-3 rounded-full font-bold text-xs whitespace-nowrap tracking-tighter transition-all flex items-center gap-2 ${tabActiva === 'historial'
              ? 'bg-[#00D1FF] text-black shadow-[0_0_209,255,0.2)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <History className="h-4 w-4" />
            HISTORIAL
          </button>
          <button
            onClick={() => setTabActiva('excel')}
            className={`px-8 py-3 rounded-full font-bold text-xs whitespace-nowrap tracking-tighter transition-all flex items-center gap-2 ${tabActiva === 'excel'
              ? 'bg-[#00D1FF] text-black shadow-[0_0_209,255,0.2)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            VISUALIZADOR EXCEL
          </button>
        </div>

        {/* Contenido de Tabs */}
        {tabActiva === 'historial' ? (
          /* Tab: Historial */
          <div className="space-y-6">
            {loadingHistorial ? (
              <div className="text-center py-12 text-gray-500 font-mono text-sm animate-pulse tracking-widest uppercase">Consultando Archivos Históricos...</div>
            ) : historial.length === 0 ? (
              <div
                className="rounded-[32px] p-12 text-center bg-white/[0.02] border border-white/5 backdrop-blur-3xl animate-in zoom-in-95"
              >
                <div className="text-[#FACC15] text-2xl font-black italic uppercase tracking-tighter mb-4">
                  SISTEMA SIN REGISTROS
                </div>
                <div className="text-gray-500 font-medium mb-8 max-w-sm mx-auto">
                  No se han detectado liquidaciones previas para el módulo de Ginecología.
                </div>
                <button
                  onClick={() => router.push('/ginecologia')}
                  className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-black text-xs tracking-widest hover:bg-white/10 transition-all uppercase"
                >
                  Iniciar Primer Proceso
                </button>
              </div>
            ) : (
              <div
                className="rounded-[32px] overflow-hidden bg-white/[0.02] border border-white/10 backdrop-blur-3xl animate-in slide-in-from-bottom-4 duration-700"
              >
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-3xl font-black tracking-tighter italic uppercase underline decoration-[#00D1FF] decoration-4 underline-offset-8">Historial Maestro</h2>
                  <div className="px-4 py-1.5 rounded-full bg-[#00D1FF]/10 border border-[#00D1FF]/20 text-[#00D1FF] text-[10px] font-black tracking-widest uppercase">
                    MOD: GYN-25
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 border-y border-white/5">
                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Período</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">N° Liquidación</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Archivo</th>
                        <th className="px-6 py-4 text-xs font-black text-center text-gray-400 uppercase tracking-widest">Estado</th>
                        <th className="px-6 py-4 text-xs font-black text-right text-gray-400 uppercase tracking-widest">Consultas</th>
                        <th className="px-6 py-4 text-xs font-black text-right text-gray-400 uppercase tracking-widest">Total Bruto</th>
                        <th className="px-6 py-4 text-xs font-black text-right text-[#00D1FF] uppercase tracking-widest">Total Neto</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Procesamiento</th>
                        <th className="px-6 py-4 text-xs font-black text-center text-gray-400 uppercase tracking-widest">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map((liquidacion) => {
                        const fechaProcesamiento = liquidacion.created_at
                          ? new Date(liquidacion.created_at).toLocaleDateString('es-AR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          : 'N/A'

                        const nombreMes = MESES.find(m => m.value === liquidacion.mes)?.label || `Mes ${liquidacion.mes}`
                        const estaExpandida = liquidacionExpandida === liquidacion.id

                        return (
                          <>
                            <tr key={liquidacion.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                              <td className="px-4 py-3 text-sm text-gray-300 font-medium">
                                {nombreMes} {liquidacion.anio}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300">
                                {liquidacion.numero_liquidacion || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300">
                                <div className="max-w-xs truncate" title={liquidacion.archivo_nombre || ''}>
                                  {liquidacion.archivo_nombre || 'Sin archivo'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${liquidacion.estado === 'finalizada'
                                  ? 'bg-green-500/20 text-green-400'
                                  : liquidacion.estado === 'procesando'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : liquidacion.estado === 'error'
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'bg-gray-500/20 text-gray-400'
                                  }`}>
                                  {liquidacion.estado}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300 text-right">
                                {liquidacion.total_consultas || 0}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300 text-right">
                                {formatearMoneda(liquidacion.total_bruto || 0)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300 text-right font-semibold">
                                {formatearMoneda(liquidacion.total_neto || 0)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300">
                                {fechaProcesamiento}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button
                                  onClick={() => {
                                    setLiquidacionExpandida(estaExpandida ? null : liquidacion.id)
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  {estaExpandida ? 'Ocultar' : 'Ver'}
                                </Button>
                              </td>
                            </tr>
                            {estaExpandida && (
                              <tr>
                                <td colSpan={9} className="px-4 py-4 bg-gray-900/50">
                                  <DetalleLiquidacion liquidacionId={liquidacion.id} />
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : tabActiva === 'residentes' ? (
          /* Tab: Residentes Formativos - Solo para Administración */
          <div
            className="rounded-[32px] overflow-hidden bg-white/[0.02] border border-white/10 backdrop-blur-3xl animate-in fade-in"
          >
            <div className="p-8 border-b border-white/5">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
                <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">
                  Residentes Formativos
                </h2>
              </div>
              <p className="text-gray-500 font-bold max-w-2xl text-sm leading-relaxed">
                Consultas bloqueadas: Residentes actuando en horario formativo (Lunes a Sábado, 07:00 a 15:00).
                <span className="text-[#FACC15] block mt-1 uppercase tracking-widest text-[10px]">SISTEMA: NO PAGO RECOMENDADO</span>
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Volumen Total Bloqueado</p>
                  <p className="text-4xl font-black text-white tracking-tighter font-mono">{residentesFormativos.totalConsultas} <span className="text-xs">CONSULTAS</span></p>
                </div>
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Carga Económica No Abonable</p>
                  <p className="text-4xl font-black text-purple-400 tracking-tighter font-mono">{formatearMoneda(residentesFormativos.totalValor)}</p>
                </div>
              </div>
            </div>
            <div className="p-8">
              {loadingResidentes ? (
                <div className="text-center py-12 text-gray-500 font-mono text-xs animate-pulse tracking-widest uppercase">Escaneando Registros Formativos...</div>
              ) : residentesFormativos.resumenes.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-gray-600 font-black text-xs tracking-[0.2em] uppercase italic">Sin Actividad Bloqueada</div>
                  <p className="text-gray-500 mt-2 text-sm italic">No se detectaron residentes en horario formativo para este ciclo.</p>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.01]">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                          <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest italic">Médico Residente</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest italic">Cobertura</th>
                          <th className="px-6 py-4 text-xs font-black text-right text-gray-500 uppercase tracking-widest italic">Volumen</th>
                          <th className="px-6 py-4 text-xs font-black text-right text-gray-500 uppercase tracking-widest italic">Cuota Referencial</th>
                          <th className="px-6 py-4 text-xs font-black text-right text-purple-400 uppercase tracking-widest italic">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {residentesFormativos.resumenes.map((resumen, index) => (
                          <tr key={index} className="hover:bg-white/[0.03] transition-colors">
                            <td className="px-6 py-4 text-sm font-bold text-gray-300 uppercase tracking-tight">{resumen.medico_nombre}</td>
                            <td className="px-6 py-4 text-sm text-gray-400 font-medium">{resumen.obra_social}</td>
                            <td className="px-6 py-4 text-sm text-right font-mono text-gray-400 italic">{resumen.cantidad}</td>
                            <td className="px-6 py-4 text-sm text-right font-mono text-gray-400">{formatearMoneda(resumen.valor_unitario)}</td>
                            <td className="px-6 py-4 text-sm text-right font-black text-white font-mono">{formatearMoneda(resumen.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-purple-500/5 border-t border-purple-500/20">
                          <td colSpan={2} className="px-6 py-4 text-[10px] font-black text-purple-400 uppercase tracking-widest italic">Consolidado Formativo</td>
                          <td className="px-6 py-4 text-sm text-right font-black text-purple-400 font-mono italic">{residentesFormativos.totalConsultas}</td>
                          <td className="px-6 py-4"></td>
                          <td className="px-6 py-4 text-2xl text-right font-black text-purple-400 tracking-tighter font-mono">{formatearMoneda(residentesFormativos.totalValor)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></div>
                    <p className="text-[10px] font-bold text-purple-300 leading-none tracking-tight uppercase">
                      Nota: Estos registros son de carácter administrativo y no impactan en la liquidación final de haberes.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : tabActiva === 'excel' ? (
          /* Tab: Excel */
          <div className="space-y-6">
            {loadingExcel ? (
              <div className="text-center py-12 text-gray-500 font-mono text-sm animate-pulse tracking-widest uppercase italic">Decodificando Matriz de Datos...</div>
            ) : !liquidacionActual ? (
              <div
                className="rounded-[32px] p-12 text-center bg-white/[0.02] border border-white/5 backdrop-blur-3xl animate-in zoom-in-95"
              >
                <div className="text-[#FACC15] text-2xl font-black italic uppercase tracking-tighter mb-4">
                  PERÍODO SIN PROCESAR
                </div>
                <div className="text-gray-500 font-medium mb-8 max-w-md mx-auto">
                  No se ha detectado ninguna estructura de liquidación para {MESES.find(m => m.value === mes)?.label || `Mes ${mes}`} {anio}.
                </div>
                <button
                  onClick={() => router.push('/ginecologia')}
                  className="px-8 py-4 rounded-full bg-[#00FF88] text-black font-black text-xs tracking-widest hover:scale-105 transition-all uppercase shadow-[0_0_30px_rgba(0,255,136,0.3)]"
                >
                  Ir a Procesamiento
                </button>
              </div>
            ) : !excelData ? (
              <div className="text-center py-12 text-[#FF3131] font-black text-xs uppercase tracking-widest italic animate-pulse">Error Crítico: Fallo en la Reconstrucción del Archivo</div>
            ) : (
              <div
                className="rounded-[32px] overflow-hidden bg-white/[0.02] border border-white/10 backdrop-blur-3xl animate-in fade-in"
              >
                <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase underline decoration-[#00FF88] decoration-4 underline-offset-8">Visualizador Maestro</h2>
                      <p className="text-gray-500 font-bold text-[10px] tracking-widest uppercase">Motor de Persistencia en Tiempo Real Activo</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/20 text-[#00FF88] text-[10px] font-black tracking-widest uppercase">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse"></div>
                      Auto-Save On
                    </div>
                  </div>
                </div>
                <div className="p-1">
                  <ExcelDataTable
                    data={excelData}
                    especialidad="Ginecología"
                    onCellUpdate={handleCellUpdate}
                    onDeleteRow={handleDeleteRow}
                    liquidacionId={liquidacionActual.id}
                    mes={mes}
                    anio={anio}
                  />
                </div>
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="text-center py-12 text-gray-400">Cargando resúmenes...</div>
        ) : resumenesPorMedico.size === 0 && resumenesPorPrestador.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
            }}
          >
            <div className="text-yellow-400 text-xl font-bold mb-4">
              No hay datos para el período seleccionado
            </div>
            <div className="text-gray-400 mb-6">
              Para generar resúmenes, primero debes:
            </div>
            <ol className="text-left text-gray-300 space-y-2 max-w-md mx-auto mb-6">
              <li>1. Ir a la página de <strong className="text-green-400">Ginecología</strong></li>
              <li>2. Subir un archivo Excel con las consultas</li>
              <li>3. Confirmar el mes y año del período</li>
              <li>4. El sistema guardará automáticamente los datos</li>
            </ol>
            <Button
              onClick={() => router.push('/ginecologia')}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              Ir a Ginecología
            </Button>
          </div>
        ) : tabActiva === 'medicos' ? (
          /* Tab: Resumen por Médico */
          <div className="space-y-6">
            {medicos.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No hay datos para el período seleccionado
              </div>
            ) : (
              medicos.map(medicoNombre => {
                const medicoId = Array.from(resumenesPorMedico.keys()).find(id => {
                  const resumenes = resumenesPorMedico.get(id) || []
                  return resumenes[0]?.medico_nombre === medicoNombre
                })
                const resumenes = medicoId ? resumenesPorMedico.get(medicoId) || [] : []
                const total = resumenes.reduce((sum, r) => sum + r.total, 0)
                const totalCantidad = resumenes.reduce((sum, r) => sum + r.cantidad, 0)

                return (
                  <div
                    key={medicoNombre}
                    className="rounded-[32px] overflow-hidden bg-white/[0.02] border border-white/10 backdrop-blur-3xl p-1[px] group transition-all"
                  >
                    <div className="p-8 bg-black/40 rounded-[31px]">
                      <div className="flex items-center justify-between mb-8">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-[#00D1FF] tracking-[0.3em] uppercase">Profesional de Planta</span>
                          <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase">{medicoNombre}</h2>
                        </div>
                        <button
                          onClick={() => handleExportarPDFMedico(medicoNombre, resumenes)}
                          className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-[#00D1FF] hover:text-black transition-all font-bold text-xs tracking-tighter uppercase"
                        >
                          <FileDown className="h-4 w-4" />
                          Generar Reporte
                        </button>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.01]">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                              <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest italic">Obra Social</th>
                              <th className="px-6 py-4 text-xs font-black text-right text-gray-500 uppercase tracking-widest italic">Cantidad</th>
                              <th className="px-6 py-4 text-xs font-black text-right text-gray-500 uppercase tracking-widest italic">Val. Unitario</th>
                              <th className="px-6 py-4 text-xs font-black text-right text-[#00D1FF] uppercase tracking-widest italic">Consolidado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {resumenes.map((resumen, idx) => (
                              <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                                <td className="px-6 py-4 text-sm font-bold text-gray-300">{resumen.obra_social}</td>
                                <td className="px-6 py-4 text-sm text-center text-gray-400 font-mono italic">{resumen.cantidad}</td>
                                <td className="px-6 py-4 text-sm text-right text-gray-400 font-mono">{formatearMoneda(resumen.valor_unitario)}</td>
                                <td className="px-6 py-4 text-sm text-right font-black text-white">{formatearMoneda(resumen.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-[#00D1FF]/5 border-t border-[#00D1FF]/20">
                              <td className="px-6 py-4 text-sm font-black text-[#00D1FF] uppercase italic">Total Médico</td>
                              <td className="px-6 py-4 text-sm text-center font-black text-[#00D1FF] font-mono italic">{totalCantidad}</td>
                              <td className="px-6 py-4"></td>
                              <td className="px-6 py-4 text-xl text-right font-black text-[#00D1FF] tracking-tighter font-mono">{formatearMoneda(total)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          /* Tab: Resumen por Prestador */
          <div className="space-y-6">
            {resumenesPorPrestador.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No hay datos para el período seleccionado
              </div>
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <Button
                    onClick={handleExportarPDFPrestadores}
                    variant="outline"
                    className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF Completo
                  </Button>
                </div>

                <div
                  className="rounded-[32px] overflow-hidden bg-white/[0.02] border border-white/10 backdrop-blur-3xl animate-in slide-in-from-bottom-4"
                >
                  <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase underline decoration-[#00D1FF] decoration-4 underline-offset-8">Resumen de Prestadores</h2>
                    <div className="px-4 py-1.5 rounded-full bg-[#00D1FF]/10 border border-[#00D1FF]/20 text-[#00D1FF] text-[10px] font-black tracking-widest uppercase">
                      PROVIDER HUB
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                          <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest italic">Prestador / Institución</th>
                          <th className="px-6 py-4 text-xs font-black text-right text-gray-500 uppercase tracking-widest italic">Cantidad</th>
                          <th className="px-6 py-4 text-xs font-black text-right text-gray-500 uppercase tracking-widest italic">Total Bruto</th>
                          <th className="px-6 py-4 text-xs font-black text-right text-gray-500 uppercase tracking-widest italic">Retención 20%</th>
                          <th className="px-6 py-4 text-xs font-black text-right text-[#00D1FF] uppercase tracking-widest italic">Total Neto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {resumenesPorPrestador.map((resumen, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                            <td className="px-6 py-4 text-sm font-bold text-gray-300">{resumen.medico_nombre}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-400 font-mono italic">{resumen.cantidad}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-400 font-mono">{formatearMoneda(resumen.total_bruto)}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-400 font-mono">{formatearMoneda(resumen.retencion_20)}</td>
                            <td className="px-6 py-4 text-sm text-right font-black text-white">{formatearMoneda(resumen.total_neto)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#00D1FF]/5 border-t border-[#00D1FF]/20">
                          <td className="px-6 py-4 text-sm font-black text-[#00D1FF] uppercase italic">Total Consolidado</td>
                          <td className="px-6 py-4 text-sm text-right font-black text-[#00D1FF] font-mono italic">{resumenesPorPrestador.reduce((sum, r) => sum + r.cantidad, 0)}</td>
                          <td className="px-6 py-4 text-sm text-right font-black text-[#00D1FF] font-mono">{formatearMoneda(resumenesPorPrestador.reduce((sum, r) => sum + r.total_bruto, 0))}</td>
                          <td className="px-6 py-4 text-sm text-right font-black text-[#00D1FF] font-mono">{formatearMoneda(resumenesPorPrestador.reduce((sum, r) => sum + r.retencion_20, 0))}</td>
                          <td className="px-6 py-4 text-2xl text-right font-black text-[#00D1FF] tracking-tighter font-mono">{formatearMoneda(resumenesPorPrestador.reduce((sum, r) => sum + r.total_neto, 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div >
    </div >
  )
}

// Componente para mostrar el detalle de una liquidación
function DetalleLiquidacion({ liquidacionId }: { liquidacionId: string }) {
  const [detalles, setDetalles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    cargarDetalles()
  }, [liquidacionId])

  async function cargarDetalles() {
    setLoading(true)
    try {
      // Cargar todos los registros usando paginación
      const todosLosDetalles: any[] = []
      const pageSize = 1000
      let from = 0
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('detalle_guardia')
          .select('*')
          .eq('liquidacion_id', liquidacionId)
          .order('fecha', { ascending: true })
          .order('hora', { ascending: true })
          .range(from, from + pageSize - 1)

        if (error) throw error

        if (!data || data.length === 0) {
          hasMore = false
          break
        }

        todosLosDetalles.push(...data)

        if (data.length < pageSize) {
          hasMore = false
        } else {
          from += pageSize
        }
      }

      setDetalles(todosLosDetalles)
    } catch (error) {
      console.error('Error cargando detalles:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatearMoneda(valor: number | null): string {
    if (!valor) return '$0.00'
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor)
  }

  function formatearFecha(fecha: string | null): string {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-AR')
  }

  if (loading) {
    return <div className="text-center py-4 text-gray-400">Cargando detalles...</div>
  }

  if (detalles.length === 0) {
    return <div className="text-center py-4 text-gray-400">No hay detalles disponibles</div>
  }

  return (
    <div className="mt-8 animate-in slide-in-from-top-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[#00D1FF]/10 rounded-xl">
          <FileSpreadsheet className="h-5 w-5 text-[#00D1FF]" />
        </div>
        <h3 className="text-xl font-black text-white tracking-tighter italic uppercase">
          Análisis de Registros ({detalles.length})
        </h3>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/40 backdrop-blur-3xl shadow-2xl">
        <div className="overflow-x-auto max-h-[500px] no-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-20 bg-black/80 backdrop-blur-md">
              <tr className="border-b border-white/5">
                <th className="px-4 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Fecha</th>
                <th className="px-4 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Hora</th>
                <th className="px-4 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Médico</th>
                <th className="px-4 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Paciente</th>
                <th className="px-4 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">O. Social</th>
                <th className="px-4 py-4 text-[10px] font-black text-right text-gray-500 uppercase tracking-widest italic">Bruto</th>
                <th className="px-4 py-4 text-[10px] font-black text-right text-[#00D1FF] uppercase tracking-widest italic">Neto</th>
                <th className="px-4 py-4 text-[10px] font-black text-center text-gray-500 uppercase tracking-widest italic">Form.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {detalles.map((detalle) => (
                <tr key={detalle.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 text-[11px] font-mono text-gray-400">{formatearFecha(detalle.fecha)}</td>
                  <td className="px-4 py-3 text-[11px] font-mono text-gray-400">{detalle.hora || '-'}</td>
                  <td className="px-4 py-3 text-[11px] font-bold text-gray-300">{detalle.medico_nombre || '-'}</td>
                  <td className="px-4 py-3 text-[11px] text-gray-400 uppercase tracking-tight truncate max-w-[120px]">{detalle.paciente || '-'}</td>
                  <td className="px-4 py-3 text-[11px] text-gray-400 font-bold">{detalle.obra_social || '-'}</td>
                  <td className="px-4 py-3 text-[11px] text-right font-mono text-gray-500">{formatearMoneda(detalle.monto_facturado)}</td>
                  <td className="px-4 py-3 text-[11px] text-right font-black text-white font-mono">{formatearMoneda(detalle.importe_calculado)}</td>
                  <td className="px-4 py-3 text-center">
                    {detalle.es_horario_formativo ? (
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase">SÍ</span>
                    ) : (
                      <span className="text-[9px] font-black text-gray-600 uppercase">NO</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

