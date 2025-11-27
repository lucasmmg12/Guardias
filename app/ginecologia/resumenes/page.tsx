'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { calcularResumenPorMedico, calcularResumenPorPrestador, ResumenPorMedico, ResumenPorPrestador } from '@/lib/ginecologia-resumenes'
import { exportPDFResumenPorMedico } from '@/lib/pdf-exporter-resumen-medico'
import { exportPDFResumenPorPrestador } from '@/lib/pdf-exporter-resumen-prestador'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileDown, Download } from 'lucide-react'

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
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [resumenesPorMedico, setResumenesPorMedico] = useState<Map<string, ResumenPorMedico[]>>(new Map())
  const [resumenesPorPrestador, setResumenesPorPrestador] = useState<ResumenPorPrestador[]>([])
  const [loading, setLoading] = useState(false)
  const [tabActiva, setTabActiva] = useState<'medicos' | 'prestadores'>('medicos')

  useEffect(() => {
    cargarResumenes()
  }, [mes, anio])

  async function cargarResumenes() {
    setLoading(true)
    try {
      // Calcular resumen por prestador (incluye todos los médicos)
      const resumenPrestadores = await calcularResumenPorPrestador(mes, anio)
      setResumenesPorPrestador(resumenPrestadores)

      // Calcular resumen por médico (agrupar por médico)
      const resumenMedicos = await calcularResumenPorMedico(mes, anio)
      
      // Agrupar por médico
      const resumenesPorMedicoMap = new Map<string, ResumenPorMedico[]>()
      resumenMedicos.forEach(resumen => {
        const medicoId = resumen.medico_id || 'sin-id'
        if (!resumenesPorMedicoMap.has(medicoId)) {
          resumenesPorMedicoMap.set(medicoId, [])
        }
        resumenesPorMedicoMap.get(medicoId)!.push(resumen)
      })
      
      setResumenesPorMedico(resumenesPorMedicoMap)
    } catch (error) {
      console.error('Error cargando resúmenes:', error)
    } finally {
      setLoading(false)
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
        </div>

        {/* Contenido de Tabs */}
        {loading ? (
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

