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
        <div className="min-h-screen relative p-8 pb-20 overflow-hidden">
            {/* Efectos de luz verde */}
            <div className="absolute top-20 left-20 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-green-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

            <div className="max-w-6xl mx-auto space-y-8 relative z-10">
                {/* Header con Logo */}
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
                        <div className="flex items-center gap-4 mb-4">
                            <Link href="/" className="hover:opacity-80 transition-opacity">
                                <img
                                    src="/logogrow.png"
                                    alt="Grow Labs"
                                    className="h-16 w-auto drop-shadow-2xl"
                                    style={{
                                        filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.5))'
                                    }}
                                />
                            </Link>
                            <div>
                                <h1 className="text-4xl font-bold mb-2 tracking-tight">
                                    <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                                        Módulo Ginecología
                                    </span>
                                </h1>
                                <p className="text-gray-400 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-blue-400" />
                                    Procesamiento de liquidaciones por hora
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upload Excel Card */}
                <div
                    className="relative rounded-2xl shadow-2xl overflow-hidden p-8"
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.3)',
                    }}
                >
                    {/* Borde brillante animado */}
                    <div
                        className="absolute inset-0 rounded-2xl"
                        style={{
                            background: 'linear-gradient(45deg, transparent, rgba(59, 130, 246, 0.3), transparent)',
                            animation: 'borderGlow 3s ease-in-out infinite',
                        }}
                    ></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-blue-400 flex items-center gap-2">
                                <Upload className="h-6 w-6" />
                                Cargar Liquidación
                            </h2>
                            <Button
                                onClick={() => router.push('/ginecologia/resumenes')}
                                variant="outline"
                                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                            >
                                Ver Resúmenes
                            </Button>
                        </div>

                        <UploadExcel onUpload={handleUpload} isProcessing={isProcessing} />

                        {/* Mensaje de error */}
                        {error && (
                            <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3 text-red-400">
                                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                                <div>
                                    <h3 className="font-semibold">Error de Procesamiento</h3>
                                    <p className="text-sm opacity-90">{error}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>


                {/* Reglas de Negocio */}
                <div
                    className="p-8 rounded-2xl"
                    style={{
                        background: 'linear-gradient(145deg, rgba(20, 20, 25, 0.9), rgba(10, 10, 15, 0.95))',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    }}
                >
                    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/10">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 shadow-inner">
                            <FileText className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                Reglas de Liquidación Vigentes
                            </h3>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">Ginecología</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pago por Consulta */}
                        <div className="relative group overflow-hidden rounded-xl bg-gradient-to-b from-white/5 to-transparent p-5 border border-white/5 transition-all hover:border-white/10">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-green-500/20 transition-all"></div>

                            <div className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                Pago por Consulta
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">Valor Variable</div>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Se abona un valor fijo por cada consulta realizada. El importe depende exclusivamente de la <span className="text-white font-medium">Obra Social</span> del paciente, según la tabla de valores vigente para el mes.
                            </p>
                        </div>

                        {/* Médicos de Planta */}
                        <div className="relative group overflow-hidden rounded-xl bg-gradient-to-b from-white/5 to-transparent p-5 border border-white/5 transition-all hover:border-white/10">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-all"></div>

                            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <User className="h-3 w-3" />
                                Médicos de Planta
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">100% Abonable</div>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Los médicos de planta (no residentes) cobran <span className="text-white font-medium">siempre el 100%</span> del valor de la consulta, sin importar el día ni el horario en que se realice.
                            </p>
                        </div>
                    </div>

                    {/* Regla de Residentes */}
                    <div className="mt-6 rounded-xl overflow-hidden border border-white/5 bg-gradient-to-b from-[#1a1b26] to-[#13141c]">
                        <div className="p-4 bg-white/[0.03] border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-purple-400" />
                                <span className="font-semibold text-gray-200">Regla de Residentes en Horario Formativo</span>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                                Condición Especial
                            </span>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-1 rounded-md bg-red-500/10 text-red-500">
                                        <X className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white mb-0.5"> NO SE PAGA (Horario Formativo)</div>
                                        <p className="text-sm text-gray-400 leading-snug">
                                            Si la consulta cumple las 3 condiciones:
                                        </p>
                                        <ul className="mt-2 space-y-2 text-sm text-gray-400">
                                            <li className="flex items-center gap-2">
                                                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                                                Día <strong className="text-gray-300">Lunes a Sábado</strong>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                                                Horario entre <strong className="text-gray-300">07:00 y 13:00</strong>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                                                El médico es <strong className="text-gray-300">Residente</strong>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-1 rounded-md bg-green-500/10 text-green-500">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white mb-0.5"> SÍ SE PAGA (Guardia)</div>
                                        <p className="text-sm text-gray-400 leading-snug">
                                            En cualquier otro caso:
                                        </p>
                                        <ul className="mt-2 space-y-2 text-sm text-gray-400">
                                            <li className="flex items-center gap-2">
                                                <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                                                <strong className="text-gray-300">Domingos</strong> (todo el día)
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                                                <strong className="text-gray-300">Feriados</strong> (todo el día)
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                                                Lunes a Sab. fuera de horario (ej: <strong className="text-gray-300">16:00, 20:00</strong>)
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Ejemplos Visuales con Timeline */}
                        <div className="px-6 pb-6 pt-2 border-t border-white/5">
                            <div className="text-xs font-semibold text-gray-500 uppercase mb-4 tracking-wider">Línea de Tiempo (Lunes - Sábado)</div>
                            <div className="relative h-12 flex items-center w-full bg-gray-800/50 rounded-lg overflow-hidden border border-white/5">
                                {/* Zona Formativa (07:00 - 13:00) */}
                                <div className="absolute left-[29.16%] h-full bg-red-500/10 border-x border-red-500/20 flex items-center justify-center" style={{ width: '25%' }}>
                                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-tight">Formativo</span>
                                </div>

                                {/* Marcadores de hora */}
                                <div className="absolute left-[29.16%] -top-1 h-3 w-px bg-gray-600"></div>
                                <div className="absolute left-[29.16%] top-8 text-[10px] text-gray-500 font-mono -ml-3">07:00</div>

                                <div className="absolute left-[54.16%] -top-1 h-3 w-px bg-gray-600"></div>
                                <div className="absolute left-[54.16%] top-8 text-[10px] text-gray-500 font-mono -ml-3">13:00</div>

                                {/* Zona Guardia */}
                                <div className="w-full flex justify-between px-4 text-[10px] text-gray-400 font-mono uppercase">
                                    <span>00:00</span>
                                    <span>24:00</span>
                                </div>
                            </div>
                            <div className="flex justify-between mt-2 text-[10px] text-gray-500">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500/20 border border-red-500/50 rounded-sm"></span> No se paga</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-800 border border-gray-600 rounded-sm"></span> Se paga (Guardia)</span>
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
