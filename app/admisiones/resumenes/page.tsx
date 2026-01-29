'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { calcularResumenPorMedico, calcularTotalGeneral, ResumenPorMedico, calcularResumenPorPrestador, obtenerDetallePacientesPorPrestador, ResumenPorPrestador } from '@/lib/admisiones-resumenes'
import { exportPDFResumenPorPrestador } from '@/lib/pdf-exporter-resumen-prestador-admisiones'
import { exportPDFResumenPrestadorIndividual } from '@/lib/pdf-exporter-resumen-prestador-individual-admisiones'
import { DetalleGuardia } from '@/lib/types'
import { LiquidacionGuardia } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileDown, Download, History, Eye, FileSpreadsheet, Calendar, TrendingUp } from 'lucide-react'
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

export default function ResumenesAdmisionesPage() {
  const router = useRouter()

  const [mes, setMes] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedMes = localStorage.getItem('admisiones_resumenes_mes')
      return savedMes ? parseInt(savedMes, 10) : new Date().getMonth() + 1
    }
    return new Date().getMonth() + 1
  })

  const [anio, setAnio] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedAnio = localStorage.getItem('admisiones_resumenes_anio')
      return savedAnio ? parseInt(savedAnio, 10) : new Date().getFullYear()
    }
    return new Date().getFullYear()
  })
  const [resumenesPorMedico, setResumenesPorMedico] = useState<ResumenPorMedico[]>([])
  const [resumenesPorPrestador, setResumenesPorPrestador] = useState<ResumenPorPrestador[]>([])
  const [detallePacientesPorPrestador, setDetallePacientesPorPrestador] = useState<Map<string, DetalleGuardia[]>>(new Map())
  const [prestadorExpandido, setPrestadorExpandido] = useState<string | null>(null)
  const [loadingDetallePacientes, setLoadingDetallePacientes] = useState<string | null>(null)
  const [historial, setHistorial] = useState<LiquidacionGuardia[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [tabActiva, setTabActiva] = useState<'medicos' | 'prestadores' | 'historial' | 'excel'>('medicos')
  const [liquidacionExpandida, setLiquidacionExpandida] = useState<string | null>(null)
  const [excelData, setExcelData] = useState<ExcelData | null>(null)
  const [liquidacionActual, setLiquidacionActual] = useState<LiquidacionGuardia | null>(null)
  const [loadingExcel, setLoadingExcel] = useState(false)

  // Refs para cambios pendientes y timer de guardado
  const cambiosPendientesRef = useRef<Map<string, { liquidacionId: string; filaExcel: number; columna: string; valor: any }>>(new Map())
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleCellUpdate = useCallback(async (rowIndex: number, column: string, newValue: any) => {
    if (!liquidacionActual || !excelData) return

    // Obtener la fila_excel (ID real en BD)
    const filaExcel = (excelData.rows[rowIndex] as any).__fila_excel ?? (rowIndex + 1)

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
      const promesas = cambios.map(async (cambio) => {
        const updateData: any = {}
        const col = cambio.columna.toLowerCase().trim()

        // Mapear columnas de Admisiones a BD
        if (col.includes('responsable') || col.includes('medico')) {
          updateData.medico_nombre = cambio.valor
        } else if (col.includes('paciente')) {
          updateData.paciente = cambio.valor
        }

        updateData.updated_at = new Date().toISOString()

        // @ts-ignore
        const { error } = await (supabase.from('detalle_guardia') as any)
          .update(updateData)
          .eq('liquidacion_id', liquidacionActual.id)
          .eq('fila_excel', cambio.filaExcel)

        if (error) throw error
      })

      await Promise.all(promesas)
      cambiosPendientesRef.current.clear()
    } catch (error) {
      console.error('Error guardando cambios:', error)
    }
  }

  const handleDeleteRow = useCallback(async (rowIndex: number) => {
    if (!liquidacionActual || !excelData) return

    const row = excelData.rows[rowIndex]
    if (!row) return
    const filaExcel = (row as any).__fila_excel ?? (rowIndex + 1)

    try {
      const { error } = await supabase
        .from('detalle_guardia')
        .delete()
        .eq('liquidacion_id', liquidacionActual.id)
        .eq('fila_excel', filaExcel)

      if (error) throw error

      // Recargar ExcelData para asegurar sincronización
      const excelDataRecargado = await cargarExcelDataDesdeBD(liquidacionActual.id, supabase)
      if (excelDataRecargado) {
        setExcelData(excelDataRecargado)
      }

      await actualizarTotalesLiquidacion()
    } catch (error) {
      console.error('Error eliminando fila:', error)
    }
  }, [liquidacionActual, excelData])

  // Nueva función para eliminar múltiples filas en una sola llamada
  const handleDeleteRows = useCallback(async (indices: number[]) => {
    if (!liquidacionActual || !excelData) return

    const filasExcel = indices
      .map(idx => (excelData.rows[idx] as any)?.__fila_excel)
      .filter((f): f is number => f !== null && f !== undefined)

    if (filasExcel.length === 0) return

    try {
      const { error } = await supabase
        .from('detalle_guardia')
        .delete()
        .eq('liquidacion_id', liquidacionActual.id)
        .in('fila_excel', filasExcel)

      if (error) throw error

      const excelDataRecargado = await cargarExcelDataDesdeBD(liquidacionActual.id, supabase)
      if (excelDataRecargado) {
        setExcelData(excelDataRecargado)
      }

      await actualizarTotalesLiquidacion()
    } catch (error) {
      console.error('Error eliminando filas:', error)
    }
  }, [liquidacionActual, excelData])

  const actualizarTotalesLiquidacion = async () => {
    if (!liquidacionActual) return

    const { data: detalles } = await supabase
      .from('detalle_guardia')
      .select('importe_calculado, monto_facturado')
      .eq('liquidacion_id', liquidacionActual.id) as { data: any[] | null }

    if (detalles) {
      const totalConsultas = detalles.length
      const totalBruto = detalles.reduce((sum, d) => sum + (d.monto_facturado || 0), 0)
      const totalNeto = detalles.reduce((sum, d) => sum + (d.importe_calculado || 0), 0)

      // @ts-ignore
      await (supabase.from('liquidaciones_guardia') as any)
        .update({
          total_consultas: totalConsultas,
          total_bruto: totalBruto,
          total_neto: totalNeto
        })
        .eq('id', liquidacionActual.id)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admisiones_resumenes_mes', mes.toString())
      localStorage.setItem('admisiones_resumenes_anio', anio.toString())
    }
  }, [mes, anio])

  useEffect(() => {
    if (tabActiva === 'historial') {
      cargarHistorial()
    } else if (tabActiva === 'excel') {
      cargarExcelData()
    } else {
      cargarResumenes()
    }
  }, [mes, anio, tabActiva])

  const cargarExcelData = useCallback(async () => {
    setLoadingExcel(true)
    try {
      const { data: liquidacion } = await supabase
        .from('liquidaciones_guardia')
        .select('*')
        .eq('especialidad', 'Admisiones Clínicas')
        .eq('mes', mes)
        .eq('anio', anio)
        .maybeSingle()

      if (liquidacion && (liquidacion as any).id) {
        setLiquidacionActual(liquidacion as LiquidacionGuardia)
        const excelDataCargado = await cargarExcelDataDesdeBD((liquidacion as any).id, supabase)
        setExcelData(excelDataCargado)
      } else {
        setLiquidacionActual(null)
        setExcelData(null)
      }
    } catch (error) {
      console.error('Error cargando Excel data:', error)
      setExcelData(null)
    } finally {
      setLoadingExcel(false)
    }
  }, [mes, anio])

  const cargarResumenes = useCallback(async () => {
    setLoading(true)
    try {
      const { data: liquidacion } = await supabase
        .from('liquidaciones_guardia')
        .select('id')
        .eq('especialidad', 'Admisiones Clínicas')
        .eq('mes', mes)
        .eq('anio', anio)
        .maybeSingle()

      if (!liquidacion || !(liquidacion as any).id) {
        setResumenesPorMedico([])
        setResumenesPorPrestador([])
        return
      }

      const liquidacionId = (liquidacion as any).id
      const resumenes = await calcularResumenPorMedico(mes, anio, liquidacionId)
      setResumenesPorMedico(resumenes)

      const resumenPrestadores = await calcularResumenPorPrestador(mes, anio, liquidacionId)
      setResumenesPorPrestador(resumenPrestadores)
    } catch (error) {
      console.error('Error cargando resúmenes:', error)
    } finally {
      setLoading(false)
    }
  }, [mes, anio])

  const cargarHistorial = useCallback(async () => {
    setLoadingHistorial(true)
    try {
      const { data, error } = await supabase
        .from('liquidaciones_guardia')
        .select('*')
        .eq('especialidad', 'Admisiones Clínicas')
        .order('anio', { ascending: false })
        .order('mes', { ascending: false })

      if (error) throw error
      setHistorial((data || []) as any)
    } catch (error) {
      console.error('Error cargando historial:', error)
    } finally {
      setLoadingHistorial(false)
    }
  }, [])

  const totalGeneral = calcularTotalGeneral(resumenesPorMedico)

  const cargarDetallePacientes = useCallback(async (prestador: ResumenPorPrestador) => {
    const clave = prestador.medico_id || prestador.medico_nombre
    if (detallePacientesPorPrestador.has(clave)) {
      setPrestadorExpandido(prestadorExpandido === clave ? null : clave)
      return
    }

    setLoadingDetallePacientes(clave)
    try {
      const { data: liquidacion } = await supabase
        .from('liquidaciones_guardia')
        .select('id')
        .eq('especialidad', 'Admisiones Clínicas')
        .eq('mes', mes)
        .eq('anio', anio)
        .maybeSingle()

      const liquidacionId = liquidacion ? (liquidacion as any).id : undefined
      const detalles = await obtenerDetallePacientesPorPrestador(prestador.medico_id, prestador.medico_nombre, mes, anio, liquidacionId)

      setDetallePacientesPorPrestador(prev => {
        const nuevo = new Map(prev)
        nuevo.set(clave, detalles)
        return nuevo
      })
      setPrestadorExpandido(clave)
    } catch (error) {
      console.error('Error cargando detalle de pacientes:', error)
    } finally {
      setLoadingDetallePacientes(null)
    }
  }, [mes, anio, prestadorExpandido, detallePacientesPorPrestador])

  function handleExportarPDFPrestadores() {
    exportPDFResumenPorPrestador({ resumenes: resumenesPorPrestador, mes, anio })
  }

  async function handleExportarPDFPrestadorIndividual(prestador: ResumenPorPrestador) {
    try {
      const { data: liquidacion } = await supabase
        .from('liquidaciones_guardia')
        .select('id')
        .eq('especialidad', 'Admisiones Clínicas')
        .eq('mes', mes)
        .eq('anio', anio)
        .maybeSingle()

      const liquidacionId = liquidacion ? (liquidacion as any).id : undefined
      const detalles = await obtenerDetallePacientesPorPrestador(prestador.medico_id, prestador.medico_nombre, mes, anio, liquidacionId)

      exportPDFResumenPrestadorIndividual({
        prestadorNombre: prestador.medico_nombre,
        detalles,
        mes,
        anio,
        cantidad: prestador.cantidad,
        valorUnitario: prestador.valor_unitario,
        total: prestador.total
      })
    } catch (error) {
      console.error('Error exportando PDF individual:', error)
    }
  }

  function formatearMoneda(valor: number | null): string {
    if (valor === null || valor === undefined) return '$0,00'
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(valor)
  }

  function formatearFecha(fecha: string | null): string {
    if (!fecha) return '-'
    try {
      return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch { return fecha }
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Fondo con auroras de servidor GrowLabs */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00FF88]/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00FF88]/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Header Premium */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 animate-in slide-in-from-top-4 duration-700">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/20 text-[#00FF88] text-xs font-bold tracking-widest uppercase">
              <History className="h-3 w-3" />
              Intelligence Hub
            </div>
            <h1 className="text-6xl font-black tracking-tighter leading-none">
              RESÚMENES<br />
              <span className="text-[#00FF88] italic uppercase">Admisiones</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-md font-medium leading-relaxed">
              Análisis profundo de liquidaciones por médico, prestador e histórico de producción.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => router.push('/admisiones')}
              className="group flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-bold text-sm tracking-tight"
            >
              <ArrowLeft className="h-4 w-4 text-gray-400 group-hover:text-white group-hover:-translate-x-1 transition-all" />
              VOLVER
            </button>
            <div className="flex bg-white/5 backdrop-blur-md border border-white/10 rounded-full p-1.5 gap-2">
              <select
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value))}
                className="bg-transparent border-none text-white font-bold text-xs px-6 focus:outline-none cursor-pointer uppercase tracking-widest"
              >
                {MESES.map(m => (
                  <option key={m.value} value={m.value} className="text-black bg-white">{m.label}</option>
                ))}
              </select>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(parseInt(e.target.value, 10) || anio)}
                className="bg-black border border-white/10 rounded-full w-24 py-1.5 px-4 text-sm font-bold focus:border-[#00FF88]/50 outline-none text-center"
              />
            </div>
          </div>
        </div>

        {/* Tabs Premium */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full w-fit mb-12 animate-in fade-in slide-in-from-bottom-2 duration-1000 no-scrollbar">
          <button
            onClick={() => setTabActiva('medicos')}
            className={`px-8 py-3 rounded-full font-black text-xs whitespace-nowrap tracking-tighter transition-all flex items-center gap-2 ${tabActiva === 'medicos'
              ? 'bg-[#00FF88] text-black shadow-[0_0_20px_rgba(0,255,136,0.3)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <TrendingUp className="h-4 w-4" />
            RESUMEN MÉDICO
          </button>
          <button
            onClick={() => setTabActiva('prestadores')}
            className={`px-8 py-3 rounded-full font-black text-xs whitespace-nowrap tracking-tighter transition-all flex items-center gap-2 ${tabActiva === 'prestadores'
              ? 'bg-[#00FF88] text-black shadow-[0_0_20px_rgba(0,255,136,0.3)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <Eye className="h-4 w-4" />
            RESUMEN PRESTADOR
          </button>
          <button
            onClick={() => setTabActiva('historial')}
            className={`px-8 py-3 rounded-full font-black text-xs whitespace-nowrap tracking-tighter transition-all flex items-center gap-2 ${tabActiva === 'historial'
              ? 'bg-[#00FF88] text-black shadow-[0_0_20px_rgba(0,255,136,0.3)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <History className="h-4 w-4" />
            HISTORIAL
          </button>
          <button
            onClick={() => setTabActiva('excel')}
            className={`px-8 py-3 rounded-full font-black text-xs whitespace-nowrap tracking-tighter transition-all flex items-center gap-2 ${tabActiva === 'excel'
              ? 'bg-[#00FF88] text-black shadow-[0_0_20px_rgba(0,255,136,0.3)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            DATA ORIGINAL
          </button>
        </div>

        {/* Content Area */}
        <div className="relative">
          {tabActiva === 'prestadores' && (
            <div className="rounded-[32px] border border-white/10 bg-[#000000]/50 backdrop-blur-3xl p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center border-b border-white/5 pb-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black tracking-tight">VISTA POR <span className="text-[#00FF88]">PRESTADORES</span></h2>
                  <p className="text-gray-500 text-xs font-mono uppercase tracking-[0.2em]">Liquidación Consolidada</p>
                </div>
                <Button
                  onClick={handleExportarPDFPrestadores}
                  className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-black rounded-xl px-8 shadow-lg shadow-[#00FF88]/20 transition-all hover:scale-105"
                >
                  <Download className="h-4 w-4 mr-2" />
                  EXPORTAR TODO
                </Button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="h-12 w-12 border-2 border-t-[#00FF88] border-white/10 rounded-full animate-spin"></div>
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Sincronizando registros...</span>
                </div>
              ) : resumenesPorPrestador.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                  <p className="text-gray-500 font-mono italic uppercase tracking-widest">No se encontraron liquidaciones para {MESES[mes - 1]?.label}</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.01]">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                      <tr>
                        <th className="px-8 py-5">Prestador</th>
                        <th className="px-8 py-5 text-right font-mono">Cantidad</th>
                        <th className="px-8 py-5 text-right font-mono">Unitario</th>
                        <th className="px-8 py-5 text-right font-mono text-[#00FF88]">Total</th>
                        <th className="px-8 py-5 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {resumenesPorPrestador.map((resumen, idx) => {
                        const clave = resumen.medico_id || resumen.medico_nombre
                        const estaExpandido = prestadorExpandido === clave
                        const detalles = detallePacientesPorPrestador.get(clave) || []
                        const estaCargando = loadingDetallePacientes === clave

                        return (
                          <React.Fragment key={idx}>
                            <tr className={`hover:bg-white/[0.03] transition-colors ${estaExpandido ? 'bg-[#00FF88]/5' : ''}`}>
                              <td className="px-8 py-5">
                                <span className={`font-bold tracking-tight ${estaExpandido ? 'text-[#00FF88]' : 'text-white'}`}>
                                  {resumen.medico_nombre}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-right font-mono font-bold">{resumen.cantidad}</td>
                              <td className="px-8 py-5 text-right font-mono text-gray-400">{formatearMoneda(resumen.valor_unitario)}</td>
                              <td className="px-8 py-5 text-right font-mono font-black text-[#00FF88] scale-110 origin-right transition-transform">
                                {formatearMoneda(resumen.total)}
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    onClick={() => cargarDetallePacientes(resumen)}
                                    variant="ghost"
                                    size="sm"
                                    className={`rounded-lg transition-all ${estaExpandido ? 'bg-[#00FF88] text-black' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    onClick={() => handleExportarPDFPrestadorIndividual(resumen)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-500 hover:text-[#00FF88] hover:bg-[#00FF88]/10 rounded-lg"
                                  >
                                    <FileDown className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            {estaExpandido && (
                              <tr className="bg-[#00FF88]/[0.02]">
                                <td colSpan={5} className="p-0 border-none">
                                  <div className="px-8 py-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="rounded-2xl border border-[#00FF88]/20 bg-black/40 overflow-hidden">
                                      <table className="w-full text-xs">
                                        <thead className="bg-[#00FF88]/10 text-[9px] font-black text-[#00FF88] uppercase tracking-[0.3em]">
                                          <tr>
                                            <th className="px-6 py-4">Fecha</th>
                                            <th className="px-6 py-4">Paciente</th>
                                            <th className="px-6 py-4 text-right">Monto Unitario</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                          {detalles.map((detalle) => (
                                            <tr key={detalle.id} className="hover:bg-[#00FF88]/5 transition-colors">
                                              <td className="px-6 py-4 font-mono text-gray-500">{formatearFecha(detalle.fecha)}</td>
                                              <td className="px-6 py-4 font-bold text-gray-300">{detalle.paciente || '---'}</td>
                                              <td className="px-6 py-4 text-right font-mono font-bold text-[#00FF88]">
                                                {formatearMoneda(detalle.importe_calculado || detalle.monto_facturado)}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot className="bg-[#00FF88]/5">
                                          <tr>
                                            <td colSpan={2} className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-[#00FF88]">Total Consolidado</td>
                                            <td className="px-6 py-4 text-right font-mono font-black text-xl text-[#00FF88]">
                                              {formatearMoneda(resumen.total)}
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tabActiva === 'medicos' && (
            <div className="rounded-[32px] border border-white/10 bg-[#000000]/50 backdrop-blur-3xl p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black tracking-tight">TABLERO <span className="text-[#00FF88]">FINANCIERO</span></h2>
                  <p className="text-gray-500 text-xs font-mono uppercase tracking-[0.2em]">Agregación por Médico Responsable</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Admisiones</span>
                  <div className="text-4xl font-black text-white leading-none">{totalGeneral.totalCantidad}</div>
                </div>
                <div className="p-6 rounded-2xl bg-[#00FF88]/5 border border-[#00FF88]/10 space-y-2">
                  <span className="text-[10px] font-black text-[#00FF88] uppercase tracking-widest">Total Liquidado</span>
                  <div className="text-4xl font-black text-[#00FF88] leading-none transition-all hover:scale-105 origin-left">
                    {formatearMoneda(totalGeneral.totalMonto)}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.01]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                    <tr>
                      <th className="px-8 py-5">Médico Responsable</th>
                      <th className="px-8 py-5 text-right font-mono">Admisiones</th>
                      <th className="px-8 py-5 text-right font-mono">Valor Fijo</th>
                      <th className="px-8 py-5 text-right font-mono text-[#00FF88]">Total Acumulado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {resumenesPorMedico.map((resumen, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.03] transition-colors group">
                        <td className="px-8 py-5">
                          <span className="font-bold tracking-tight text-white group-hover:text-[#00FF88] transition-colors">{resumen.medico_nombre}</span>
                        </td>
                        <td className="px-8 py-5 text-right font-mono font-bold">{resumen.cantidad}</td>
                        <td className="px-8 py-5 text-right font-mono text-gray-500">{formatearMoneda(resumen.valor_unitario)}</td>
                        <td className="px-8 py-5 text-right font-mono font-black text-[#00FF88]">{formatearMoneda(resumen.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tabActiva === 'historial' && (
            <div className="rounded-[32px] border border-white/10 bg-[#000000]/50 backdrop-blur-3xl p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black tracking-tight">LÍNEA DE TIEMPO <span className="text-[#00FF88]">HISTÓRICA</span></h2>
                  <p className="text-gray-500 text-xs font-mono uppercase tracking-[0.2em]">Registro Maestro de Liquidaciones</p>
                </div>
              </div>

              {loadingHistorial ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="h-12 w-12 border-2 border-t-[#00FF88] border-white/10 rounded-full animate-spin"></div>
                </div>
              ) : historial.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                  <p className="text-gray-500 font-mono italic uppercase tracking-widest">El historial de auditoría está vacío</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {historial.map((liq) => (
                    <div
                      key={liq.id}
                      onClick={() => { setMes(liq.mes); setAnio(liq.anio); setTabActiva('medicos'); }}
                      className="group p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-[#00FF88]/50 hover:bg-[#00FF88]/5 transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="h-4 w-4 text-[#00FF88]" />
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-white/5 rounded-xl text-gray-400 group-hover:text-[#00FF88] transition-colors">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-black text-white uppercase tracking-tight">{MESES[liq.mes - 1]?.label} {liq.anio}</h4>
                            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Liquidación Finalizada</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-end border-t border-white/5 pt-4">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Admisiones</span>
                            <span className="text-lg font-black text-white">{liq.total_consultas}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Monto Total</span>
                            <span className="text-lg font-black text-[#00FF88]">{formatearMoneda(liq.total_neto)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tabActiva === 'excel' && (
            <div className="rounded-[32px] border border-white/10 bg-[#000000]/50 backdrop-blur-3xl p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black tracking-tight">NÚCLEO DE <span className="text-[#00FF88]">DATOS</span></h2>
                  <p className="text-gray-500 text-xs font-mono uppercase tracking-[0.2em]">Inspección Técnica Excel Original</p>
                </div>
              </div>

              {loadingExcel ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="h-12 w-12 border-2 border-t-[#00FF88] rounded-full animate-spin"></div>
                </div>
              ) : !excelData ? (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                  <p className="text-gray-500 font-mono italic uppercase tracking-widest">Sin datos de origen para este periodo</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/40">
                  <ExcelDataTable
                    data={excelData}
                    especialidad="Admisiones Clínicas"
                    liquidacionId={liquidacionActual?.id}
                    mes={mes}
                    anio={anio}
                    onCellUpdate={handleCellUpdate}
                    onDeleteRow={handleDeleteRow}
                    onDeleteRows={handleDeleteRows}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


