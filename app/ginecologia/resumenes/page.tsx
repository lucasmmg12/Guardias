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
            const { data: detalleActual } = await supabase
              .from('detalle_guardia')
              .select('es_horario_formativo')
              .eq('liquidacion_id', liquidacionActual.id)
              .eq('fila_excel', filaExcel)
              .maybeSingle()
            
            const esHorarioFormativo = detalleActual?.es_horario_formativo || false
            
            // Cargar valor de consulta para la nueva obra social
            const { data: valorConsulta } = await supabase
              .from('valores_consultas_obra_social')
              .select('valor')
              .eq('tipo_consulta', 'CONSULTA GINECOLOGICA')
              .eq('mes', mes)
              .eq('anio', anio)
              .eq('obra_social', nuevaObraSocial)
              .maybeSingle()
            
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
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/ginecologia')}
              variant="outline"
              className="border-green-500/50 text-green-400 hover:bg-green-500/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <h1 className="text-3xl font-bold text-green-400">
              Resúmenes de Liquidación - Ginecología
            </h1>
          </div>
        </div>

        {/* Selector de Mes y Año */}
        <div 
          className="flex items-center gap-4 p-4 rounded-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">Mes:</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="px-3 py-2 bg-gray-800 border border-green-500/50 rounded-lg text-white focus:border-green-400 focus:outline-none"
            >
              {MESES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">Año:</label>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="px-3 py-2 bg-gray-800 border border-green-500/50 rounded-lg text-white w-24 focus:border-green-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => setTabActiva('medicos')}
            className={`px-4 py-2 font-semibold transition-colors ${
              tabActiva === 'medicos'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Resumen por Médico
          </button>
          <button
            onClick={() => setTabActiva('prestadores')}
            className={`px-4 py-2 font-semibold transition-colors ${
              tabActiva === 'prestadores'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Resumen por Prestador
          </button>
          <button
            onClick={() => setTabActiva('historial')}
            className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${
              tabActiva === 'historial'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <History className="h-4 w-4" />
            Historial
          </button>
          <button
            onClick={() => setTabActiva('residentes')}
            className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${
              tabActiva === 'residentes'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Residentes Formativos
          </button>
          <button
            onClick={() => setTabActiva('excel')}
            className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${
              tabActiva === 'excel'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
        </div>

        {/* Contenido de Tabs */}
        {tabActiva === 'historial' ? (
          /* Tab: Historial */
          <div className="space-y-6">
            {loadingHistorial ? (
              <div className="text-center py-12 text-gray-400">Cargando historial...</div>
            ) : historial.length === 0 ? (
              <div 
                className="rounded-xl p-8 text-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                }}
              >
                <div className="text-yellow-400 text-xl font-bold mb-4">
                  No hay liquidaciones procesadas
                </div>
                <div className="text-gray-400 mb-6">
                  Aún no se ha procesado ningún archivo Excel de Ginecología.
                </div>
                <Button
                  onClick={() => router.push('/ginecologia')}
                  className="bg-green-600 hover:bg-green-500 text-white"
                >
                  Ir a Ginecología
                </Button>
              </div>
            ) : (
              <div
                className="rounded-xl p-6"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                }}
              >
                <h2 className="text-2xl font-bold text-green-400 mb-4">Historial de Liquidaciones</h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-green-400">Período</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-green-400">N° Liquidación</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-green-400">Archivo</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-green-400">Estado</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-green-400">Consultas</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-green-400">Total Bruto</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-green-400">Total Neto</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-green-400">Fecha Procesamiento</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-green-400">Acciones</th>
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
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  liquidacion.estado === 'finalizada' 
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
            className="rounded-xl p-6"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(59, 130, 246, 0.3)', // Azul para residentes
            }}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-blue-400 mb-2">
                Consultas de Residentes en Horario Formativo
              </h2>
              <p className="text-gray-400 text-sm mb-2">
                Estas consultas son de residentes realizadas entre lunes a sábado de 07:00 a 15:00. 
                <strong className="text-yellow-400"> NO se deben pagar</strong> según las reglas del sistema, 
                pero se contabilizan para administración.
              </p>
              <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-blue-300 text-sm mb-1">
                      <strong>Total de consultas:</strong>
                    </p>
                    <p className="text-blue-200 text-2xl font-bold">
                      {residentesFormativos.totalConsultas} consultas
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-300 text-sm mb-1">
                      <strong>Valor total (no pagado):</strong>
                    </p>
                    <p className="text-blue-200 text-2xl font-bold">
                      {formatearMoneda(residentesFormativos.totalValor)}
                    </p>
                  </div>
                </div>
                <p className="text-blue-300 text-xs mt-3 pt-3 border-t border-blue-500/30">
                  Estas consultas <strong>NO aparecen</strong> en los resúmenes por médico, 
                  ya que los residentes no deben verlas en sus liquidaciones.
                </p>
              </div>
            </div>

            {loadingResidentes ? (
              <div className="text-center py-12 text-gray-400">Cargando resumen...</div>
            ) : residentesFormativos.resumenes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No hay consultas de residentes en horario formativo para este período
              </div>
            ) : (
              <div className="space-y-4">
                {/* Resumen agrupado por residente y obra social */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 bg-white/5">Residente</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 bg-white/5">Obra Social</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 bg-white/5">Cantidad</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 bg-white/5">Valor Unitario</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 bg-white/5">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {residentesFormativos.resumenes.map((resumen, index) => (
                        <tr
                          key={index}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 py-3 text-gray-300">
                            {resumen.medico_nombre}
                          </td>
                          <td className="px-4 py-3 text-gray-300">
                            {resumen.obra_social}
                          </td>
                          <td className="px-4 py-3 text-gray-300 text-right">
                            {resumen.cantidad}
                          </td>
                          <td className="px-4 py-3 text-gray-300 text-right">
                            {formatearMoneda(resumen.valor_unitario)}
                          </td>
                          <td className="px-4 py-3 text-gray-300 text-right font-semibold">
                            {formatearMoneda(resumen.total)}
                          </td>
                        </tr>
                      ))}
                      {/* Fila de totales */}
                      <tr className="border-t-2 border-blue-400/50 bg-blue-500/10">
                        <td colSpan={2} className="px-4 py-3 text-gray-200 font-bold">
                          TOTAL
                        </td>
                        <td className="px-4 py-3 text-gray-200 text-right font-bold">
                          {residentesFormativos.totalConsultas}
                        </td>
                        <td className="px-4 py-3 text-gray-200 text-right">
                          -
                        </td>
                        <td className="px-4 py-3 text-blue-300 text-right font-bold text-lg">
                          {formatearMoneda(residentesFormativos.totalValor)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : tabActiva === 'excel' ? (
          /* Tab: Excel */
          <div className="space-y-6">
            {loadingExcel ? (
              <div className="text-center py-12 text-gray-400">Cargando Excel...</div>
            ) : !liquidacionActual ? (
              <div 
                className="rounded-xl p-8 text-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                }}
              >
                <div className="text-yellow-400 text-xl font-bold mb-4">
                  No hay liquidación para este período
                </div>
                <div className="text-gray-400 mb-6">
                  No se ha procesado ningún archivo Excel para {MESES.find(m => m.value === mes)?.label || `Mes ${mes}`} {anio}.
                </div>
                <Button
                  onClick={() => router.push('/ginecologia')}
                  className="bg-green-600 hover:bg-green-500 text-white"
                >
                  Ir a Ginecología para procesar archivo
                </Button>
              </div>
            ) : !excelData ? (
              <div className="text-center py-12 text-gray-400">No se pudo cargar el Excel</div>
            ) : (
              <div 
                className="rounded-xl p-6"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                }}
              >
                <h2 className="text-2xl font-bold text-green-400 mb-4">
                  Excel - {MESES.find(m => m.value === mes)?.label || `Mes ${mes}`} {anio}
                </h2>
                <p className="text-gray-400 mb-4 text-sm">
                  Los cambios se guardan automáticamente. Revisa duplicados, filas sin obra social y sin horario.
                </p>
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
                    className="rounded-xl p-6"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-green-400">{medicoNombre}</h2>
                      <Button
                        onClick={() => handleExportarPDFMedico(medicoNombre, resumenes)}
                        variant="outline"
                        className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        Exportar PDF
                      </Button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-green-400">Obra social</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-green-400">Cantidad</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-green-400">Valor unitario</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-green-400">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumenes.map((resumen, idx) => (
                            <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
                              <td className="px-4 py-3 text-sm text-gray-300">{resumen.obra_social}</td>
                              <td className="px-4 py-3 text-sm text-gray-300 text-right">{resumen.cantidad}</td>
                              <td className="px-4 py-3 text-sm text-gray-300 text-right">{formatearMoneda(resumen.valor_unitario)}</td>
                              <td className="px-4 py-3 text-sm text-gray-300 text-right font-semibold">{formatearMoneda(resumen.total)}</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-800/50 font-bold">
                            <td className="px-4 py-3 text-sm text-green-400">TOTAL</td>
                            <td className="px-4 py-3 text-sm text-green-400 text-right">{totalCantidad}</td>
                            <td className="px-4 py-3 text-sm text-green-400 text-right"></td>
                            <td className="px-4 py-3 text-sm text-green-400 text-right">{formatearMoneda(total)}</td>
                          </tr>
                        </tbody>
                      </table>
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
                  className="rounded-xl p-6"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                  }}
                >
                  <h2 className="text-2xl font-bold text-green-400 mb-4">Resumen por Prestador</h2>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-green-400">Prestador</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-green-400">Cantidad</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-green-400">Total bruto</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-green-400">Retención 20%</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-green-400">Total Neto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumenesPorPrestador.map((resumen, idx) => (
                          <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
                            <td className="px-4 py-3 text-sm text-gray-300 font-medium">{resumen.medico_nombre}</td>
                            <td className="px-4 py-3 text-sm text-gray-300 text-right">{resumen.cantidad}</td>
                            <td className="px-4 py-3 text-sm text-gray-300 text-right">{formatearMoneda(resumen.total_bruto)}</td>
                            <td className="px-4 py-3 text-sm text-gray-300 text-right">{formatearMoneda(resumen.retencion_20)}</td>
                            <td className="px-4 py-3 text-sm text-gray-300 text-right font-semibold">{formatearMoneda(resumen.total_neto)}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-800/50 font-bold">
                          <td className="px-4 py-3 text-sm text-green-400">Total general</td>
                          <td className="px-4 py-3 text-sm text-green-400 text-right">
                            {resumenesPorPrestador.reduce((sum, r) => sum + r.cantidad, 0)}
                          </td>
                          <td className="px-4 py-3 text-sm text-green-400 text-right">
                            {formatearMoneda(resumenesPorPrestador.reduce((sum, r) => sum + r.total_bruto, 0))}
                          </td>
                          <td className="px-4 py-3 text-sm text-green-400 text-right">
                            {formatearMoneda(resumenesPorPrestador.reduce((sum, r) => sum + r.retencion_20, 0))}
                          </td>
                          <td className="px-4 py-3 text-sm text-green-400 text-right">
                            {formatearMoneda(resumenesPorPrestador.reduce((sum, r) => sum + r.total_neto, 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
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
    <div className="mt-4">
      <h3 className="text-lg font-semibold text-green-400 mb-3">
        Detalle de Consultas ({detalles.length} registros)
      </h3>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-900">
            <tr className="border-b border-gray-700">
              <th className="px-3 py-2 text-left text-xs font-semibold text-green-400">Fecha</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-green-400">Hora</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-green-400">Médico</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-green-400">Paciente</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-green-400">Obra Social</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-green-400">Monto Facturado</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-green-400">Importe Calculado</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-green-400">Horario Formativo</th>
            </tr>
          </thead>
          <tbody>
            {detalles.map((detalle) => (
              <tr key={detalle.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                <td className="px-3 py-2 text-xs text-gray-300">{formatearFecha(detalle.fecha)}</td>
                <td className="px-3 py-2 text-xs text-gray-300">{detalle.hora || '-'}</td>
                <td className="px-3 py-2 text-xs text-gray-300">{detalle.medico_nombre || '-'}</td>
                <td className="px-3 py-2 text-xs text-gray-300">{detalle.paciente || '-'}</td>
                <td className="px-3 py-2 text-xs text-gray-300">{detalle.obra_social || '-'}</td>
                <td className="px-3 py-2 text-xs text-gray-300 text-right">{formatearMoneda(detalle.monto_facturado)}</td>
                <td className="px-3 py-2 text-xs text-gray-300 text-right font-semibold">{formatearMoneda(detalle.importe_calculado)}</td>
                <td className="px-3 py-2 text-xs text-center">
                  {detalle.es_horario_formativo ? (
                    <span className="text-yellow-400">Sí</span>
                  ) : (
                    <span className="text-gray-500">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

