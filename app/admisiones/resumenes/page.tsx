'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { calcularResumenPorMedico, calcularTotalGeneral, ResumenPorMedico, calcularResumenPorPrestador, obtenerDetallePacientesPorPrestador, ResumenPorPrestador } from '@/lib/admisiones-resumenes'
import { exportPDFResumenPorPrestador } from '@/lib/pdf-exporter-resumen-prestador-admisiones'
import { exportPDFResumenPrestadorIndividual } from '@/lib/pdf-exporter-resumen-prestador-individual-admisiones'
import { DetalleGuardia } from '@/lib/types'
import { LiquidacionGuardia } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileDown, Download, History, Eye, FileSpreadsheet } from 'lucide-react'
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

  // Guardar mes y año en localStorage cuando cambian
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

  // Cargar ExcelData desde la liquidación del mes seleccionado
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
      // Obtener liquidación específica de Admisiones para trabajar solo con ese archivo
      const { data: liquidacion } = await supabase
        .from('liquidaciones_guardia')
        .select('id')
        .eq('especialidad', 'Admisiones Clínicas')
        .eq('mes', mes)
        .eq('anio', anio)
        .maybeSingle()

      if (!liquidacion || !(liquidacion as any).id) {
        console.warn(`[Admisiones Resúmenes] No se encontró liquidación de Admisiones Clínicas para ${mes}/${anio}`)
        setResumenesPorMedico([])
        setResumenesPorPrestador([])
        return
      }

      const liquidacionId = (liquidacion as any).id
      console.log(`[Admisiones Resúmenes] Liquidación ID: ${liquidacionId}`)
      
      // Calcular resumen por médico
      const resumenes = await calcularResumenPorMedico(mes, anio, liquidacionId)
      setResumenesPorMedico(resumenes)

      // Calcular resumen por prestador
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
      setHistorial((data || []) as LiquidacionGuardia[])
    } catch (error) {
      console.error('Error cargando historial:', error)
    } finally {
      setLoadingHistorial(false)
    }
  }, [])

  const totalGeneral = calcularTotalGeneral(resumenesPorMedico)

  // Función para cargar detalle de pacientes por prestador
  const cargarDetallePacientes = useCallback(async (prestador: ResumenPorPrestador) => {
    const clave = prestador.medico_id || prestador.medico_nombre
    
    // Si ya está cargado, no volver a cargar
    if (detallePacientesPorPrestador.has(clave)) {
      setPrestadorExpandido(prestadorExpandido === clave ? null : clave)
      return
    }

    setLoadingDetallePacientes(clave)
    try {
      // Obtener liquidación específica
      const { data: liquidacion } = await supabase
        .from('liquidaciones_guardia')
        .select('id')
        .eq('especialidad', 'Admisiones Clínicas')
        .eq('mes', mes)
        .eq('anio', anio)
        .maybeSingle()

      const liquidacionId = liquidacion ? (liquidacion as any).id : undefined
      
      const detalles = await obtenerDetallePacientesPorPrestador(
        prestador.medico_id,
        prestador.medico_nombre,
        mes,
        anio,
        liquidacionId
      )

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
    exportPDFResumenPorPrestador({
      resumenes: resumenesPorPrestador,
      mes,
      anio
    })
  }

  async function handleExportarPDFPrestadorIndividual(prestador: ResumenPorPrestador) {
    try {
      // Obtener liquidación específica
      const { data: liquidacion } = await supabase
        .from('liquidaciones_guardia')
        .select('id')
        .eq('especialidad', 'Admisiones Clínicas')
        .eq('mes', mes)
        .eq('anio', anio)
        .maybeSingle()

      const liquidacionId = liquidacion ? (liquidacion as any).id : undefined

      // Obtener detalles de pacientes
      const detalles = await obtenerDetallePacientesPorPrestador(
        prestador.medico_id,
        prestador.medico_nombre,
        mes,
        anio,
        liquidacionId
      )

      // Generar PDF individual
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
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor)
  }

  function formatearFecha(fecha: string | null): string {
    if (!fecha) return '-'
    try {
      const date = new Date(fecha)
      return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return fecha
    }
  }

  return (
    <div className="min-h-screen relative p-8 pb-20 overflow-hidden">
      {/* Efectos de luz púrpura */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/admisiones')}
              variant="outline"
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-2 tracking-tight">
              <span className="bg-gradient-to-r from-purple-400 to-pink-300 bg-clip-text text-transparent">
                Resúmenes Admisiones Clínicas
              </span>
            </h1>
          </div>
        </div>

        {/* Selectores de Mes y Año */}
        <div 
          className="p-6 rounded-xl mb-6"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">Mes</label>
              <select
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {MESES.map(m => (
                  <option key={m.value} value={m.value} className="bg-gray-800">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">Año</label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(parseInt(e.target.value, 10) || new Date().getFullYear())}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                min="2020"
                max="2100"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTabActiva('medicos')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              tabActiva === 'medicos'
                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Resumen por Médico
          </button>
          <button
            onClick={() => setTabActiva('prestadores')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              tabActiva === 'prestadores'
                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Resumen por Prestador
          </button>
          <button
            onClick={() => setTabActiva('historial')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              tabActiva === 'historial'
                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Historial
          </button>
          <button
            onClick={() => setTabActiva('excel')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              tabActiva === 'excel'
                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Ver Excel Original
          </button>
        </div>

        {/* Contenido de Tabs */}
        {tabActiva === 'prestadores' && (
          <div 
            className="rounded-2xl shadow-2xl overflow-hidden p-8"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}
          >
            {loading ? (
              <div className="text-center py-12 text-gray-400">Cargando resúmenes...</div>
            ) : resumenesPorPrestador.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No hay datos para el mes {MESES[mes - 1]?.label} {anio}
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-purple-400">Resumen por Prestador</h2>
                  <Button
                    onClick={handleExportarPDFPrestadores}
                    variant="outline"
                    className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF Completo
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Prestador</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Cantidad</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Valor Unitario</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Total</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 w-48">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenesPorPrestador.map((resumen, idx) => {
                        const clave = resumen.medico_id || resumen.medico_nombre
                        const estaExpandido = prestadorExpandido === clave
                        const detalles = detallePacientesPorPrestador.get(clave) || []
                        const estaCargando = loadingDetallePacientes === clave

                        return (
                          <>
                            <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                              <td className="px-4 py-3 text-white font-medium">{resumen.medico_nombre}</td>
                              <td className="px-4 py-3 text-right text-gray-300">{resumen.cantidad}</td>
                              <td className="px-4 py-3 text-right text-gray-300">{formatearMoneda(resumen.valor_unitario)}</td>
                              <td className="px-4 py-3 text-right text-gray-300 font-semibold">{formatearMoneda(resumen.total)}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    onClick={() => cargarDetallePacientes(resumen)}
                                    variant="outline"
                                    size="sm"
                                    className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                                    disabled={estaCargando}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    {estaCargando ? 'Cargando...' : estaExpandido ? 'Ocultar' : 'Ver'}
                                  </Button>
                                  <Button
                                    onClick={() => handleExportarPDFPrestadorIndividual(resumen)}
                                    variant="outline"
                                    size="sm"
                                    className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    PDF
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            {estaExpandido && detalles.length > 0 && (
                              <tr>
                                <td colSpan={5} className="px-4 py-4 bg-gray-900/50">
                                  <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-purple-400 mb-3">
                                      Pacientes atendidos por {resumen.medico_nombre}
                                    </h3>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b border-white/10">
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400">Fecha</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400">Paciente</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-400">Valor</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {detalles.map((detalle) => (
                                            <tr key={detalle.id} className="border-b border-white/5 hover:bg-white/5">
                                              <td className="px-3 py-2 text-gray-300">{formatearFecha(detalle.fecha)}</td>
                                              <td className="px-3 py-2 text-gray-300">{detalle.paciente || '-'}</td>
                                              <td className="px-3 py-2 text-right text-gray-300 font-semibold">{formatearMoneda(detalle.importe_calculado || detalle.monto_facturado)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot>
                                          <tr className="bg-gray-800/50 font-bold">
                                            <td colSpan={2} className="px-3 py-2 text-purple-400">Total</td>
                                            <td className="px-3 py-2 text-right text-purple-400">
                                              {formatearMoneda(detalles.reduce((sum, d) => sum + (d.importe_calculado || d.monto_facturado || 0), 0))}
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                      <tr className="bg-gray-800/50 font-bold">
                        <td className="px-4 py-3 text-purple-400">Total general</td>
                        <td className="px-4 py-3 text-right text-purple-400">
                          {resumenesPorPrestador.reduce((sum, r) => sum + r.cantidad, 0)}
                        </td>
                        <td className="px-4 py-3 text-right text-purple-400">-</td>
                        <td className="px-4 py-3 text-right text-purple-400">
                          {formatearMoneda(resumenesPorPrestador.reduce((sum, r) => sum + r.total, 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
        {tabActiva === 'medicos' && (
          <div 
            className="rounded-2xl shadow-2xl overflow-hidden p-8"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}
          >
            {loading ? (
              <div className="text-center py-12 text-gray-400">Cargando resúmenes...</div>
            ) : resumenesPorMedico.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No hay datos para el mes {MESES[mes - 1]?.label} {anio}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Responsable de admisión</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Cantidad</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Valor unitario</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenesPorMedico.map((resumen, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                          <td className="px-4 py-3 text-white">{resumen.medico_nombre}</td>
                          <td className="px-4 py-3 text-right text-gray-300">{resumen.cantidad}</td>
                          <td className="px-4 py-3 text-right text-gray-300">
                            ${resumen.valor_unitario.toLocaleString('es-AR')}
                          </td>
                          <td className="px-4 py-3 text-right text-purple-300 font-semibold">
                            ${resumen.total.toLocaleString('es-AR')}
                          </td>
                        </tr>
                      ))}
                      {/* Fila Total General */}
                      <tr className="border-t-2 border-purple-500/50 bg-purple-500/10">
                        <td className="px-4 py-4 text-white font-bold">Total general</td>
                        <td className="px-4 py-4 text-right text-white font-bold">{totalGeneral.totalCantidad}</td>
                        <td className="px-4 py-4 text-right text-gray-300">-</td>
                        <td className="px-4 py-4 text-right text-purple-300 font-bold">
                          ${totalGeneral.totalMonto.toLocaleString('es-AR')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {tabActiva === 'historial' && (
          <div 
            className="rounded-2xl shadow-2xl overflow-hidden p-8"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}
          >
            {loadingHistorial ? (
              <div className="text-center py-12 text-gray-400">Cargando historial...</div>
            ) : historial.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No hay liquidaciones en el historial</div>
            ) : (
              <div className="space-y-4">
                {historial.map((liquidacion) => (
                  <div
                    key={liquidacion.id}
                    className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer"
                    onClick={() => {
                      setLiquidacionExpandida(
                        liquidacionExpandida === liquidacion.id ? null : liquidacion.id
                      )
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">
                          {MESES[liquidacion.mes - 1]?.label} {liquidacion.anio}
                        </div>
                        <div className="text-sm text-gray-400">
                          {liquidacion.total_consultas} admisiones • ${liquidacion.total_neto.toLocaleString('es-AR')}
                        </div>
                      </div>
                      <Eye className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tabActiva === 'excel' && (
          <div 
            className="rounded-2xl shadow-2xl overflow-hidden p-8"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}
          >
            {loadingExcel ? (
              <div className="text-center py-12 text-gray-400">Cargando Excel...</div>
            ) : !excelData ? (
              <div className="text-center py-12 text-gray-400">
                No hay Excel disponible para {MESES[mes - 1]?.label} {anio}
              </div>
            ) : (
              <ExcelDataTable 
                data={excelData} 
                especialidad="Admisiones Clínicas"
                liquidacionId={liquidacionActual?.id}
                mes={mes}
                anio={anio}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

