'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadExcel } from '@/components/custom/UploadExcel'
import { MesSelectorModal } from '@/components/custom/MesSelectorModal'
import { NotificationModal, NotificationType } from '@/components/custom/NotificationModal'
import { readExcelFileGinecologia, ExcelData } from '@/lib/excel-reader'
import { procesarExcelGinecologia } from '@/lib/ginecologia-processor'
import { ExpandableSection } from '@/components/custom/ExpandableSection'
import { AlertTriangle, XCircle, AlertCircle, Sparkles, ArrowLeft, X, Activity, Upload, FileText, CheckCircle2, User } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function GinecologiaPage() {
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
        // Primero intentar desde el período
        if (data.periodo?.desde) {
            const partes = data.periodo.desde.split('/')
            if (partes.length === 3) {
                const mes = parseInt(partes[1], 10)
                const anio = parseInt(partes[2], 10)
                if (mes >= 1 && mes <= 12 && anio >= 2020) {
                    return { mes, anio }
                }
            }
        }

        // Si no hay período, buscar en las fechas de las filas
        const fechaColumn = data.headers.find(h =>
            h.toLowerCase().includes('fecha') ||
            h.toLowerCase().includes('date')
        )

        if (fechaColumn && data.rows.length > 0) {
            const fechas: number[] = []
            data.rows.forEach(row => {
                const fechaStr = row[fechaColumn]
                if (fechaStr) {
                    // Intentar parsear fecha en formato DD/MM/YYYY
                    if (typeof fechaStr === 'string') {
                        const match = fechaStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
                        if (match) {
                            const mes = parseInt(match[2], 10)
                            const anio = parseInt(match[3], 10)
                            if (mes >= 1 && mes <= 12 && anio >= 2020) {
                                fechas.push(mes)
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
                        const match = primeraFecha.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
                        if (match) {
                            return { mes: mesComun, anio: parseInt(match[3], 10) }
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
            const data = await readExcelFileGinecologia(file)
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
                const resultado = await procesarExcelGinecologia(
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
                            `Se procesaron y guardaron ${resultado.procesadas} consultas correctamente. Para editar los datos, ve a "Ver Resumen", selecciona el mes ${nombreMes} ${anio} y edita desde ahí.`,
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

    // Ya no cargamos liquidaciones en progreso aquí
    // La edición se hace desde la página de Resúmenes


    // Las funciones de edición (handleCellUpdate, handleDeleteRow) ya no se usan aquí
    // La edición se hace desde la página de Resúmenes

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
                            <Sparkles className="h-3 w-3" />
                            Premium Powerhouse
                        </div>
                        <h1 className="text-6xl font-black tracking-tighter leading-none">
                            MÓDULO<br />
                            <span className="text-[#00D1FF] italic">GINECOLOGÍA</span>
                        </h1>
                        <p className="text-gray-400 text-lg max-w-md font-medium leading-relaxed">
                            Sistema de liquidación horaria de alta precisión con motor de reglas dinámico.
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
                            onClick={() => router.push('/ginecologia/resumenes')}
                            className="flex items-center gap-3 px-8 py-4 rounded-full bg-[#00D1FF] text-black font-black text-sm tracking-tighter hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,209,255,0.3)]"
                        >
                            <FileText className="h-5 w-5" />
                            VER RESÚMENES
                        </button>
                    </div>
                </div>

                {/* Upload Excel Card Premium */}
                <div
                    className="p-12 rounded-[40px] relative overflow-hidden group mb-12 animate-in zoom-in-95 duration-500"
                    style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                >
                    <div className="absolute top-0 right-0 p-8">
                        <Upload className="h-12 w-12 text-[#00D1FF]/20 group-hover:text-[#00D1FF]/40 transition-all duration-500" />
                    </div>

                    <div className="relative space-y-8">
                        <div className="space-y-2">
                            <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase underline decoration-[#00D1FF] decoration-4 underline-offset-8">Cargar Liquidación</h2>
                            <p className="text-gray-500 font-bold tracking-widest text-xs">SISTEMA DE PROCESAMIENTO GINECOLÓGICO</p>
                        </div>

                        <UploadExcel onUpload={handleUpload} isProcessing={isProcessing} />

                        {error && (
                            <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex items-start gap-4 text-red-400 animate-in shake duration-500">
                                <XCircle className="w-6 h-6 shrink-0" />
                                <div className="space-y-1">
                                    <h3 className="font-black italic tracking-tight">ERROR DE SISTEMA</h3>
                                    <p className="text-sm font-medium opacity-80">{error}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Reglas de Negocio Premium */}
                <div
                    className="p-12 rounded-[40px] animate-in slide-in-from-bottom-4 duration-1000"
                    style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                >
                    <div className="flex items-center gap-4 mb-12">
                        <div className="w-2 h-12 bg-[#00D1FF] rounded-full"></div>
                        <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">Reglas Vigentes</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Pago por Consulta */}
                        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
                            <div className="w-12 h-12 rounded-2xl bg-[#00FF88]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-all">
                                <Activity className="h-6 w-6 text-[#00FF88]" />
                            </div>
                            <h4 className="text-xl font-black text-white tracking-tight mb-2 uppercase italic">Valor Variable</h4>
                            <p className="text-gray-500 text-sm font-medium leading-relaxed">
                                Se abona un valor fijo por cada consulta realizada, dictaminado por la <span className="text-[#00FF88] font-bold">Obra Social</span> del paciente.
                            </p>
                        </div>

                        {/* Médicos de Planta */}
                        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
                            <div className="w-12 h-12 rounded-2xl bg-[#00D1FF]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-all">
                                <User className="h-6 w-6 text-[#00D1FF]" />
                            </div>
                            <h4 className="text-xl font-black text-white tracking-tight mb-2 uppercase italic">100% Abonable</h4>
                            <p className="text-gray-500 text-sm font-medium leading-relaxed">
                                Médicos de planta perciben el total del valor de consulta <span className="text-[#00D1FF] font-bold">sin restricciones</span> de horario o día.
                            </p>
                        </div>
                    </div>

                    {/* Regla de Residentes Premium */}
                    <div className="rounded-[32px] overflow-hidden border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent">
                        <div className="p-6 bg-white/[0.03] border-b border-white/5 flex items-center justify-between">
                            <span className="text-xs font-black tracking-widest text-purple-400 uppercase">Condición Especial: Residentes</span>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                                <div className="w-2 h-2 rounded-full bg-purple-500/50"></div>
                            </div>
                        </div>

                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <XCircle className="h-5 w-5 text-red-500" />
                                    <span className="text-lg font-black text-white italic uppercase tracking-tighter">Zona Excluida</span>
                                </div>
                                <ul className="space-y-4">
                                    <li className="flex items-center gap-4 text-gray-400 font-bold text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                        Lunes a Sábado
                                    </li>
                                    <li className="flex items-center gap-4 text-gray-400 font-bold text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                        07:00 a 15:00 HS
                                    </li>
                                </ul>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-[#00FF88]" />
                                    <span className="text-lg font-black text-white italic uppercase tracking-tighter">Zona Liquidable</span>
                                </div>
                                <ul className="space-y-4">
                                    <li className="flex items-center gap-4 text-gray-400 font-bold text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88]"></div>
                                        Domingos y Feriados
                                    </li>
                                    <li className="flex items-center gap-4 text-gray-400 font-bold text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88]"></div>
                                        Horario Nocturno / Tarde
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Timeline GrowLabs */}
                        <div className="p-8 border-t border-white/5">
                            <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase mb-6">Visual Timeline (Lunes - Sábado)</p>
                            <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                <div className="absolute left-[29%] w-[33%] h-full bg-gradient-to-r from-red-500/20 via-red-500/40 to-red-500/20 border-x border-red-500/50"></div>
                                <div className="absolute left-[29%] -top-1 h-6 w-[1px] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                                <div className="absolute left-[62%] -top-1 h-6 w-[1px] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                            </div>
                            <div className="flex justify-between mt-4">
                                <span className="text-[10px] font-bold text-gray-600 font-mono">00:00</span>
                                <div className="flex gap-12">
                                    <span className="text-[10px] font-black text-red-500 font-mono">07:00</span>
                                    <span className="text-[10px] font-black text-red-500 font-mono">15:00</span>
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 font-mono">24:00</span>
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

            {/* Indicador de guardado */}
            {isGuardando && (
                <div className="fixed bottom-4 right-4 p-4 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-400">
                    Guardando datos en la base de datos...
                </div>
            )}

            {/* Sección de filas excluidas */}
            {resultadoProcesamiento && resultadoProcesamiento.filasExcluidas && resultadoProcesamiento.filasExcluidas.length > 0 && excelData && (
                <div className="max-w-6xl mx-auto mt-8 relative z-10">
                    <div
                        className="rounded-2xl shadow-2xl overflow-hidden p-6 mb-6"
                        style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(239, 68, 68, 0.5)',
                        }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <XCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
                                <div>
                                    <h3 className="text-xl font-bold text-red-400">
                                        {resultadoProcesamiento.filasExcluidas.length} fila{resultadoProcesamiento.filasExcluidas.length > 1 ? 's' : ''} excluida{resultadoProcesamiento.filasExcluidas.length > 1 ? 's' : ''} del procesamiento
                                    </h3>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Estas filas fueron excluidas porque no tienen fecha válida o tienen fecha fuera de rango. Puedes revisarlas aquí pero no se guardaron en la base de datos.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 sticky left-0 bg-gray-900/95 z-10" style={{ minWidth: '80px' }}>
                                            Fila Excel
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400" style={{ minWidth: '150px' }}>
                                            Razón
                                        </th>
                                        {excelData.headers.map((header, idx) => (
                                            <th key={idx} className="px-3 py-2 text-left text-xs font-semibold text-gray-400" style={{ minWidth: '120px' }}>
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {resultadoProcesamiento.filasExcluidas.map((filaExcluida: any, idx: number) => (
                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="px-3 py-2 text-xs text-gray-300 sticky left-0 bg-gray-900/95 z-10">
                                                {filaExcluida.numeroFila}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-red-400">
                                                {filaExcluida.razon === 'sin_fecha' ? (
                                                    <span className="flex items-center gap-1">
                                                        <X className="h-3 w-3" />
                                                        Sin fecha válida
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        Fecha fuera de rango
                                                    </span>
                                                )}
                                            </td>
                                            {excelData.headers.map((header, colIdx) => (
                                                <td key={colIdx} className="px-3 py-2 text-xs text-gray-300">
                                                    {filaExcluida.datos[header] || '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
