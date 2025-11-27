'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadExcel } from '@/components/custom/UploadExcel'
import { ExcelDataTable } from '@/components/custom/ExcelDataTable'
import { EstadisticasObraSocial } from '@/components/custom/EstadisticasObraSocial'
import { MesSelectorModal } from '@/components/custom/MesSelectorModal'
import { NotificationModal, NotificationType } from '@/components/custom/NotificationModal'
import { readExcelFile, ExcelData } from '@/lib/excel-reader'
import { procesarExcelGinecologia } from '@/lib/ginecologia-processor'
import { AlertCircle, CheckCircle2, Sparkles, ArrowLeft } from 'lucide-react'
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
            const data = await readExcelFile(file)
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

                if (resultado.errores.length > 0) {
                    showNotification(
                        'error',
                        `Se procesaron ${resultado.procesadas} filas. Errores: ${resultado.errores.length}`,
                        'Procesamiento con errores'
                    )
                } else if (resultado.advertencias.length > 0) {
                    showNotification(
                        'warning',
                        `Se procesaron ${resultado.procesadas} de ${resultado.totalFilas} filas. ${resultado.advertencias.length} advertencias.`,
                        'Procesamiento completado'
                    )
                } else {
                    showNotification(
                        'success',
                        `Se procesaron y guardaron ${resultado.procesadas} consultas correctamente.`,
                        'Guardado exitoso'
                    )
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

    // Extraer mes y año del período del Excel (usar el seleccionado)
    const obtenerMesAnio = () => {
        return { mes: mesSeleccionado, anio: anioSeleccionado }
    }

    const handleCellUpdate = async (rowIndex: number, column: string, newValue: any) => {
        // Aquí puedes guardar los cambios en la base de datos o en el estado
        console.log(`Actualizando fila ${rowIndex}, columna ${column} con valor:`, newValue)
        // TODO: Implementar guardado en base de datos si es necesario
    }

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
                            <h2 className="text-2xl font-bold text-blue-400">
                                📤 Cargar Liquidación
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

                {/* Tabla de datos del Excel */}
                {excelData && (
                    <div 
                        className="relative rounded-2xl shadow-2xl overflow-hidden p-8"
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.3)',
                        }}
                    >
                        <div className="relative">
                            <h2 className="text-2xl font-bold text-blue-400 mb-6">
                                📊 Datos del Excel
                            </h2>
                            <ExcelDataTable
                                data={excelData}
                                especialidad="Ginecología"
                                onCellUpdate={handleCellUpdate}
                            />
                        </div>
                    </div>
                )}

                {/* Estadísticas por Obra Social */}
                {excelData && excelData.periodo && (() => {
                    const { mes, anio } = obtenerMesAnio()
                    return (
                        <div 
                            className="relative rounded-2xl shadow-2xl overflow-hidden p-8"
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.3)',
                            }}
                        >
                            <EstadisticasObraSocial
                                mes={mes}
                                anio={anio}
                                especialidad="Ginecología"
                            />
                        </div>
                    )
                })()}

                {/* Reglas de Negocio */}
                <div 
                    className="p-6 rounded-xl"
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.2)',
                    }}
                >
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">
                            📋 Reglas Vigentes
                        </h3>
                        <div className="space-y-4 text-sm text-gray-300">
                            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pago por Hora</div>
                                <div className="font-semibold text-white">Según Tarifa</div>
                                <div className="text-xs text-gray-400">Valor hora vigente</div>
                            </div>

                            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Residentes</div>
                                <div className="text-sm">
                                    <span className="text-blue-400">07:30 - 15:00</span> = $0
                                </div>
                                <div className="text-xs text-gray-400 mt-1">Horario formativo</div>
                            </div>

                            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Planta</div>
                                <div className="text-sm text-green-400">100% Pago</div>
                                <div className="text-xs text-gray-400">Sin restricciones horarias</div>
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
        </div>
    )
}
