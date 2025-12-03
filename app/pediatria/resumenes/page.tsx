'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { calcularResumenPorMedico, calcularResumenPorPrestador, ResumenPorMedico, ResumenPorPrestador } from '@/lib/pediatria-resumenes'
import { LiquidacionGuardia } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileDown, Download, History } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

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

export default function ResumenesPediatriaPage() {
  const router = useRouter()
  
  const [mes, setMes] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedMes = localStorage.getItem('pediatria_resumenes_mes')
      return savedMes ? parseInt(savedMes, 10) : new Date().getMonth() + 1
    }
    return new Date().getMonth() + 1
  })
  
  const [anio, setAnio] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedAnio = localStorage.getItem('pediatria_resumenes_anio')
      return savedAnio ? parseInt(savedAnio, 10) : new Date().getFullYear()
    }
    return new Date().getFullYear()
  })
  const [resumenesPorMedico, setResumenesPorMedico] = useState<ResumenPorMedico[]>([])
  const [resumenesPorPrestador, setResumenesPorPrestador] = useState<ResumenPorPrestador[]>([])
  const [historial, setHistorial] = useState<LiquidacionGuardia[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [tabActiva, setTabActiva] = useState<'medicos' | 'prestadores' | 'historial'>('medicos')

  // Guardar mes y año en localStorage cuando cambian
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pediatria_resumenes_mes', mes.toString())
      localStorage.setItem('pediatria_resumenes_anio', anio.toString())
    }
  }, [mes, anio])

  useEffect(() => {
    if (tabActiva === 'historial') {
      cargarHistorial()
    } else {
      cargarResumenes()
    }
  }, [mes, anio, tabActiva])

  async function cargarResumenes() {
    setLoading(true)
    try {
      const [resumenesMedico, resumenesPrestador] = await Promise.all([
        calcularResumenPorMedico(mes, anio),
        calcularResumenPorPrestador(mes, anio)
      ])
      setResumenesPorMedico(resumenesMedico)
      setResumenesPorPrestador(resumenesPrestador)
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
        .eq('especialidad', 'Pediatría')
        .order('anio', { ascending: false })
        .order('mes', { ascending: false })
        .limit(12)

      if (error) throw error
      setHistorial((data || []) as LiquidacionGuardia[])
    } catch (error) {
      console.error('Error cargando historial:', error)
    } finally {
      setLoadingHistorial(false)
    }
  }

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(valor)
  }

  return (
    <div className="min-h-screen relative p-8 pb-20 overflow-hidden">
      {/* Efectos de luz verde */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-green-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/pediatria')}
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
                Resúmenes - Pediatría
              </span>
            </h1>
            <p className="text-gray-400">Resúmenes de liquidaciones por médico y prestador</p>
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
          <div className="flex items-center gap-4">
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
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          <button
            onClick={() => setTabActiva('medicos')}
            className={`px-4 py-2 font-semibold transition-colors ${
              tabActiva === 'medicos'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Por Médico y Obra Social
          </button>
          <button
            onClick={() => setTabActiva('prestadores')}
            className={`px-4 py-2 font-semibold transition-colors ${
              tabActiva === 'prestadores'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Por Prestador
          </button>
          <button
            onClick={() => setTabActiva('historial')}
            className={`px-4 py-2 font-semibold transition-colors ${
              tabActiva === 'historial'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <History className="h-4 w-4 inline mr-2" />
            Historial
          </button>
        </div>

        {/* Contenido de tabs */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : tabActiva === 'medicos' ? (
          <div 
            className="p-6 rounded-xl overflow-x-auto"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            {resumenesPorMedico.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No hay resúmenes para {MESES[mes - 1].label} {anio}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-2 text-left text-gray-400">Médico</th>
                    <th className="px-4 py-2 text-left text-gray-400">Obra Social</th>
                    <th className="px-4 py-2 text-right text-gray-400">Cantidad</th>
                    <th className="px-4 py-2 text-right text-gray-400">Valor Unitario</th>
                    <th className="px-4 py-2 text-right text-gray-400">Total Bruto</th>
                    <th className="px-4 py-2 text-right text-gray-400">Retención (-30%)</th>
                    <th className="px-4 py-2 text-right text-gray-400">Subtotal</th>
                    <th className="px-4 py-2 text-right text-gray-400">Adicionales</th>
                    <th className="px-4 py-2 text-right text-gray-400">Total Final</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenesPorMedico.map((resumen, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2 text-white">{resumen.medico_nombre}</td>
                      <td className="px-4 py-2 text-gray-300">{resumen.obra_social}</td>
                      <td className="px-4 py-2 text-right text-gray-300">{resumen.cantidad}</td>
                      <td className="px-4 py-2 text-right text-gray-300">{formatearMoneda(resumen.valor_unitario)}</td>
                      <td className="px-4 py-2 text-right text-gray-300">{formatearMoneda(resumen.total_bruto)}</td>
                      <td className="px-4 py-2 text-right text-red-400">{formatearMoneda(resumen.retencion_30)}</td>
                      <td className="px-4 py-2 text-right text-gray-300">{formatearMoneda(resumen.total_neto)}</td>
                      <td className="px-4 py-2 text-right text-green-400">{formatearMoneda(resumen.adicionales)}</td>
                      <td className="px-4 py-2 text-right text-green-400 font-semibold">{formatearMoneda(resumen.total_final)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-green-500/50 font-semibold">
                    <td colSpan={4} className="px-4 py-2 text-right text-gray-300">TOTALES</td>
                    <td className="px-4 py-2 text-right text-gray-300">
                      {formatearMoneda(resumenesPorMedico.reduce((sum, r) => sum + r.total_bruto, 0))}
                    </td>
                    <td className="px-4 py-2 text-right text-red-400">
                      {formatearMoneda(resumenesPorMedico.reduce((sum, r) => sum + r.retencion_30, 0))}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300">
                      {formatearMoneda(resumenesPorMedico.reduce((sum, r) => sum + r.total_neto, 0))}
                    </td>
                    <td className="px-4 py-2 text-right text-green-400">
                      {formatearMoneda(resumenesPorMedico.reduce((sum, r) => sum + r.adicionales, 0))}
                    </td>
                    <td className="px-4 py-2 text-right text-green-400">
                      {formatearMoneda(resumenesPorMedico.reduce((sum, r) => sum + r.total_final, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        ) : tabActiva === 'prestadores' ? (
          <div 
            className="p-6 rounded-xl overflow-x-auto"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            {resumenesPorPrestador.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No hay resúmenes para {MESES[mes - 1].label} {anio}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-2 text-left text-gray-400">Médico</th>
                    <th className="px-4 py-2 text-right text-gray-400">Cantidad</th>
                    <th className="px-4 py-2 text-right text-gray-400">Total Bruto</th>
                    <th className="px-4 py-2 text-right text-gray-400">Retención (-30%)</th>
                    <th className="px-4 py-2 text-right text-gray-400">Subtotal</th>
                    <th className="px-4 py-2 text-right text-gray-400">Adicionales</th>
                    <th className="px-4 py-2 text-right text-gray-400">Total Final</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenesPorPrestador.map((resumen, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2 text-white font-semibold">{resumen.medico_nombre}</td>
                      <td className="px-4 py-2 text-right text-gray-300">{resumen.cantidad}</td>
                      <td className="px-4 py-2 text-right text-gray-300">{formatearMoneda(resumen.total_bruto)}</td>
                      <td className="px-4 py-2 text-right text-red-400">{formatearMoneda(resumen.retencion_30)}</td>
                      <td className="px-4 py-2 text-right text-gray-300">{formatearMoneda(resumen.total_neto)}</td>
                      <td className="px-4 py-2 text-right text-green-400">{formatearMoneda(resumen.adicionales)}</td>
                      <td className="px-4 py-2 text-right text-green-400 font-semibold">{formatearMoneda(resumen.total_final)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-green-500/50 font-semibold">
                    <td className="px-4 py-2 text-right text-gray-300">TOTALES</td>
                    <td className="px-4 py-2 text-right text-gray-300">
                      {resumenesPorPrestador.reduce((sum, r) => sum + r.cantidad, 0)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300">
                      {formatearMoneda(resumenesPorPrestador.reduce((sum, r) => sum + r.total_bruto, 0))}
                    </td>
                    <td className="px-4 py-2 text-right text-red-400">
                      {formatearMoneda(resumenesPorPrestador.reduce((sum, r) => sum + r.retencion_30, 0))}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300">
                      {formatearMoneda(resumenesPorPrestador.reduce((sum, r) => sum + r.total_neto, 0))}
                    </td>
                    <td className="px-4 py-2 text-right text-green-400">
                      {formatearMoneda(resumenesPorPrestador.reduce((sum, r) => sum + r.adicionales, 0))}
                    </td>
                    <td className="px-4 py-2 text-right text-green-400">
                      {formatearMoneda(resumenesPorPrestador.reduce((sum, r) => sum + r.total_final, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        ) : (
          <div 
            className="p-6 rounded-xl"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            {loadingHistorial ? (
              <div className="text-center py-12 text-gray-400">Cargando historial...</div>
            ) : historial.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No hay liquidaciones en el historial</div>
            ) : (
              <div className="space-y-4">
                {historial.map(liq => (
                  <div
                    key={liq.id}
                    className="p-4 rounded-lg border border-white/10 hover:border-green-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {MESES[liq.mes - 1].label} {liq.anio}
                        </h3>
                        <p className="text-sm text-gray-400">
                          Liquidación #{liq.numero_liquidacion} • {liq.total_consultas} consultas
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-green-400">
                          {formatearMoneda(liq.total_neto)}
                        </p>
                        <p className="text-xs text-gray-400">Total Neto</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

