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
import { AlertTriangle, XCircle, AlertCircle, Sparkles, ArrowLeft, X, Upload, FileText, Clock, FileSpreadsheet, Settings, Users, DollarSign, Copy, Search, Plus, Trash2, ShieldCheck, Zap, Info } from 'lucide-react'
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
    const [grupos50, setGrupos50] = useState<ClinicalGroupsConfig[]>([])
    const [valoresConfig, setValoresConfig] = useState<ClinicalValuesConfig | null>(null)
    const [medicos, setMedicos] = useState<Medico[]>([])
    const [loadingConfig, setLoadingConfig] = useState(false)
    const [showMedicoSelector, setShowMedicoSelector] = useState(false)
    const [grupoSeleccionado, setGrupoSeleccionado] = useState<'GRUPO_70' | 'GRUPO_50' | null>(null)
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
            setGrupos50(grupos.filter(g => g.group_type === 'GRUPO_50'))

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
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            {/* Fondo con auroras de servidor GrowLabs */}
            <div className="fixed inset-0 z-0 text-white">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-500/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 animate-in slide-in-from-top-4 duration-700">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/20 text-[#00FF88] text-xs font-bold tracking-widest uppercase">
                            <Sparkles className="h-3 w-3" />
                            Premium Powerhouse
                        </div>
                        <h1 className="text-6xl font-black tracking-tighter leading-none">
                            GUARDIAS<br />
                            <span className="text-[#00FF88] italic uppercase">Clínicas</span>
                        </h1>
                        <p className="text-gray-400 text-lg max-w-md font-medium leading-relaxed">
                            Gestión centralizada de honorarios médicos y liquidaciones de guardia externa.
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
                            onClick={() => router.push('/guardias-clinicas/resumenes')}
                            className="flex items-center gap-3 px-8 py-4 rounded-full bg-[#00FF88] text-black font-black text-sm tracking-tighter hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,255,136,0.3)]"
                        >
                            <FileText className="h-5 w-5" />
                            VER RESÚMENES
                        </button>
                    </div>
                </div>

                {/* GrowLabs Nav Hub */}
                <div className="flex gap-4 mb-12 p-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full w-fit animate-in fade-in slide-in-from-bottom-2 duration-1000">
                    <button
                        onClick={() => setActiveTab('configuracion')}
                        className={`px-8 py-3 rounded-full font-black text-xs tracking-tighter transition-all flex items-center gap-2 ${activeTab === 'configuracion'
                            ? 'bg-[#00FF88] text-black shadow-[0_0_20px_rgba(0,255,136,0.3)]'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Settings className="h-4 w-4" />
                        CONFIGURACIÓN MENSUAL
                    </button>
                    <button
                        onClick={() => setActiveTab('procesamiento')}
                        className={`px-8 py-3 rounded-full font-black text-xs tracking-tighter transition-all flex items-center gap-2 ${activeTab === 'procesamiento'
                            ? 'bg-[#00FF88] text-black shadow-[0_0_20px_rgba(0,255,136,0.3)]'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Upload className="h-4 w-4" />
                        PROCESAR LIQUIDACIÓN
                    </button>
                </div>

                {/* Contenido de Configuración */}
                {activeTab === 'configuracion' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        {/* Period Hub */}
                        <div className="flex bg-white/5 backdrop-blur-md border border-white/10 rounded-[32px] p-6 items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-[#00FF88]/10 rounded-2xl">
                                    <Clock className="h-6 w-6 text-[#00FF88]" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Período Seleccionado</p>
                                    <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">{MESES[mesConfig - 1].label} {anioConfig}</h3>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <select
                                    value={mesConfig}
                                    onChange={(e) => setMesConfig(Number(e.target.value))}
                                    className="bg-transparent border-none text-white font-bold text-xs px-6 focus:outline-none cursor-pointer uppercase tracking-widest"
                                >
                                    {MESES.map(m => (
                                        <option key={m.value} value={m.value} className="text-black bg-white">{m.label}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    value={anioConfig}
                                    onChange={(e) => setAnioConfig(Number(e.target.value))}
                                    className="bg-black border border-white/10 rounded-full w-24 py-2 px-6 text-sm font-bold text-white focus:border-[#00FF88]/50 outline-none"
                                />
                            </div>
                        </div>

                        {/* Grid de Configuración Estructural */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Card Grupo 70% */}
                            <div className="rounded-[40px] overflow-hidden bg-white/[0.02] border border-white/10 backdrop-blur-3xl group transition-all hover:bg-white/[0.04]">
                                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-8 bg-[#00FF88] rounded-full"></div>
                                        <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase text-shadow-sm shadow-[#00FF88]/20">Grupo 70%</h2>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setGrupoSeleccionado('GRUPO_70')
                                            setShowMedicoSelector(true)
                                        }}
                                        className="p-3 bg-white/5 rounded-full border border-white/10 hover:bg-[#00FF88] hover:text-black transition-all group-hover:scale-110 active:scale-95"
                                    >
                                        <Plus className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="p-8">
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                                        {grupos70.length === 0 ? (
                                            <div className="text-center py-12">
                                                <Users className="h-12 w-12 text-gray-700 mx-auto mb-4 opacity-20" />
                                                <p className="text-gray-500 font-bold text-xs uppercase tracking-widest italic">Sin profesionales asignados</p>
                                            </div>
                                        ) : (
                                            grupos70.map(grupo => {
                                                const medico = medicos.find(m => m.id === grupo.doctor_id)
                                                return (
                                                    <div
                                                        key={grupo.id}
                                                        className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#00FF88]/30 transition-all group/item"
                                                    >
                                                        <span className="text-sm font-bold text-gray-300 uppercase tracking-tight">{medico?.nombre || 'Desconocido'}</span>
                                                        <button
                                                            onClick={() => handleEliminarMedicoDeGrupo(grupo.id)}
                                                            className="p-2 text-gray-600 hover:text-[#FF3131] transition-colors lg:opacity-0 group-hover/item:opacity-100"
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

                            {/* Card Grupo 50% */}
                            <div className="rounded-[40px] overflow-hidden bg-white/[0.02] border border-white/10 backdrop-blur-3xl group transition-all hover:bg-white/[0.04]">
                                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-8 bg-[#00D1FF] rounded-full"></div>
                                        <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase text-shadow-sm shadow-[#00D1FF]/20">Grupo 50%</h2>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setGrupoSeleccionado('GRUPO_50')
                                            setShowMedicoSelector(true)
                                        }}
                                        className="p-3 bg-white/5 rounded-full border border-white/10 hover:bg-[#00D1FF] hover:text-black transition-all group-hover:scale-110 active:scale-95"
                                    >
                                        <Plus className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="p-8">
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                                        {grupos50.length === 0 ? (
                                            <div className="text-center py-12">
                                                <Users className="h-12 w-12 text-gray-700 mx-auto mb-4 opacity-20" />
                                                <p className="text-gray-500 font-bold text-xs uppercase tracking-widest italic">Sin profesionales asignados</p>
                                            </div>
                                        ) : (
                                            grupos50.map(grupo => {
                                                const medico = medicos.find(m => m.id === grupo.doctor_id)
                                                return (
                                                    <div
                                                        key={grupo.id}
                                                        className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#00D1FF]/30 transition-all group/item"
                                                    >
                                                        <span className="text-sm font-bold text-gray-300 uppercase tracking-tight">{medico?.nombre || 'Desconocido'}</span>
                                                        <button
                                                            onClick={() => handleEliminarMedicoDeGrupo(grupo.id)}
                                                            className="p-2 text-gray-600 hover:text-[#FF3131] transition-colors lg:opacity-0 group-hover/item:opacity-100"
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

                        {/* Copia de Estructura Hub */}
                        <div className="flex flex-col items-center gap-6">
                            <button
                                onClick={handleCopiarGruposMesAnterior}
                                disabled={loadingConfig}
                                className="flex items-center gap-3 px-8 py-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-black text-xs tracking-[0.2em] uppercase italic text-gray-400 hover:text-white"
                            >
                                <Copy className="h-4 w-4 text-[#00FF88]" />
                                Replicar Archivo Maestro Mes Anterior
                            </button>
                        </div>

                        {/* Valuación Maestra Section */}
                        <div className="rounded-[40px] overflow-hidden bg-white/[0.02] border border-white/10 backdrop-blur-3xl">
                            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-8 bg-[#00FF88] rounded-full"></div>
                                    <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase underline decoration-[#00FF88] decoration-4 underline-offset-8">Matriz de Valores</h2>
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleCopiarValoresMesAnterior}
                                        disabled={loadingConfig}
                                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-bold text-[10px] tracking-widest uppercase italic text-gray-400 hover:text-[#00FF88]"
                                    >
                                        <Copy className="h-4 w-4" />
                                        REPLICAR MES ANTERIOR
                                    </button>
                                    <button
                                        onClick={handleGuardarValores}
                                        disabled={loadingConfig}
                                        className="px-8 py-3 rounded-full bg-[#00FF88] text-black font-black text-xs tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,255,136,0.2)] uppercase"
                                    >
                                        Sincronizar Matriz
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    { label: 'Valor Hora 8-16 (Día)', key: 'value_hour_weekly_8_16' },
                                    { label: 'Valor Hora 16-8 (Noche)', key: 'value_hour_weekly_16_8' },
                                    { label: 'Valor Hora Fines/Feriados', key: 'value_hour_weekend' },
                                    { label: 'Valor Hora Nocturna F/F', key: 'value_hour_weekend_night' },
                                    { label: 'Valor Mínimo Garantizado', key: 'value_guaranteed_min' },
                                ].map((item) => (
                                    <div key={item.key} className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2 italic">{item.label}</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-4 flex items-center text-gray-500 font-mono text-sm group-focus-within:text-[#00FF88] transition-colors">$</div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                // @ts-ignore
                                                value={valoresConfig?.[item.key] || 0}
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
                                                    [item.key]: parseFloat(e.target.value) || 0
                                                })}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-8 pr-4 text-white font-mono font-bold focus:border-[#00FF88]/50 focus:bg-[#00FF88]/5 outline-none transition-all placeholder:text-gray-700"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Processing Intelligence Hub */}
                {activeTab === 'procesamiento' && (
                    <div className="space-y-12 animate-in fade-in duration-1000">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Input: Registro Consultas */}
                            <div className="rounded-[40px] overflow-hidden bg-white/[0.02] border border-white/10 backdrop-blur-3xl group transition-all hover:bg-white/[0.04]">
                                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-[#00FF88]/10 rounded-2xl">
                                            <FileSpreadsheet className="h-6 w-6 text-[#00FF88]" />
                                        </div>
                                        <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase text-shadow-sm shadow-[#00FF88]/20">Consultas</h2>
                                    </div>
                                    {excelDataConsultas && <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse"></div>}
                                </div>
                                <div className="p-8">
                                    <UploadExcel
                                        onUpload={handleUploadConsultas}
                                        isProcessing={isProcessingConsultas}
                                    />
                                </div>
                            </div>

                            {/* Input: Registro Horas */}
                            <div className="rounded-[40px] overflow-hidden bg-white/[0.02] border border-white/10 backdrop-blur-3xl group transition-all hover:bg-white/[0.04]">
                                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-[#00D1FF]/10 rounded-2xl">
                                            <Clock className="h-6 w-6 text-[#00D1FF]" />
                                        </div>
                                        <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase text-shadow-sm shadow-[#00D1FF]/20">Horas G.</h2>
                                    </div>
                                    {excelDataHoras && <div className="w-2 h-2 rounded-full bg-[#00D1FF] animate-pulse"></div>}
                                </div>
                                <div className="p-8">
                                    <UploadExcel
                                        onUpload={handleUploadHoras}
                                        isProcessing={isProcessingHoras}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Intelligence & CTA Hub */}
                        <div className="flex flex-col md:flex-row gap-8 items-stretch pt-4">
                            {/* Protocols Card */}
                            <div className="flex-1 rounded-[40px] p-8 bg-white/[0.02] border border-white/5 backdrop-blur-3xl group hover:bg-white/[0.04] transition-all">
                                <div className="flex items-center gap-3 mb-8">
                                    <ShieldCheck className="h-6 w-6 text-[#00FF88]" />
                                    <h3 className="text-lg font-black text-white uppercase tracking-widest italic">Protocolos Activos</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        { title: 'Purga de Tiempo', desc: 'Exclusión de registros con duración cero.' },
                                        { title: 'Filtro de Entidad', desc: 'Bloqueo de particulares y sin cobertura.' },
                                        { title: 'Limpieza de Colisiones', desc: 'Detección de duplicados técnicos.' },
                                        { title: 'Validación de Grupo', desc: 'Asignación de porcentajes (70%/50%).' },
                                    ].map((rule, i) => (
                                        <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:border-[#00FF88]/20 transition-all">
                                            <p className="text-[10px] font-black text-[#00FF88] uppercase tracking-widest mb-1">{rule.title}</p>
                                            <p className="text-[11px] text-gray-500 font-medium leading-tight">{rule.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Main Action Hub */}
                            <div className="w-full md:w-[350px] flex flex-col items-center justify-center p-10 bg-[#00FF88]/5 border border-[#00FF88]/10 rounded-[48px] gap-8 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#00FF88]/10 to-transparent opacity-50"></div>
                                <div className="text-center relative z-10">
                                    <p className="text-[10px] font-black text-[#00FF88] uppercase tracking-[0.4em] mb-2 animate-pulse">Sistemas Operativos</p>
                                    <h4 className="text-xl font-black text-white italic tracking-tighter uppercase">Motor de Despliegue</h4>
                                </div>

                                <button
                                    onClick={() => setShowMesSelector(true)}
                                    disabled={!puedeProcesar || isGuardando}
                                    className={`relative w-full py-8 rounded-full font-black text-sm tracking-widest transition-all overflow-hidden z-10 ${puedeProcesar && !isGuardando
                                        ? 'bg-[#00FF88] text-black shadow-[0_0_50px_rgba(0,255,136,0.3)] hover:scale-105 active:scale-95'
                                        : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
                                        }`}
                                >
                                    <div className="flex items-center justify-center gap-3">
                                        {isGuardando ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                                <span className="uppercase tracking-tighter">Sincronizando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="h-5 w-5 fill-current" />
                                                <span className="uppercase tracking-tighter">INICIAR PROCESO</span>
                                            </>
                                        )}
                                    </div>
                                    {!puedeProcesar && !isGuardando && (
                                        <p className="absolute inset-x-0 bottom-2 text-center text-[8px] font-black text-gray-500 uppercase tracking-widest opacity-50">Faltan Datos Base</p>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error Communication Hub */}
                        {error && (
                            <div className="rounded-3xl p-6 bg-[#FF3131]/10 border border-[#FF3131]/30 flex items-center gap-6 animate-in zoom-in-95">
                                <div className="p-4 bg-[#FF3131]/20 rounded-2xl">
                                    <AlertCircle className="w-8 h-8 text-[#FF3131] animate-[pulse_1s_infinite]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Colisión de Sistema</h3>
                                    <p className="text-sm text-[#FF3131]/80 font-bold tracking-tight">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Exceptions & Logic Hub */}
                        {resultadoProcesamiento && resultadoProcesamiento.filasExcluidas && resultadoProcesamiento.filasExcluidas.length > 0 && excelDataConsultas && (
                            <div className="space-y-8 pt-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-10 bg-[#FF3131] rounded-full"></div>
                                    <div>
                                        <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase text-shadow-sm shadow-[#FF3131]/20">Bitácora de Excepciones</h2>
                                        <p className="text-[#FF3131] font-black text-[10px] tracking-[0.3em] uppercase opacity-70">
                                            {resultadoProcesamiento.filasExcluidas.length} Entidades Removidas de la Matriz
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-[40px] overflow-hidden bg-white/[0.01] border border-white/5 backdrop-blur-3xl">
                                    <div className="overflow-x-auto no-scrollbar">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-white/5 border-b border-white/5">
                                                    <th className="px-8 py-5 text-xs font-black text-gray-500 uppercase tracking-widest italic sticky left-0 bg-black/50 backdrop-blur-xl z-20">Línea</th>
                                                    <th className="px-8 py-5 text-xs font-black text-gray-500 uppercase tracking-widest italic">Causa de Nulidad</th>
                                                    {excelDataConsultas.headers.map((header, idx) => (
                                                        <th key={idx} className="px-8 py-5 text-xs font-black text-gray-500 uppercase tracking-widest italic min-w-[180px]">
                                                            {header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {resultadoProcesamiento.filasExcluidas.map((filaExcluida: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-white/[0.03] transition-colors group">
                                                        <td className="px-8 py-5 text-sm font-mono font-black text-gray-600 italic sticky left-0 bg-black/40 group-hover:bg-black/60 backdrop-blur-xl z-10 transition-colors">
                                                            #{filaExcluida.numeroFila}
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#FF3131]/5 border border-[#FF3131]/10 w-fit">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#FF3131] animate-pulse"></div>
                                                                <span className="text-[10px] font-black text-[#FF3131] uppercase tracking-widest">
                                                                    {filaExcluida.razon === 'sin_fecha' && 'Error de Estructura Temporal'}
                                                                    {filaExcluida.razon === 'fecha_invalida' && 'Desviación Cronológica'}
                                                                    {filaExcluida.razon === 'duracion_cero' && 'Nulidad de Tiempo'}
                                                                    {filaExcluida.razon === 'sin_hora' && 'Segmento Horario Inseguro'}
                                                                    {filaExcluida.razon === 'particular' && 'Entidad No Liquidable'}
                                                                    {filaExcluida.razon === 'duplicado' && 'Colisión de Datos'}
                                                                    {!['sin_fecha', 'fecha_invalida', 'duracion_cero', 'sin_hora', 'particular', 'duplicado'].includes(filaExcluida.razon) && filaExcluida.razon}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        {excelDataConsultas.headers.map((header, colIdx) => (
                                                            <td key={colIdx} className="px-8 py-5 text-[11px] text-gray-500 font-bold uppercase tracking-tight">
                                                                {filaExcluida.datos[header] || '-'}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-8 bg-black/20 border-t border-white/5 flex items-center gap-4">
                                        <Info className="h-4 w-4 text-gray-600" />
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] italic">
                                            Las entidades listadas han sido depuradas para garantizar la integridad del archivo maestro.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de selección de médico - Premium Glassmorphism */}
            {showMedicoSelector && grupoSeleccionado && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => {
                        setShowMedicoSelector(false)
                        setGrupoSeleccionado(null)
                        setSearchMedico('')
                    }}
                >
                    <div
                        className="relative rounded-[40px] p-10 max-w-2xl w-full max-h-[85vh] overflow-hidden bg-black/40 border border-white/10 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Background Glow */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#00FF88]/10 rounded-full blur-[100px]"></div>

                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase underline decoration-[#00FF88] decoration-4 underline-offset-8">Desplegar Médico</h2>
                                <p className="text-[#00FF88] font-black text-[10px] tracking-[0.3em] uppercase mt-2">Asignando a {grupoSeleccionado === 'GRUPO_70' ? 'Sector 70%' : 'Sector 50%'}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowMedicoSelector(false)
                                    setGrupoSeleccionado(null)
                                    setSearchMedico('')
                                }}
                                className="p-3 bg-white/5 hover:bg-[#FF3131]/20 rounded-2xl text-gray-400 hover:text-[#FF3131] transition-all border border-white/5 hover:border-[#FF3131]/30 group"
                            >
                                <X className="h-6 w-6 group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>

                        <div className="mb-8 relative z-10">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-[#00FF88] transition-colors" />
                                <Input
                                    type="text"
                                    value={searchMedico}
                                    onChange={(e) => setSearchMedico(e.target.value)}
                                    placeholder="BUSCAR ENTIDAD POR NOMBRE..."
                                    className="pl-12 bg-white/[0.02] border-white/10 text-white placeholder:text-gray-600 rounded-2xl focus:border-[#00FF88]/50 focus:ring-[#00FF88]/20 h-14 font-bold tracking-tight uppercase text-xs transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2 no-scrollbar relative z-10">
                            {medicosFiltrados.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
                                    <Users className="h-10 w-10 text-gray-700 mx-auto mb-4" />
                                    <p className="text-gray-600 font-black text-[10px] tracking-widest uppercase">No se detectaron coincidencias</p>
                                </div>
                            ) : (
                                medicosFiltrados.map(medico => {
                                    const yaEnGrupo70 = grupos70.some(g => g.doctor_id === medico.id)
                                    const yaEnGrupo50 = grupos50.some(g => g.doctor_id === medico.id)
                                    const puedeAgregar = grupoSeleccionado === 'GRUPO_70' ? !yaEnGrupo70 : !yaEnGrupo50

                                    return (
                                        <button
                                            key={medico.id}
                                            onClick={() => puedeAgregar && handleAgregarMedicoAGrupo(medico.id)}
                                            disabled={!puedeAgregar}
                                            className={`w-full text-left p-5 rounded-3xl border transition-all flex items-center justify-between group ${puedeAgregar
                                                ? 'bg-white/[0.02] border-white/5 hover:bg-[#00FF88]/5 hover:border-[#00FF88]/30 cursor-pointer'
                                                : 'bg-transparent border-transparent opacity-30 cursor-not-allowed'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${puedeAgregar ? 'bg-white/5 text-gray-400 group-hover:bg-[#00FF88] group-hover:text-black' : 'bg-gray-900 text-gray-600'} transition-all`}>
                                                    {medico.nombre.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className={`font-black tracking-tight text-sm uppercase ${puedeAgregar ? 'text-gray-300 group-hover:text-white' : 'text-gray-600'}`}>{medico.nombre}</span>
                                                    {puedeAgregar && <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">Entidad Disponible</p>}
                                                </div>
                                            </div>
                                            {puedeAgregar ? (
                                                <div className="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:bg-[#00FF88]/10 group-hover:border-[#00FF88]/30 transition-all opacity-0 group-hover:opacity-100">
                                                    <Plus className="h-4 w-4 text-[#00FF88]" />
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                                                    <XCircle className="h-3 w-3 text-red-500" />
                                                    <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">Ocupado</span>
                                                </div>
                                            )}
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

            {/* Notificación System */}
            <NotificationModal
                isOpen={notification.isOpen}
                onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
                type={notification.type}
                title={notification.title}
                message={notification.message}
            />

            {/* Saving Indicator - Ultra Premium */}
            {isGuardando && (
                <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-12 duration-500">
                    <div className="p-6 rounded-[32px] bg-black/60 border border-[#00FF88]/30 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,255,136,0.2)] flex items-center gap-6">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-[#00FF88]/10 border-t-[#00FF88] rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2 h-2 bg-[#00FF88] rounded-full animate-pulse"></div>
                            </div>
                        </div>
                        <div>
                            <p className="text-white font-black text-xs italic tracking-widest uppercase">Sincronizando Archivos</p>
                            <p className="text-[#00FF88] font-bold text-[9px] uppercase tracking-[0.2em] mt-1 opacity-70">Escritura en Base de Datos...</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
