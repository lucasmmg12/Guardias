'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadExcel } from '@/components/custom/UploadExcel'
import { MesSelectorModal } from '@/components/custom/MesSelectorModal'
import { NotificationModal, NotificationType } from '@/components/custom/NotificationModal'
import { readExcelFileGinecologia, readExcelFileHorasGuardiasClinicas, ExcelData } from '@/lib/excel-reader'
import { procesarExcelGuardiasClinicas } from '@/lib/guardias-clinicas-processor'
import { AlertTriangle, XCircle, AlertCircle, Sparkles, ArrowLeft, X, Upload, FileText, Clock, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function GuardiasClinicasPage() {
    const router = useRouter()
    const [isProcessingConsultas, setIsProcessingConsultas] = useState(false)
    const [isProcessingHoras, setIsProcessingHoras] = useState(false)
    const [excelDataConsultas, setExcelDataConsultas] = useState<ExcelData | null>(null)
    const [excelDataHoras, setExcelDataHoras] = useState<ExcelData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showMesSelector, setShowMesSelector] = useState(false)
    const [mesDetectado, setMesDetectado] = useState<number | null>(null)
    const [anioDetectado, setAnioDetectado] = useState<number | null>(null)
    const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1)
    const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear())
    const [archivoConsultas, setArchivoConsultas] = useState<File | null>(null)
    const [archivoHoras, setArchivoHoras] = useState<File | null>(null)
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

    const handleUploadConsultas = async (file: File) => {
        setIsProcessingConsultas(true)
        setError(null)
        setArchivoConsultas(file)

        try {
            const data = await readExcelFileGinecologia(file)
            setExcelDataConsultas(data)
            
            // Detectar mes y año automáticamente
            const { mes, anio } = detectarMesAnio(data)
            if (mes && anio) {
                setMesDetectado(mes)
                setAnioDetectado(anio)
                setMesSeleccionado(mes)
                setAnioSeleccionado(anio)
            }
        } catch (err: any) {
            console.error('Error processing file:', err)
            setError(err.message || 'Ocurrió un error inesperado al procesar el archivo de consultas.')
        } finally {
            setIsProcessingConsultas(false)
        }
    }

    const handleUploadHoras = async (file: File) => {
        setIsProcessingHoras(true)
        setError(null)
        setArchivoHoras(file)

        try {
            const data = await readExcelFileHorasGuardiasClinicas(file)
            setExcelDataHoras(data)
        } catch (err: any) {
            console.error('Error processing file:', err)
            setError(err.message || 'Ocurrió un error inesperado al procesar el archivo de horas.')
        } finally {
            setIsProcessingHoras(false)
        }
    }

    const handleMesConfirmado = async (mes: number, anio: number) => {
        setMesSeleccionado(mes)
        setAnioSeleccionado(anio)
        setShowMesSelector(false)

        // Si hay datos de ambos archivos, procesar y guardar
        if (excelDataConsultas && excelDataHoras && archivoConsultas && archivoHoras) {
            setIsGuardando(true)
            try {
                const resultado = await procesarExcelGuardiasClinicas(
                    excelDataConsultas,
                    excelDataHoras,
                    mes,
                    anio,
                    archivoConsultas.name,
                    archivoHoras.name
                )

                // Guardar resultado del procesamiento
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
                    // Limpiar datos después de procesar exitosamente
                    setExcelDataConsultas(null)
                    setExcelDataHoras(null)
                    setArchivoConsultas(null)
                    setArchivoHoras(null)

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
                            `Se procesaron y guardaron ${resultado.procesadas} registros correctamente. Para editar los datos, ve a "Ver Resumen", selecciona el mes ${nombreMes} ${anio} y edita desde ahí.`,
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
        } else {
            showNotification(
                'warning',
                'Debes subir ambos archivos (consultas y horas) antes de procesar.',
                'Archivos incompletos'
            )
        }
    }

    const puedeProcesar = excelDataConsultas && excelDataHoras && archivoConsultas && archivoHoras

    return (
        <div className="min-h-screen relative p-8 pb-20 overflow-hidden">
            {/* Efectos de luz rosa */}
            <div className="absolute top-20 left-20 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

            <div className="max-w-6xl mx-auto space-y-8 relative z-10">
                {/* Header con Logo */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={() => router.push('/')}
                            variant="outline"
                            className="border-pink-500/50 text-pink-400 hover:bg-pink-500/20"
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
                                        filter: 'drop-shadow(0 0 20px rgba(236, 72, 153, 0.5))'
                                    }}
                                />
                            </Link>
                            <div>
                                <h1 className="text-4xl font-bold mb-2 tracking-tight">
                                    <span className="bg-gradient-to-r from-pink-400 to-rose-300 bg-clip-text text-transparent">
                                        Módulo Guardias Clínicas
                                    </span>
                                </h1>
                                <p className="text-gray-400 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-pink-400" />
                                    Liquidación por consultas y horas trabajadas
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upload Excel Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Card Consultas */}
                    <div 
                        className="relative rounded-2xl shadow-2xl overflow-hidden p-8"
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(236, 72, 153, 0.3)',
                            boxShadow: '0 8px 32px 0 rgba(236, 72, 153, 0.3)',
                        }}
                    >
                        <div className="relative">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-pink-400 flex items-center gap-2">
                                    <FileSpreadsheet className="h-6 w-6" />
                                    Archivo de Consultas
                                </h2>
                                {excelDataConsultas && (
                                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                )}
                            </div>

                            <UploadExcel 
                                onUpload={handleUploadConsultas} 
                                isProcessing={isProcessingConsultas} 
                            />
                        </div>
                    </div>

                    {/* Card Horas */}
                    <div 
                        className="relative rounded-2xl shadow-2xl overflow-hidden p-8"
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(236, 72, 153, 0.3)',
                            boxShadow: '0 8px 32px 0 rgba(236, 72, 153, 0.3)',
                        }}
                    >
                        <div className="relative">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-pink-400 flex items-center gap-2">
                                    <Clock className="h-6 w-6" />
                                    Archivo de Horas
                                </h2>
                                {excelDataHoras && (
                                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                )}
                            </div>

                            <UploadExcel 
                                onUpload={handleUploadHoras} 
                                isProcessing={isProcessingHoras} 
                            />
                        </div>
                    </div>
                </div>

                {/* Botón Procesar */}
                {puedeProcesar && (
                    <div className="flex justify-center">
                        <Button
                            onClick={() => setShowMesSelector(true)}
                            disabled={isGuardando}
                            className="bg-pink-600 hover:bg-pink-500 text-white px-8 py-6 text-lg font-semibold"
                        >
                            {isGuardando ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Procesando...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Upload className="h-5 w-5" />
                                    Procesar Liquidación
                                </div>
                            )}
                        </Button>
                    </div>
                )}

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

                {/* Reglas de Negocio */}
                <div 
                    className="p-6 rounded-xl"
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 8px 32px 0 rgba(236, 72, 153, 0.2)',
                    }}
                >
                    <h3 className="text-xl font-semibold text-gray-200 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Reglas Vigentes
                    </h3>
                    <div className="space-y-4 text-sm text-gray-300">
                        <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cálculo por Consultas</div>
                            <div className="font-semibold text-white">Grupos 70% y 40%</div>
                            <div className="text-xs text-gray-400">GRUPO_70: 70% del bruto | GRUPO_40: 40% del bruto</div>
                        </div>

                        <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cálculo por Horas</div>
                            <div className="text-sm mt-2 space-y-2">
                                <div className="text-gray-300">
                                    <strong>Franjas horarias:</strong> Valores fijos por franja (8-16 y 16-8 días semana)
                                </div>
                                <div className="text-gray-300">
                                    <strong>Fines de semana:</strong> Valores por hora trabajada
                                </div>
                                <div className="text-gray-300">
                                    <strong>Garantía mínima:</strong> Se aplica si el valor por hora es menor al mínimo
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Validaciones Pre-Liquidación
                            </div>
                            <ul className="text-xs space-y-1 mt-2 text-gray-300">
                                <li className="flex items-start gap-2">
                                    <span className="text-pink-400">•</span>
                                    <span>Filas con Duración = 0 o sin hora se excluyen</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-pink-400">•</span>
                                    <span>Obras Sociales "PARTICULARES" o "SIN COBERTURA" se excluyen</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-pink-400">•</span>
                                    <span>Duplicados (mismo paciente/médico/hora) se excluyen</span>
                                </li>
                            </ul>
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
                <div className="fixed bottom-4 right-4 p-4 rounded-lg bg-pink-500/20 border border-pink-500/50 text-pink-400">
                    Guardando datos en la base de datos...
                </div>
            )}

            {/* Sección de filas excluidas */}
            {resultadoProcesamiento && resultadoProcesamiento.filasExcluidas && resultadoProcesamiento.filasExcluidas.length > 0 && excelDataConsultas && (
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
                                        Estas filas fueron excluidas según las validaciones pre-liquidación.
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
                                        {excelDataConsultas.headers.map((header, idx) => (
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
                                                {filaExcluida.razon === 'sin_fecha' && (
                                                    <span className="flex items-center gap-1">
                                                        <X className="h-3 w-3" />
                                                        Sin fecha válida
                                                    </span>
                                                )}
                                                {filaExcluida.razon === 'fecha_invalida' && (
                                                    <span className="flex items-center gap-1">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        Fecha fuera de rango
                                                    </span>
                                                )}
                                                {filaExcluida.razon === 'duracion_cero' && (
                                                    <span className="flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Duración = 0
                                                    </span>
                                                )}
                                                {filaExcluida.razon === 'sin_hora' && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Sin hora
                                                    </span>
                                                )}
                                                {filaExcluida.razon === 'particular' && (
                                                    <span className="flex items-center gap-1">
                                                        <X className="h-3 w-3" />
                                                        PARTICULARES/SIN COBERTURA
                                                    </span>
                                                )}
                                                {filaExcluida.razon === 'duplicado' && (
                                                    <span className="flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Duplicado
                                                    </span>
                                                )}
                                            </td>
                                            {excelDataConsultas.headers.map((header, colIdx) => (
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

