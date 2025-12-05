'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { UploadExcel } from '@/components/custom/UploadExcel'
import { MesSelectorModal } from '@/components/custom/MesSelectorModal'
import { NotificationModal, NotificationType } from '@/components/custom/NotificationModal'
import { readExcelFileGinecologia, readExcelFileHorasGuardiasClinicas, ExcelData } from '@/lib/excel-reader'
import { procesarExcelGuardiasClinicas } from '@/lib/guardias-clinicas-processor'
import { 
    ClinicalGroupsConfig, 
    ClinicalGroupsConfigInsert, 
    ClinicalValuesConfig, 
    ClinicalValuesConfigInsert,
    Medico 
} from '@/lib/types'
import { AlertTriangle, XCircle, AlertCircle, Sparkles, ArrowLeft, X, Upload, FileText, Clock, FileSpreadsheet, Settings, Users, DollarSign, Copy, Search, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

export default function GuardiasClinicasPage() {
    const router = useRouter()
    
    // Estados de pestañas
    const [activeTab, setActiveTab] = useState<'configuracion' | 'procesamiento'>('configuracion')
    
    // Estados de configuración
    const [mesConfig, setMesConfig] = useState(new Date().getMonth() + 1)
    const [anioConfig, setAnioConfig] = useState(new Date().getFullYear())
    const [grupos70, setGrupos70] = useState<ClinicalGroupsConfig[]>([])
    const [grupos40, setGrupos40] = useState<ClinicalGroupsConfig[]>([])
    const [valoresConfig, setValoresConfig] = useState<ClinicalValuesConfig | null>(null)
    const [medicos, setMedicos] = useState<Medico[]>([])
    const [loadingConfig, setLoadingConfig] = useState(false)
    const [showMedicoSelector, setShowMedicoSelector] = useState(false)
    const [grupoSeleccionado, setGrupoSeleccionado] = useState<'GRUPO_70' | 'GRUPO_40' | null>(null)
    const [searchMedico, setSearchMedico] = useState('')
    
    // Estados de procesamiento
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

    // Cargar médicos al iniciar
    useEffect(() => {
        cargarMedicos()
    }, [])

    // Cargar configuración cuando cambia mes/año
    useEffect(() => {
        if (activeTab === 'configuracion') {
            cargarConfiguracion()
        }
    }, [mesConfig, anioConfig, activeTab])

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

    async function cargarMedicos() {
        try {
            const { data, error } = await supabase
                .from('medicos')
                .select('*')
                .eq('activo', true)
                .order('nombre', { ascending: true })

            if (error) throw error
            setMedicos(data || [])
        } catch (error) {
            console.error('Error cargando médicos:', error)
        }
    }

    async function cargarConfiguracion() {
        try {
            setLoadingConfig(true)

            // Cargar grupos
            const { data: gruposData, error: gruposError } = await supabase
                .from('clinical_groups_config')
                .select('*')
                .eq('mes', mesConfig)
                .eq('anio', anioConfig)

            if (gruposError) throw gruposError

            const grupos = (gruposData || []) as ClinicalGroupsConfig[]
            setGrupos70(grupos.filter(g => g.group_type === 'GRUPO_70'))
            setGrupos40(grupos.filter(g => g.group_type === 'GRUPO_40'))

            // Cargar valores
            const { data: valoresData, error: valoresError } = await supabase
                .from('clinical_values_config')
                .select('*')
                .eq('mes', mesConfig)
                .eq('anio', anioConfig)
                .single()

            if (valoresError && valoresError.code !== 'PGRST116') {
                throw valoresError
            }

            setValoresConfig(valoresData as ClinicalValuesConfig | null)
        } catch (error) {
            console.error('Error cargando configuración:', error)
            showNotification('error', 'Error al cargar configuración: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'Error')
        } finally {
            setLoadingConfig(false)
        }
    }

    async function handleAgregarMedicoAGrupo(medicoId: string) {
        if (!grupoSeleccionado) return

        try {
            setLoadingConfig(true)

            // Verificar si ya existe
            const { data: existente, error: errorExistente } = await supabase
                .from('clinical_groups_config')
                .select('*')
                .eq('doctor_id', medicoId)
                .eq('mes', mesConfig)
                .eq('anio', anioConfig)
                .single()

            if (existente && !errorExistente) {
                // Actualizar grupo existente
                const grupoExistente = existente as ClinicalGroupsConfig
                const { error } = await supabase
                    .from('clinical_groups_config')
                    // @ts-ignore
                    .update({ group_type: grupoSeleccionado })
                    .eq('id', grupoExistente.id)

                if (error) throw error
            } else {
                // Crear nuevo
                const nuevoGrupo: ClinicalGroupsConfigInsert = {
                    doctor_id: medicoId,
                    mes: mesConfig,
                    anio: anioConfig,
                    group_type: grupoSeleccionado
                }

                const { error } = await supabase
                    .from('clinical_groups_config')
                    // @ts-ignore
                    .insert([nuevoGrupo])

                if (error) throw error
            }

            await cargarConfiguracion()
            setShowMedicoSelector(false)
            setGrupoSeleccionado(null)
            setSearchMedico('')
            showNotification('success', 'Médico agregado al grupo correctamente', 'Éxito')
        } catch (error) {
            console.error('Error agregando médico:', error)
            showNotification('error', 'Error al agregar médico: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'Error')
        } finally {
            setLoadingConfig(false)
        }
    }

    async function handleEliminarMedicoDeGrupo(id: string) {
        if (!confirm('¿Está seguro de que desea eliminar este médico del grupo?')) return

        try {
            setLoadingConfig(true)
            const { error } = await supabase
                .from('clinical_groups_config')
                .delete()
                .eq('id', id)

            if (error) throw error

            await cargarConfiguracion()
            showNotification('success', 'Médico eliminado del grupo correctamente', 'Éxito')
        } catch (error) {
            console.error('Error eliminando médico:', error)
            showNotification('error', 'Error al eliminar médico: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'Error')
        } finally {
            setLoadingConfig(false)
        }
    }

    async function handleCopiarGruposMesAnterior() {
        try {
            setLoadingConfig(true)

            // Calcular mes anterior
            let mesAnterior = mesConfig - 1
            let anioAnterior = anioConfig
            if (mesAnterior === 0) {
                mesAnterior = 12
                anioAnterior = anioConfig - 1
            }

            // Obtener grupos del mes anterior
            const { data: gruposAnteriores, error } = await supabase
                .from('clinical_groups_config')
                .select('*')
                .eq('mes', mesAnterior)
                .eq('anio', anioAnterior)

            if (error) throw error

            const gruposAnterioresData = (gruposAnteriores || []) as ClinicalGroupsConfig[]

            if (gruposAnterioresData.length === 0) {
                showNotification('warning', 'No hay grupos en el mes anterior para copiar', 'Sin datos')
                return
            }

            // Eliminar grupos existentes del mes actual
            await supabase
                .from('clinical_groups_config')
                .delete()
                .eq('mes', mesConfig)
                .eq('anio', anioConfig)

            // Copiar grupos
            const nuevosGrupos: ClinicalGroupsConfigInsert[] = gruposAnterioresData.map(g => ({
                doctor_id: g.doctor_id,
                mes: mesConfig,
                anio: anioConfig,
                group_type: g.group_type
            }))

            const { error: insertError } = await supabase
                .from('clinical_groups_config')
                // @ts-ignore
                .insert(nuevosGrupos)

            if (insertError) throw insertError

            await cargarConfiguracion()
            showNotification('success', `Se copiaron ${nuevosGrupos.length} grupos desde ${MESES[mesAnterior - 1].label} ${anioAnterior}`, 'Copia exitosa')
        } catch (error) {
            console.error('Error copiando grupos:', error)
            showNotification('error', 'Error al copiar grupos: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'Error')
        } finally {
            setLoadingConfig(false)
        }
    }

    async function handleGuardarValores() {
        try {
            setLoadingConfig(true)

            if (!valoresConfig) {
                showNotification('error', 'Debe completar todos los valores', 'Error')
                return
            }

            const valoresData: ClinicalValuesConfigInsert = {
                mes: mesConfig,
                anio: anioConfig,
                value_hour_weekly_8_16: valoresConfig.value_hour_weekly_8_16,
                value_hour_weekly_16_8: valoresConfig.value_hour_weekly_16_8,
                value_hour_weekend: valoresConfig.value_hour_weekend,
                value_hour_weekend_night: valoresConfig.value_hour_weekend_night,
                value_guaranteed_min: valoresConfig.value_guaranteed_min
            }

            // Verificar si existe
            const { data: existente, error: errorExistente } = await supabase
                .from('clinical_values_config')
                .select('*')
                .eq('mes', mesConfig)
                .eq('anio', anioConfig)
                .single()

            if (existente && !errorExistente) {
                // Actualizar
                const valoresExistente = existente as ClinicalValuesConfig
                const { error } = await supabase
                    .from('clinical_values_config')
                    // @ts-ignore
                    .update(valoresData)
                    .eq('id', valoresExistente.id)

                if (error) throw error
            } else {
                // Crear
                const { error } = await supabase
                    .from('clinical_values_config')
                    // @ts-ignore
                    .insert([valoresData])

                if (error) throw error
            }

            await cargarConfiguracion()
            showNotification('success', 'Valores guardados correctamente', 'Éxito')
        } catch (error) {
            console.error('Error guardando valores:', error)
            showNotification('error', 'Error al guardar valores: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'Error')
        } finally {
            setLoadingConfig(false)
        }
    }

    async function handleCopiarValoresMesAnterior() {
        try {
            setLoadingConfig(true)

            // Calcular mes anterior
            let mesAnterior = mesConfig - 1
            let anioAnterior = anioConfig
            if (mesAnterior === 0) {
                mesAnterior = 12
                anioAnterior = anioConfig - 1
            }

            // Obtener valores del mes anterior
            const { data: valoresAnteriores, error } = await supabase
                .from('clinical_values_config')
                .select('*')
                .eq('mes', mesAnterior)
                .eq('anio', anioAnterior)
                .single()

            if (error && error.code !== 'PGRST116') {
                throw error
            }

            if (!valoresAnteriores) {
                showNotification('warning', 'No hay valores en el mes anterior para copiar', 'Sin datos')
                return
            }

            const valoresAnterioresData = valoresAnteriores as ClinicalValuesConfig

            // Actualizar estado
            setValoresConfig({
                ...valoresAnterioresData,
                mes: mesConfig,
                anio: anioConfig
            })

            showNotification('success', `Valores copiados desde ${MESES[mesAnterior - 1].label} ${anioAnterior}`, 'Copia exitosa')
        } catch (error) {
            console.error('Error copiando valores:', error)
            showNotification('error', 'Error al copiar valores: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'Error')
        } finally {
            setLoadingConfig(false)
        }
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

    // Filtrar médicos para el selector
    const medicosFiltrados = medicos.filter(m => 
        m.nombre.toLowerCase().includes(searchMedico.toLowerCase())
    )

    // Obtener nombres de médicos para los grupos
    const obtenerNombreMedico = (doctorId: string) => {
        const medico = medicos.find(m => m.id === doctorId)
        return medico ? medico.nombre : 'Desconocido'
    }

    return (
        <div className="min-h-screen relative p-8 pb-20 overflow-hidden">
            {/* Efectos de luz rosa */}
            <div className="absolute top-20 left-20 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
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

                {/* Pestañas */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('configuracion')}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                            activeTab === 'configuracion'
                                ? 'bg-pink-600 text-white shadow-lg'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                    >
                        <Settings className="h-5 w-5" />
                        Configuración Mensual
                    </button>
                    <button
                        onClick={() => setActiveTab('procesamiento')}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                            activeTab === 'procesamiento'
                                ? 'bg-pink-600 text-white shadow-lg'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                    >
                        <Upload className="h-5 w-5" />
                        Procesar Liquidación
                    </button>
                    <Button
                        onClick={() => router.push('/guardias-clinicas/resumenes')}
                        variant="outline"
                        className="border-pink-500/50 text-pink-400 hover:bg-pink-500/20 flex items-center gap-2"
                    >
                        <FileText className="h-5 w-5" />
                        Ver Resúmenes
                    </Button>
                </div>

                {/* Contenido de Configuración */}
                {activeTab === 'configuracion' && (
                    <div className="space-y-6">
                        {/* Selector de Mes y Año */}
                        <div 
                            className="p-6 rounded-xl"
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(236, 72, 153, 0.3)',
                            }}
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-300 font-semibold">Mes a gestionar:</label>
                                    <select
                                        value={mesConfig}
                                        onChange={(e) => setMesConfig(Number(e.target.value))}
                                        className="px-3 py-2 bg-gray-800 border border-pink-500/50 rounded-lg text-white focus:border-pink-400 focus:outline-none"
                                    >
                                        {MESES.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-300 font-semibold">Año:</label>
                                    <input
                                        type="number"
                                        value={anioConfig}
                                        onChange={(e) => setAnioConfig(Number(e.target.value))}
                                        className="px-3 py-2 bg-gray-800 border border-pink-500/50 rounded-lg text-white w-24 focus:border-pink-400 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sección de Grupos */}
                        <div 
                            className="p-6 rounded-xl"
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(236, 72, 153, 0.3)',
                            }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold text-pink-400 flex items-center gap-2">
                                    <Users className="h-6 w-6" />
                                    Configuración de Grupos
                                </h2>
                                <Button
                                    onClick={handleCopiarGruposMesAnterior}
                                    disabled={loadingConfig}
                                    variant="outline"
                                    className="border-pink-500/50 text-pink-400 hover:bg-pink-500/20 flex items-center gap-2"
                                >
                                    <Copy className="h-4 w-4" />
                                    Copiar mes anterior
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Grupo 70% */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold text-pink-300">Grupo 70%</h3>
                                            <span className="px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/50 text-pink-300 text-sm font-semibold">
                                                {grupos70.length} médico{grupos70.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <Button
                                            onClick={() => {
                                                setGrupoSeleccionado('GRUPO_70')
                                                setShowMedicoSelector(true)
                                            }}
                                            size="sm"
                                            className="bg-pink-600 hover:bg-pink-500 text-white"
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Agregar
                                        </Button>
                                    </div>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {grupos70.length === 0 ? (
                                            <p className="text-gray-400 text-sm">No hay médicos en este grupo</p>
                                        ) : (
                                            grupos70.map(grupo => {
                                                const medico = medicos.find(m => m.id === grupo.doctor_id)
                                                return (
                                                    <div
                                                        key={grupo.id}
                                                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                                                    >
                                                        <span className="text-gray-300 text-sm">{medico?.nombre || 'Desconocido'}</span>
                                                        <button
                                                            onClick={() => handleEliminarMedicoDeGrupo(grupo.id)}
                                                            className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Grupo 40% */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold text-pink-300">Grupo 40%</h3>
                                            <span className="px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/50 text-pink-300 text-sm font-semibold">
                                                {grupos40.length} médico{grupos40.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <Button
                                            onClick={() => {
                                                setGrupoSeleccionado('GRUPO_40')
                                                setShowMedicoSelector(true)
                                            }}
                                            size="sm"
                                            className="bg-pink-600 hover:bg-pink-500 text-white"
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Agregar
                                        </Button>
                                    </div>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {grupos40.length === 0 ? (
                                            <p className="text-gray-400 text-sm">No hay médicos en este grupo</p>
                                        ) : (
                                            grupos40.map(grupo => {
                                                const medico = medicos.find(m => m.id === grupo.doctor_id)
                                                return (
                                                    <div
                                                        key={grupo.id}
                                                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                                                    >
                                                        <span className="text-gray-300 text-sm">{medico?.nombre || 'Desconocido'}</span>
                                                        <button
                                                            onClick={() => handleEliminarMedicoDeGrupo(grupo.id)}
                                                            className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sección de Valores */}
                        <div 
                            className="p-6 rounded-xl"
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(236, 72, 153, 0.3)',
                            }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold text-pink-400 flex items-center gap-2">
                                    <DollarSign className="h-6 w-6" />
                                    Configuración de Valores
                                </h2>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleCopiarValoresMesAnterior}
                                        disabled={loadingConfig}
                                        variant="outline"
                                        className="border-pink-500/50 text-pink-400 hover:bg-pink-500/20 flex items-center gap-2"
                                    >
                                        <Copy className="h-4 w-4" />
                                        Copiar mes anterior
                                    </Button>
                                    <Button
                                        onClick={handleGuardarValores}
                                        disabled={loadingConfig}
                                        className="bg-pink-600 hover:bg-pink-500 text-white"
                                    >
                                        Guardar Valores
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                                        Valor Franja 8-16 días semana
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={valoresConfig?.value_hour_weekly_8_16 || 0}
                                        onChange={(e) => setValoresConfig({
                                            ...(valoresConfig || {
                                                id: '',
                                                mes: mesConfig,
                                                anio: anioConfig,
                                                value_hour_weekly_8_16: 0,
                                                value_hour_weekly_16_8: 0,
                                                value_hour_weekend: 0,
                                                value_hour_weekend_night: 0,
                                                value_guaranteed_min: 0,
                                                created_at: '',
                                                updated_at: ''
                                            }),
                                            value_hour_weekly_8_16: parseFloat(e.target.value) || 0
                                        })}
                                        className="bg-gray-800 border-gray-600 text-white"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                                        Valor Franja 16-8 días semana
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={valoresConfig?.value_hour_weekly_16_8 || 0}
                                        onChange={(e) => setValoresConfig({
                                            ...(valoresConfig || {
                                                id: '',
                                                mes: mesConfig,
                                                anio: anioConfig,
                                                value_hour_weekly_8_16: 0,
                                                value_hour_weekly_16_8: 0,
                                                value_hour_weekend: 0,
                                                value_hour_weekend_night: 0,
                                                value_guaranteed_min: 0,
                                                created_at: '',
                                                updated_at: ''
                                            }),
                                            value_hour_weekly_16_8: parseFloat(e.target.value) || 0
                                        })}
                                        className="bg-gray-800 border-gray-600 text-white"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                                        Valor Hora Fines de Semana/Feriados
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={valoresConfig?.value_hour_weekend || 0}
                                        onChange={(e) => setValoresConfig({
                                            ...(valoresConfig || {
                                                id: '',
                                                mes: mesConfig,
                                                anio: anioConfig,
                                                value_hour_weekly_8_16: 0,
                                                value_hour_weekly_16_8: 0,
                                                value_hour_weekend: 0,
                                                value_hour_weekend_night: 0,
                                                value_guaranteed_min: 0,
                                                created_at: '',
                                                updated_at: ''
                                            }),
                                            value_hour_weekend: parseFloat(e.target.value) || 0
                                        })}
                                        className="bg-gray-800 border-gray-600 text-white"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                                        Valor Hora Nocturna Fines de Semana/Feriados
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={valoresConfig?.value_hour_weekend_night || 0}
                                        onChange={(e) => setValoresConfig({
                                            ...(valoresConfig || {
                                                id: '',
                                                mes: mesConfig,
                                                anio: anioConfig,
                                                value_hour_weekly_8_16: 0,
                                                value_hour_weekly_16_8: 0,
                                                value_hour_weekend: 0,
                                                value_hour_weekend_night: 0,
                                                value_guaranteed_min: 0,
                                                created_at: '',
                                                updated_at: ''
                                            }),
                                            value_hour_weekend_night: parseFloat(e.target.value) || 0
                                        })}
                                        className="bg-gray-800 border-gray-600 text-white"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                                        Valor Mínimo Garantizado por Hora
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={valoresConfig?.value_guaranteed_min || 0}
                                        onChange={(e) => setValoresConfig({
                                            ...(valoresConfig || {
                                                id: '',
                                                mes: mesConfig,
                                                anio: anioConfig,
                                                value_hour_weekly_8_16: 0,
                                                value_hour_weekly_16_8: 0,
                                                value_hour_weekend: 0,
                                                value_hour_weekend_night: 0,
                                                value_guaranteed_min: 0,
                                                created_at: '',
                                                updated_at: ''
                                            }),
                                            value_guaranteed_min: parseFloat(e.target.value) || 0
                                        })}
                                        className="bg-gray-800 border-gray-600 text-white"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Contenido de Procesamiento */}
                {activeTab === 'procesamiento' && (
                    <div className="space-y-8">
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
                )}
            </div>

            {/* Modal de selección de médico */}
            {showMedicoSelector && grupoSeleccionado && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0, 0, 0, 0.8)' }}
                    onClick={() => {
                        setShowMedicoSelector(false)
                        setGrupoSeleccionado(null)
                        setSearchMedico('')
                    }}
                >
                    <div 
                        className="relative rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(236, 72, 153, 0.3)',
                            boxShadow: '0 8px 32px 0 rgba(236, 72, 153, 0.3)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-pink-400">
                                Agregar Médico a {grupoSeleccionado === 'GRUPO_70' ? 'Grupo 70%' : 'Grupo 40%'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowMedicoSelector(false)
                                    setGrupoSeleccionado(null)
                                    setSearchMedico('')
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    type="text"
                                    value={searchMedico}
                                    onChange={(e) => setSearchMedico(e.target.value)}
                                    placeholder="Buscar médico..."
                                    className="pl-10 bg-gray-800 border-gray-600 text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {medicosFiltrados.length === 0 ? (
                                <p className="text-gray-400 text-center py-4">No se encontraron médicos</p>
                            ) : (
                                medicosFiltrados.map(medico => {
                                    const yaEnGrupo70 = grupos70.some(g => g.doctor_id === medico.id)
                                    const yaEnGrupo40 = grupos40.some(g => g.doctor_id === medico.id)
                                    const puedeAgregar = grupoSeleccionado === 'GRUPO_70' ? !yaEnGrupo70 : !yaEnGrupo40

                                    return (
                                        <button
                                            key={medico.id}
                                            onClick={() => puedeAgregar && handleAgregarMedicoAGrupo(medico.id)}
                                            disabled={!puedeAgregar}
                                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                                                puedeAgregar
                                                    ? 'bg-gray-800/50 border-gray-700 hover:bg-pink-500/20 hover:border-pink-500/50 text-gray-300 hover:text-white cursor-pointer'
                                                    : 'bg-gray-800/30 border-gray-800 text-gray-500 cursor-not-allowed'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span>{medico.nombre}</span>
                                                {!puedeAgregar && (
                                                    <span className="text-xs text-gray-500">Ya está en un grupo</span>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    )
}
