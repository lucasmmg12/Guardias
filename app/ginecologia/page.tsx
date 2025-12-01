'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UploadExcel } from '@/components/custom/UploadExcel'
import { ExcelDataTable } from '@/components/custom/ExcelDataTable'
import { EstadisticasObraSocial } from '@/components/custom/EstadisticasObraSocial'
import { MesSelectorModal } from '@/components/custom/MesSelectorModal'
import { NotificationModal, NotificationType } from '@/components/custom/NotificationModal'
import { DetalleGuardiaTable } from '@/components/custom/DetalleGuardiaTable'
import { readExcelFile, ExcelData } from '@/lib/excel-reader'
import { procesarExcelGinecologia } from '@/lib/ginecologia-processor'
import { supabase } from '@/lib/supabase/client'
import { LiquidacionGuardia, EstadoLiquidacion } from '@/lib/types'
import { AlertCircle, CheckCircle2, Sparkles, ArrowLeft, Clock } from 'lucide-react'
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
    const [liquidacionActual, setLiquidacionActual] = useState<LiquidacionGuardia | null>(null)
    const [mostrarTablaDetalles, setMostrarTablaDetalles] = useState(false)
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
                    // Cargar la liquidación guardada
                    if (resultado.liquidacionId) {
                        const { data: liquidacionData } = await supabase
                            .from('liquidaciones_guardia')
                            .select('*')
                            .eq('id', resultado.liquidacionId)
                            .single()
                        
                        if (liquidacionData) {
                            const liquidacion = liquidacionData as LiquidacionGuardia
                            setLiquidacionActual(liquidacion)
                            // NO ocultar ExcelDataTable, mantenerlo visible para revisión
                        }
                    }

                    if (resultado.advertencias.length > 0) {
                        showNotification(
                            'warning',
                            `Se procesaron ${resultado.procesadas} de ${resultado.totalFilas} filas. ${resultado.advertencias.length} advertencias. Revisa los datos en la tabla.`,
                            'Procesamiento completado'
                        )
                    } else {
                        showNotification(
                            'success',
                            `Se procesaron y guardaron ${resultado.procesadas} consultas. Revisa y edita los datos en la tabla.`,
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

    // Cargar liquidación existente al montar (si hay una en progreso)
    useEffect(() => {
        async function cargarLiquidacionEnProgreso() {
            try {
                const { data, error } = await supabase
                    .from('liquidaciones_guardia')
                    .select('*')
                    .eq('especialidad', 'Ginecología')
                    .in('estado', ['pendiente_revision', 'revisado', 'listo_para_liquidar', 'finalizada'])
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()

                if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                    console.error('Error cargando liquidación:', error)
                    return
                }

                if (data) {
                    const liquidacion = data as LiquidacionGuardia
                    setLiquidacionActual(liquidacion)
                    setMesSeleccionado(liquidacion.mes)
                    setAnioSeleccionado(liquidacion.anio)
                    // Cargar ExcelData desde los detalles guardados si es necesario
                    // Por ahora, solo cargar la liquidación para mostrar el estado
                }
            } catch (error) {
                console.error('Error cargando liquidación:', error)
            }
        }

        cargarLiquidacionEnProgreso()
    }, [])

    // Extraer mes y año del período del Excel (usar el seleccionado)
    const obtenerMesAnio = () => {
        return { mes: mesSeleccionado, anio: anioSeleccionado }
    }

    // Mapa para guardar cambios pendientes (debounce)
    const cambiosPendientesRef = useRef<Map<string, { liquidacionId: string; filaExcel: number; columna: string; valor: any }>>(new Map())
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    const handleCellUpdate = async (rowIndex: number, column: string, newValue: any) => {
        if (!liquidacionActual || !excelData) return

        // El rowIndex en ExcelDataTable corresponde a la fila del Excel (empezando en 0)
        // Pero fila_excel en la BD es el número de fila real del Excel (empezando en 1)
        const filaExcel = rowIndex + 1

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
    }

    const guardarCambiosPendientes = async () => {
        if (cambiosPendientesRef.current.size === 0) return

        setSaveStatus('saving')
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

            // Guardar cada fila
            const promesas = Array.from(cambiosPorFila.entries()).map(async ([filaExcel, campos]) => {
                const updateData: any = {}
                campos.forEach((valor, campo) => {
                    updateData[campo] = valor
                })
                updateData.updated_at = new Date().toISOString()

                const { error } = await supabase
                    .from('detalle_guardia')
                    // @ts-ignore
                    .update(updateData)
                    .eq('liquidacion_id', liquidacionActual!.id)
                    .eq('fila_excel', filaExcel)

                if (error) throw error
            })

            await Promise.all(promesas)

            // Limpiar cambios pendientes
            cambiosPendientesRef.current.clear()
            setSaveStatus('saved')

            // Resetear estado después de 2 segundos
            setTimeout(() => {
                setSaveStatus('idle')
            }, 2000)
        } catch (error) {
            console.error('Error guardando cambios:', error)
            setSaveStatus('error')
            
            // Reintentar después de 3 segundos
            setTimeout(() => {
                if (cambiosPendientesRef.current.size > 0) {
                    guardarCambiosPendientes()
                }
            }, 3000)
        }
    }

    // Guardar antes de desmontar
    useEffect(() => {
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current)
            }
            if (cambiosPendientesRef.current.size > 0) {
                guardarCambiosPendientes()
            }
        }
    }, [])

    // Guardar antes de cerrar/recargar
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (cambiosPendientesRef.current.size > 0) {
                e.preventDefault()
                e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?'
                guardarCambiosPendientes()
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [])

    // Guardado periódico cada 10 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            if (cambiosPendientesRef.current.size > 0) {
                guardarCambiosPendientes()
            }
        }, 10000)

        return () => clearInterval(interval)
    }, [])

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

                {/* Selector de estado y barra de guardado (si hay liquidación) */}
                {liquidacionActual && (
                    <div 
                        className="relative rounded-2xl shadow-2xl overflow-hidden p-6"
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.3)',
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    {saveStatus === 'saving' && (
                                        <>
                                            <Clock className="h-4 w-4 text-yellow-400 animate-spin" />
                                            <span className="text-sm text-yellow-400">Guardando...</span>
                                        </>
                                    )}
                                    {saveStatus === 'saved' && (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                                            <span className="text-sm text-green-400">Guardado</span>
                                        </>
                                    )}
                                    {saveStatus === 'error' && (
                                        <>
                                            <AlertCircle className="h-4 w-4 text-red-400" />
                                            <span className="text-sm text-red-400">Error al guardar. Reintentando...</span>
                                        </>
                                    )}
                                    {saveStatus === 'idle' && cambiosPendientesRef.current.size > 0 && (
                                        <span className="text-sm text-gray-400">
                                            {cambiosPendientesRef.current.size} cambio(s) pendiente(s)
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-300">Estado:</label>
                                    <select
                                        value={liquidacionActual.estado}
                                        onChange={async (e) => {
                                            const nuevoEstado = e.target.value as EstadoLiquidacion
                                            try {
                                                const { error } = await supabase
                                                    .from('liquidaciones_guardia')
                                                    // @ts-ignore
                                                    .update({ estado: nuevoEstado })
                                                    .eq('id', liquidacionActual.id)

                                                if (error) throw error
                                                setLiquidacionActual(prev => prev ? { ...prev, estado: nuevoEstado } : null)
                                            } catch (error) {
                                                console.error('Error actualizando estado:', error)
                                                showNotification('error', 'Error al actualizar el estado', 'Error')
                                            }
                                        }}
                                        className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-green-400 focus:outline-none"
                                    >
                                        <option value="borrador">Borrador</option>
                                        <option value="procesando">Procesando</option>
                                        <option value="pendiente_revision">Pendiente de Revisión</option>
                                        <option value="revisado">Revisado</option>
                                        <option value="listo_para_liquidar">Listo para Liquidar</option>
                                        <option value="finalizada">Finalizada</option>
                                    </select>
                                </div>
                                {cambiosPendientesRef.current.size > 0 && (
                                    <Button
                                        onClick={() => guardarCambiosPendientes()}
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-500"
                                    >
                                        Guardar ahora
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabla de datos del Excel (mostrar siempre después de procesar) */}
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
                                📊 Datos del Excel - Revisión y Edición
                            </h2>
                            {liquidacionActual && (
                                <p className="text-gray-400 mb-4 text-sm">
                                    Los cambios se guardan automáticamente. Revisa duplicados, filas sin obra social y sin horario.
                                </p>
                            )}
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
                                <div className="text-xs text-gray-400">Valor hora vigente por obra social</div>
                            </div>

                            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">👨‍⚕️ Regla de Residentes en Horario Formativo</div>
                                <div className="text-sm mt-2 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-red-400 font-semibold">NO SE PAGA</span>
                                        <span className="text-xs text-gray-400">si se cumplen todas las condiciones:</span>
                                    </div>
                                    <ul className="text-xs space-y-1 ml-2 text-gray-300">
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-400">•</span>
                                            <span>Médico es <strong>RESIDENTE</strong> (verificado en BD)</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-400">•</span>
                                            <span>Día: <strong>Lunes a Sábado</strong> (no domingo)</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-400">•</span>
                                            <span>Horario: <strong className="text-blue-400">07:00 a 15:00</strong></span>
                                        </li>
                                        <li className="text-xs text-gray-400 mt-1 ml-4">
                                            (Incluye 07:00, excluye 15:00)
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">✅ Casos que SÍ se Pagan</div>
                                <ul className="text-xs space-y-1 mt-2 text-gray-300">
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-400">✓</span>
                                        <span>Residente fuera del horario formativo (ej: 16:00, 20:00)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-400">✓</span>
                                        <span>Residente en <strong>Domingo</strong> (cualquier hora)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-400">✓</span>
                                        <span>Médico de <strong>Planta</strong> (no residente) - siempre se paga</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">📊 Ejemplos de Horarios</div>
                                <div className="text-xs space-y-1 mt-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-300">07:00 (Residente, L-S)</span>
                                        <span className="text-red-400">$0</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-300">14:59 (Residente, L-S)</span>
                                        <span className="text-red-400">$0</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-300">15:00 (Residente, L-S)</span>
                                        <span className="text-green-400">Se paga</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-300">10:00 (Residente, Domingo)</span>
                                        <span className="text-green-400">Se paga</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-300">10:00 (Planta, cualquier día)</span>
                                        <span className="text-green-400">Se paga</span>
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

            {/* Indicador de guardado */}
            {isGuardando && (
                <div className="fixed bottom-4 right-4 p-4 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-400">
                    Guardando datos en la base de datos...
                </div>
            )}
        </div>
    )
}
