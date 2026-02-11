'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UploadExcel } from '@/components/custom/UploadExcel'
import { MesSelectorModal } from '@/components/custom/MesSelectorModal'
import { NotificationModal, NotificationType } from '@/components/custom/NotificationModal'
import { readExcelFileAdmisiones, ExcelData } from '@/lib/excel-reader'
import { procesarExcelAdmisiones } from '@/lib/admisiones-processor'
import { supabase } from '@/lib/supabase/client'
import { AlertTriangle, XCircle, AlertCircle, Sparkles, ArrowLeft, X, Upload, FileText, Coins, Save, Edit2, Check } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AdmisionesPage() {
    const router = useRouter()
    const [isProcessing, setIsProcessing] = useState(false)
    const [excelData, setExcelData] = useState<ExcelData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showMesSelector, setShowMesSelector] = useState(false)
    const [mesDetectado, setMesDetectado] = useState<number | null>(null)
    const [anioDetectado, setAnioDetectado] = useState<number | null>(null)
    const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1)
    const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear())
    const [archivoActual, setArchivoActual] = useState<File | null>(null)
    const [isGuardando, setIsGuardando] = useState(false)
    const [resultadoProcesamiento, setResultadoProcesamiento] = useState<any>(null)
    const [valorAdmision, setValorAdmision] = useState<number>(12000)
    const [isEditingValor, setIsEditingValor] = useState(false)
    const [tempValor, setTempValor] = useState<string>('12000')
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

    // Cargar valor al iniciar o cambiar mes
    useEffect(() => {
        cargarValorAdmision()
    }, [mesSeleccionado, anioSeleccionado])

    async function cargarValorAdmision() {
        try {
            const { data, error } = await supabase
                .from('admission_values_config')
                .select('valor_admision')
                .eq('mes', mesSeleccionado)
                .eq('anio', anioSeleccionado)
                .single()

            if (error && error.code !== 'PGRST116') throw error

            const val = (data as any)?.valor_admision || 12000
            setValorAdmision(val)
            setTempValor(val.toString())
        } catch (error) {
            console.error('Error cargando valor:', error)
        }
    }

    async function guardarValorAdmision() {
        try {
            const val = parseFloat(tempValor)
            if (isNaN(val) || val < 0) {
                showNotification('error', 'El valor debe ser un número válido')
                return
            }

            // Upsert
            const { error } = await supabase
                .from('admission_values_config')
                // @ts-ignore
                .upsert({
                    mes: mesSeleccionado,
                    anio: anioSeleccionado,
                    valor_admision: val
                }, { onConflict: 'mes,anio' })

            if (error) throw error

            setValorAdmision(val)
            setIsEditingValor(false)
            showNotification('success', 'Valor actualizado correctamente')
        } catch (error) {
            console.error('Error guardando valor:', error)
            showNotification('error', 'Error al guardar el valor')
        }
    }

    function showNotification(type: NotificationType, message: string, title?: string) {
        setNotification({
            isOpen: true,
            type,
            message,
            title
        })
        setTimeout(() => {
            setNotification(prev => ({ ...prev, isOpen: false }))
        }, 5000)
    }

    // Función para detectar mes y año desde las fechas del Excel
    const detectarMesAnio = (data: ExcelData): { mes: number | null; anio: number | null } => {
        // Buscar en las fechas de las filas
        const fechaColumn = data.headers.find(h =>
            h.toLowerCase().includes('fecha') ||
            h.toLowerCase().includes('date')
        )

        if (fechaColumn && data.rows.length > 0) {
            const fechas: number[] = []
            data.rows.forEach(row => {
                const fechaStr = row[fechaColumn]
                if (fechaStr) {
                    // Intentar parsear fecha en formato YYYY-MM-DD
                    if (typeof fechaStr === 'string') {
                        const match = fechaStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
                        if (match) {
                            const mes = parseInt(match[2], 10)
                            const anio = parseInt(match[1], 10)
                            if (mes >= 1 && mes <= 12 && anio >= 2020) {
                                fechas.push(mes)
                            }
                        } else {
                            // Intentar formato DD/MM/YYYY
                            const matchDDMM = fechaStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
                            if (matchDDMM) {
                                const mes = parseInt(matchDDMM[2], 10)
                                const anio = parseInt(matchDDMM[3], 10)
                                if (mes >= 1 && mes <= 12 && anio >= 2020) {
                                    fechas.push(mes)
                                }
                            }
                        }
                    }
                }
            })

            // Si todas las fechas son del mismo mes, usar ese mes
            if (fechas.length > 0) {
                const mesComun = fechas[0]
                const todasIguales = fechas.every(m => m === mesComun)
                if (todasIguales) {
                    // Obtener año de la primera fecha
                    const primeraFecha = data.rows[0][fechaColumn]
                    if (typeof primeraFecha === 'string') {
                        const matchISO = primeraFecha.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
                        if (matchISO) {
                            return { mes: mesComun, anio: parseInt(matchISO[1], 10) }
                        }
                        const matchDDMM = primeraFecha.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
                        if (matchDDMM) {
                            return { mes: mesComun, anio: parseInt(matchDDMM[3], 10) }
                        }
                    }
                }
            }
        }

        return { mes: null, anio: null }
    }

    const handleUpload = async (file: File) => {
        setIsProcessing(true)
        setExcelData(null)
        setError(null)
        setMesDetectado(null)
        setAnioDetectado(null)
        setArchivoActual(file)

        try {
            const data = await readExcelFileAdmisiones(file)
            setExcelData(data)

            // Detectar mes y año automáticamente
            const { mes, anio } = detectarMesAnio(data)
            if (mes && anio) {
                setMesDetectado(mes)
                setAnioDetectado(anio)
                setMesSeleccionado(mes)
                setAnioSeleccionado(anio)
                // Mostrar modal para confirmar
                setShowMesSelector(true)
            } else {
                // Si no se detectó, mostrar modal para seleccionar manualmente
                setShowMesSelector(true)
            }
        } catch (err: any) {
            console.error('Error processing file:', err)
            setError(err.message || 'Ocurrió un error inesperado al procesar el archivo.')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleMesConfirmado = async (mes: number, anio: number) => {
        setMesSeleccionado(mes)
        setAnioSeleccionado(anio)
        setShowMesSelector(false)

        // Si hay datos del Excel, procesar y guardar
        if (excelData && archivoActual) {
            setIsGuardando(true)
            try {
                const resultado = await procesarExcelAdmisiones(
                    excelData,
                    mes,
                    anio,
                    archivoActual.name
                )

                // Guardar resultado del procesamiento para mostrar filas excluidas
                setResultadoProcesamiento(resultado)

                if (resultado.errores.length > 0) {
                    const mensajeError = resultado.errores.length > 0
                        ? `Se procesaron ${resultado.procesadas} filas. Errores: ${resultado.errores.slice(0, 3).join('; ')}${resultado.errores.length > 3 ? '...' : ''}`
                        : `Se procesaron ${resultado.procesadas} filas. Errores: ${resultado.errores.length}`
                    showNotification(
                        'error',
                        mensajeError,
                        'Procesamiento con errores'
                    )
                    console.error('Errores completos:', resultado.errores)
                } else {
                    // Limpiar datos del Excel después de procesar exitosamente
                    setExcelData(null)
                    setArchivoActual(null)

                    // Obtener nombre del mes para el mensaje
                    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
                    const nombreMes = meses[mes - 1]

                    if (resultado.advertencias.length > 0 || (resultado.filasExcluidas && resultado.filasExcluidas.length > 0)) {
                        showNotification(
                            'warning',
                            `Se procesaron ${resultado.procesadas} de ${resultado.totalFilas} filas. ${resultado.advertencias.length} advertencias. ${resultado.filasExcluidas?.length || 0} filas excluidas. Para editar los datos, ve a "Ver Resumen", selecciona el mes ${nombreMes} ${anio} y edita desde ahí.`,
                            'Procesamiento completado'
                        )
                    } else {
                        showNotification(
                            'success',
                            `Se procesaron y guardaron ${resultado.procesadas} admisiones correctamente. Para editar los datos, ve a "Ver Resumen", selecciona el mes ${nombreMes} ${anio} y edita desde ahí.`,
                            'Guardado exitoso'
                        )
                    }
                }
            } catch (err: any) {
                console.error('Error guardando datos:', err)
                showNotification(
                    'error',
                    `Error al guardar: ${err.message || 'Error desconocido'}`,
                    'Error'
                )
            } finally {
                setIsGuardando(false)
            }
        }
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
                            <Sparkles className="h-3 w-3" />
                            Premium Powerhouse
                        </div>
                        <h1 className="text-6xl font-black tracking-tighter leading-none">
                            MÓDULO<br />
                            <span className="text-[#00FF88] italic uppercase">Admisiones</span>
                        </h1>
                        <p className="text-gray-400 text-lg max-w-md font-medium leading-relaxed">
                            Gestión avanzada de admisiones clínicas con motor de deduplicación inteligente.
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-6 text-right">
                        <div className="flex gap-3 items-center bg-white/5 p-2 rounded-full border border-white/10">
                            <select
                                value={mesSeleccionado}
                                onChange={(e) => setMesSeleccionado(Number(e.target.value))}
                                className="bg-transparent border-none text-white font-bold text-sm px-4 focus:outline-none cursor-pointer uppercase tracking-widest [&>option]:bg-black"
                            >
                                {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                    <option key={i} value={i + 1}>{m}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                value={anioSeleccionado}
                                onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
                                className="bg-black border border-white/10 rounded-full w-20 py-1 px-3 text-sm font-bold text-white focus:border-[#00FF88]/50 outline-none text-center"
                            />
                        </div>

                        <div className="flex flex-wrap gap-4 justify-end">
                            <button
                                onClick={() => router.push('/')}
                                className="group flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-bold text-sm tracking-tight"
                            >
                                <ArrowLeft className="h-4 w-4 text-gray-400 group-hover:text-white group-hover:-translate-x-1 transition-all" />
                                VOLVER
                            </button>
                            <button
                                onClick={() => router.push('/admisiones/resumenes')}
                                className="flex items-center gap-3 px-8 py-4 rounded-full bg-[#00FF88] text-black font-black text-sm tracking-tighter hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,255,136,0.3)]"
                            >
                                <FileText className="h-5 w-5" />
                                VER RESÚMENES
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Interaction Area */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Upload Card */}
                        <div
                            className="relative group rounded-3xl overflow-hidden p-[1px] transition-all hover:scale-[1.01]"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,255,136,0.2) 100%)'
                            }}
                        >
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,136,0.15),transparent_70%)]"></div>
                            <div className="relative bg-[#000000]/90 backdrop-blur-3xl rounded-[23px] p-8 space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-[#00FF88]/10 rounded-2xl">
                                            <Upload className="h-6 w-6 text-[#00FF88]" />
                                        </div>
                                        <h2 className="text-2xl font-bold tracking-tight">Carga de Datos</h2>
                                    </div>
                                    <Button
                                        onClick={() => router.push('/admisiones/resumenes')}
                                        variant="outline"
                                        className="border-white/10 hover:border-[#00FF88] hover:text-[#00FF88] transition-all rounded-xl px-6 bg-white/5"
                                    >
                                        Explorar Historial
                                    </Button>
                                </div>

                                <div className="border border-dashed border-white/10 rounded-2xl p-1 bg-white/[0.02]">
                                    <UploadExcel onUpload={handleUpload} isProcessing={isProcessing} />
                                </div>

                                {error && (
                                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                                        <XCircle className="h-6 w-6 text-red-500 shrink-0" />
                                        <div>
                                            <h3 className="font-bold text-red-400">Error de Procesamiento</h3>
                                            <p className="text-sm text-red-400/80">{error}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Summary View (if data exists) */}
                        {resultadoProcesamiento && resultadoProcesamiento.filasExcluidas && resultadoProcesamiento.filasExcluidas.length > 0 && excelData && (
                            <div className="rounded-3xl border border-white/10 bg-[#000000]/50 backdrop-blur-xl p-8 space-y-6 animate-in fade-in zoom-in-95 duration-500">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                                        <AlertTriangle className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Inconsistencias Detectadas</h3>
                                        <p className="text-gray-500 text-sm">Registros excluidos por falta de integridad o duplicidad.</p>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-white/5 text-gray-400 font-mono text-xs uppercase tracking-widest">
                                                <tr>
                                                    <th className="px-6 py-4">Fila</th>
                                                    <th className="px-6 py-4">Motivo</th>
                                                    <th className="px-6 py-4">Detalle</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {resultadoProcesamiento.filasExcluidas.slice(0, 10).map((fila: any, i: number) => (
                                                    <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                                                        <td className="px-6 py-4 font-mono text-[#00FF88]">{fila.numeroFila}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                                                                {fila.razon === 'sin_fecha' ? 'Fecha Ausente' :
                                                                    fila.razon === 'fecha_invalida' ? 'Rango Inválido' : 'Duplicado'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-500 truncate max-w-xs transition-all hover:max-w-none">
                                                            {Object.values(fila.datos).join(' | ')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                {resultadoProcesamiento.filasExcluidas.length > 10 && (
                                    <p className="text-center text-gray-600 text-xs italic">Ver archivos de log para el detalle completo ({resultadoProcesamiento.filasExcluidas.length} filas en total)</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar / Rules Panel */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* THE 12000 VALUE CARD - PREMIUM POSITION */}
                        <div
                            className="p-8 rounded-[32px] bg-gradient-to-br from-[#00FF88] to-[#047857] text-[#000000] shadow-[0_20px_50px_rgba(0,255,136,0.3)] relative overflow-hidden group hover:scale-[1.03] transition-transform duration-500"
                        >
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:translate-x-10 group-hover:-translate-y-10 transition-transform duration-700"></div>
                            <div className="relative z-10 space-y-1">
                                <div className="flex justify-between items-start">
                                    <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Tarifa Mensual Vigente</p>
                                    <button
                                        onClick={() => {
                                            setTempValor(valorAdmision.toString())
                                            setIsEditingValor(!isEditingValor)
                                        }}
                                        className="p-2 hover:bg-black/10 rounded-full transition-colors"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="flex items-baseline gap-2 min-h-[4rem]">
                                    {isEditingValor ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-4xl font-black">$</span>
                                            <Input
                                                autoFocus
                                                value={tempValor}
                                                onChange={(e) => setTempValor(e.target.value)}
                                                className="text-4xl font-black bg-black/10 border-none h-14 w-48 focus:ring-0 text-black placeholder-black/30"
                                            />
                                            <button
                                                onClick={guardarValorAdmision}
                                                className="p-2 bg-black/20 rounded-full hover:bg-black/30 transition-colors"
                                            >
                                                <Check className="h-6 w-6" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-6xl font-black tracking-tighter">${valorAdmision.toLocaleString()}</span>
                                            <span className="text-xs font-bold bg-[#000000] text-[#00FF88] px-2 py-1 rounded-full">v2.1</span>
                                        </>
                                    )}
                                </div>
                                <p className="text-sm font-medium pt-4 border-t border-black/10 mt-4 leading-snug">
                                    Valor neto consolidado por cada admisión procesada y aprobada.
                                </p>
                            </div>
                        </div>

                        {/* Rules Section */}
                        <div className="rounded-3xl border border-white/10 bg-[#000000]/50 backdrop-blur-3xl p-8 space-y-8">
                            <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-[#00FF88]" />
                                <h3 className="text-xl font-bold tracking-tight">Inteligencia de Negocio</h3>
                            </div>

                            <div className="space-y-6">
                                {/* Rule Item 1 */}
                                <div className="group space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-[2px] w-4 bg-[#00FF88] group-hover:w-8 transition-all"></div>
                                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">Regla A: Consolidación</span>
                                    </div>
                                    <p className="text-[13px] text-gray-400 group-hover:text-white transition-colors leading-relaxed">
                                        Mismo <strong className="text-white">Profesional</strong> + Mismo <strong className="text-white">Paciente</strong> + Misma <strong className="text-white">Fecha</strong> →
                                        Ejecuta <span className="text-[#00FF88] font-bold underline decoration-[#00FF88]/30">Auto-Deduplicación</span>.
                                    </p>
                                </div>

                                {/* Rule Item 2 */}
                                <div className="group space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-[2px] w-4 bg-[#00FF88] group-hover:w-8 transition-all"></div>
                                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">Regla B: Prioridad Directa</span>
                                    </div>
                                    <p className="text-[13px] text-gray-400 group-hover:text-white transition-colors leading-relaxed">
                                        Sistema <strong className="text-[#00FF88]">FCFS</strong> (First-Come, First-Served) activo. Se liquida únicamente al primer responsable registrado por paciente/día.
                                    </p>
                                </div>

                                {/* Format Info */}
                                <div className="pt-6 border-t border-white/5 space-y-4">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                        <span>Estructura Requerida</span>
                                        <span className="text-[#00FF88]">XLSX</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                                        <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">HEADER: FILA 10</div>
                                        <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">DATA: FILA 11+</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de selección de mes */}
            <MesSelectorModal
                isOpen={showMesSelector}
                onClose={() => setShowMesSelector(false)}
                onConfirm={handleMesConfirmado}
                mesDetectado={mesDetectado}
                anioDetectado={anioDetectado}
                mesActual={new Date().getMonth() + 1}
                anioActual={new Date().getFullYear()}
            />

            {/* Notificación */}
            <NotificationModal
                isOpen={notification.isOpen}
                onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
                type={notification.type}
                title={notification.title}
                message={notification.message}
            />

            {/* Global Loader Overlay */}
            {isGuardando && (
                <div className="fixed inset-0 z-[100] bg-[#000000]/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                    <div className="relative mb-8">
                        <div className="h-24 w-24 rounded-full border-t-2 border-r-2 border-[#00FF88] animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles className="h-8 w-8 text-[#00FF88] animate-pulse" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight mb-2">SINCRONIZANDO <span className="text-[#00FF88]">DATOS</span></h2>
                    <p className="text-gray-500 font-mono text-sm max-w-xs">Integrando registros en el motor de liquidación GrowLabs...</p>
                </div>
            )}
        </div>
    )
}
