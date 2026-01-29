'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadExcel } from '@/components/custom/UploadExcel'
import { MesSelectorModal } from '@/components/custom/MesSelectorModal'
import { NotificationModal, NotificationType } from '@/components/custom/NotificationModal'
import { readExcelFile, ExcelData } from '@/lib/excel-reader'
import { procesarExcelPediatria } from '@/lib/pediatria-processor'
import { AlertCircle, Sparkles, ArrowLeft, XCircle, X, AlertTriangle, Upload, FileText, Settings, Users, Plus, Trash2, Copy, Search } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { PediatricGroupsConfig, PediatricGroupsConfigInsert, Medico } from '@/lib/types'

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

export default function PediatriaPage() {
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

    // Estados de pestañas
    const [activeTab, setActiveTab] = useState<'configuracion' | 'procesamiento'>('configuracion')

    // Estados de configuración de grupos
    const [mesConfig, setMesConfig] = useState(new Date().getMonth() + 1)
    const [anioConfig, setAnioConfig] = useState(new Date().getFullYear())
    const [grupoEstandar, setGrupoEstandar] = useState<PediatricGroupsConfig[]>([])
    const [grupoEspecialista, setGrupoEspecialista] = useState<PediatricGroupsConfig[]>([])
    const [medicos, setMedicos] = useState<Medico[]>([])
    const [loadingConfig, setLoadingConfig] = useState(false)
    const [showMedicoSelector, setShowMedicoSelector] = useState(false)
    const [grupoSeleccionado, setGrupoSeleccionado] = useState<'GUARDIA_ESTANDAR' | 'ESPECIALISTA' | null>(null)
    const [searchMedico, setSearchMedico] = useState('')

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
            const { data, error } = await supabase
                .from('pediatric_groups_config')
                .select('*')
                .eq('mes', mesConfig)
                .eq('anio', anioConfig)

            if (error) throw error

            const grupos = (data || []) as PediatricGroupsConfig[]
            setGrupoEstandar(grupos.filter(g => g.group_type === 'GUARDIA_ESTANDAR'))
            setGrupoEspecialista(grupos.filter(g => g.group_type === 'ESPECIALISTA'))
        } catch (error) {
            console.error('Error cargando configuración:', error)
            showNotification('error', 'Error al cargar configuración', 'Error')
        } finally {
            setLoadingConfig(false)
        }
    }

    async function handleAgregarMedicoAGrupo(medicoId: string) {
        if (!grupoSeleccionado) return

        try {
            setLoadingConfig(true)

            // Verificar si ya existe en este mes
            const { data: existente } = await supabase
                .from('pediatric_groups_config')
                .select('*')
                .eq('doctor_id', medicoId)
                .eq('mes', mesConfig)
                .eq('anio', anioConfig)
                .single()

            if (existente) {
                // Actualizar
                const { error } = await (supabase
                    .from('pediatric_groups_config') as any)
                    .update({ group_type: grupoSeleccionado })
                    .eq('id', (existente as any).id)
                if (error) throw error
            } else {
                // Insertar
                const nuevo = {
                    doctor_id: medicoId,
                    mes: mesConfig,
                    anio: anioConfig,
                    group_type: grupoSeleccionado
                }
                const { error } = await (supabase
                    .from('pediatric_groups_config') as any)
                    .insert(nuevo)
                if (error) throw error
            }

            await cargarConfiguracion()
            setShowMedicoSelector(false)
            setGrupoSeleccionado(null)
            setSearchMedico('')
            showNotification('success', 'Médico asignado al grupo correctamente')
        } catch (error) {
            console.error('Error asignando médico:', error)
            showNotification('error', 'No se pudo asignar el médico')
        } finally {
            setLoadingConfig(false)
        }
    }

    async function handleEliminarDeGrupo(id: string) {
        try {
            setLoadingConfig(true)
            const { error } = await supabase
                .from('pediatric_groups_config')
                .delete()
                .eq('id', id)
            if (error) throw error
            await cargarConfiguracion()
            showNotification('success', 'Médico eliminado del grupo')
        } catch (error) {
            console.error('Error eliminando médico:', error)
            showNotification('error', 'No se pudo eliminar el médico')
        } finally {
            setLoadingConfig(false)
        }
    }

    async function handleCopiarMesAnterior() {
        try {
            setLoadingConfig(true)
            let mesAnt = mesConfig - 1
            let anioAnt = anioConfig
            if (mesAnt === 0) {
                mesAnt = 12
                anioAnt -= 1
            }

            const { data: anteriores } = await supabase
                .from('pediatric_groups_config')
                .select('*')
                .eq('mes', mesAnt)
                .eq('anio', anioAnt)

            if (!anteriores || anteriores.length === 0) {
                showNotification('warning', 'No hay datos del mes anterior para copiar')
                return
            }

            // Eliminar actuales primero
            await supabase
                .from('pediatric_groups_config')
                .delete()
                .eq('mes', mesConfig)
                .eq('anio', anioConfig)

            const nuevos = anteriores.map(a => ({
                doctor_id: (a as any).doctor_id,
                mes: mesConfig,
                anio: anioConfig,
                group_type: (a as any).group_type
            }))

            const { error } = await (supabase
                .from('pediatric_groups_config') as any)
                .insert(nuevos)

            if (error) throw error
            await cargarConfiguracion()
            showNotification('success', `Se copiaron ${nuevos.length} asignaciones correctamente`)
        } catch (error) {
            console.error('Error copiando:', error)
            showNotification('error', 'Error al copiar datos del mes anterior')
        } finally {
            setLoadingConfig(false)
        }
    }

    const medicosFiltrados = medicos.filter(m =>
        m.nombre.toLowerCase().includes(searchMedico.toLowerCase())
    )

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
                const resultado = await procesarExcelPediatria(
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
                        const warningSample = resultado.advertencias.length > 0
                            ? ` (${resultado.advertencias.slice(0, 2).join('; ')}${resultado.advertencias.length > 2 ? '...' : ''})`
                            : '';

                        showNotification(
                            'warning',
                            `Se procesaron ${resultado.procesadas} de ${resultado.totalFilas} filas. ${resultado.advertencias.length} advertencias${warningSample}. ${resultado.filasExcluidas?.length || 0} filas excluidas. Revisa "Ver Resumen" para detalles.`,
                            'Procesamiento con observaciones'
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
                            <span className="text-[#00FF88] italic uppercase">Pediatría</span>
                        </h1>
                        <p className="text-gray-400 text-lg max-w-md font-medium leading-relaxed">
                            Gestión avanzada de liquidaciones por producción con motor de retención automatizado.
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
                            onClick={() => router.push('/pediatria/resumenes')}
                            className="flex items-center gap-3 px-8 py-4 rounded-full bg-[#00FF88] text-black font-black text-sm tracking-tighter hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,255,136,0.3)]"
                        >
                            <FileText className="h-5 w-5" />
                            VER RESÚMENES
                        </button>
                    </div>
                </div>

                {/* Tabs Premium */}
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

                {/* Contenido según Pestaña */}
                {activeTab === 'configuracion' ? (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Selector de Mes/Año de Configuración */}
                        <div
                            className="p-8 rounded-3xl animate-in zoom-in-95 duration-500"
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                        >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                <div className="space-y-1.5 flex-1">
                                    <label className="text-[10px] font-black tracking-[0.2em] text-[#00FF88] uppercase">PERIODO DE GESTIÓN</label>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={mesConfig}
                                            onChange={(e) => setMesConfig(Number(e.target.value))}
                                            className="px-4 py-2.5 bg-black border border-white/10 rounded-xl text-white font-bold text-sm focus:border-[#00FF88]/50 outline-none appearance-none cursor-pointer hover:bg-white/5 transition-all"
                                        >
                                            {MESES.map(m => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={anioConfig}
                                            onChange={(e) => setAnioConfig(Number(e.target.value))}
                                            className="px-4 py-2.5 bg-black border border-white/10 rounded-xl text-white font-bold text-sm w-28 focus:border-[#00FF88]/50 outline-none hover:bg-white/5 transition-all"
                                        />
                                    </div>
                                </div>
                                <Button
                                    onClick={handleCopiarMesAnterior}
                                    disabled={loadingConfig}
                                    variant="outline"
                                    className="rounded-full border-[#00FF88]/20 bg-[#00FF88]/5 text-[#00FF88] hover:bg-[#00FF88] hover:text-black font-black text-xs tracking-tighter"
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    COPIAR MES ANTERIOR
                                </Button>
                            </div>
                        </div>

                        {/* Paneles de Grupos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Panel Guardia Estándar */}
                            <div
                                className="p-8 rounded-3xl space-y-6"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Guardia Estándar</h3>
                                        <p className="text-[10px] text-gray-500 font-bold tracking-widest leading-none">VALOR BASE BASE CONSULTA</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xl font-mono text-[#00FF88] font-black bg-[#00FF88]/10 px-3 py-1 rounded-lg">
                                            {grupoEstandar.length}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setGrupoSeleccionado('GUARDIA_ESTANDAR')
                                                setShowMedicoSelector(true)
                                            }}
                                            className="w-10 h-10 rounded-full bg-[#00FF88] text-black flex items-center justify-center hover:scale-110 transition-all shadow-[0_0_15px_rgba(0,255,136,0.3)]"
                                        >
                                            <Plus className="h-6 w-6" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                    {grupoEstandar.length === 0 ? (
                                        <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl">
                                            <p className="text-gray-600 text-xs font-bold tracking-widest italic uppercase">Sin médicos asignados</p>
                                        </div>
                                    ) : (
                                        grupoEstandar.map(g => {
                                            const m = medicos.find(med => med.id === g.doctor_id)
                                            return (
                                                <div key={g.id} className="flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl border border-white/5 group transition-all">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-gray-200 tracking-tight">{m?.nombre || 'Desconocido'}</span>
                                                        <span className="text-[10px] text-gray-500 font-mono italic">ID: {g.doctor_id.substring(0, 8)}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleEliminarDeGrupo(g.id)}
                                                        className="p-2 hover:bg-red-500/20 rounded-xl text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Panel Especialista / Neonatal */}
                            <div
                                className="p-8 rounded-3xl space-y-6"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Especialista / Neonatal</h3>
                                        <p className="text-[10px] text-gray-500 font-bold tracking-widest leading-none">VALOR DIFERENCIADO</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xl font-mono text-[#00FF88] font-black bg-[#00FF88]/10 px-3 py-1 rounded-lg">
                                            {grupoEspecialista.length}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setGrupoSeleccionado('ESPECIALISTA')
                                                setShowMedicoSelector(true)
                                            }}
                                            className="w-10 h-10 rounded-full bg-[#00FF88] text-black flex items-center justify-center hover:scale-110 transition-all shadow-[0_0_15px_rgba(0,255,136,0.3)]"
                                        >
                                            <Plus className="h-6 w-6" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                    {grupoEspecialista.length === 0 ? (
                                        <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl">
                                            <p className="text-gray-600 text-xs font-bold tracking-widest italic uppercase">Sin médicos asignados</p>
                                        </div>
                                    ) : (
                                        grupoEspecialista.map(g => {
                                            const m = medicos.find(med => med.id === g.doctor_id)
                                            return (
                                                <div key={g.id} className="flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl border border-white/5 group transition-all">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-gray-200 tracking-tight">{m?.nombre || 'Desconocido'}</span>
                                                        <span className="text-[10px] text-gray-500 font-mono italic">ID: {g.doctor_id.substring(0, 8)}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleEliminarDeGrupo(g.id)}
                                                        className="p-2 hover:bg-red-500/20 rounded-xl text-red-500 opacity-0 group-hover:opacity-100 transition-all"
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

                        {/* Modal selector de médicos */}
                        {showMedicoSelector && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                                <div className="bg-gray-900 border border-green-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                        <h3 className="font-bold text-white flex items-center gap-2">
                                            <Users className="h-4 w-4 text-green-400" />
                                            Asignar a {grupoSeleccionado === 'ESPECIALISTA' ? 'Especialistas' : 'Guardia Estándar'}
                                        </h3>
                                        <button onClick={() => setShowMedicoSelector(false)} className="p-1 hover:bg-white/10 rounded">
                                            <X className="h-5 w-5 text-gray-400" />
                                        </button>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                            <input
                                                type="text"
                                                placeholder="Buscar médico..."
                                                value={searchMedico}
                                                onChange={(e) => setSearchMedico(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-green-500/50 outline-none transition-all"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                            {medicosFiltrados.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500 text-sm">No se encontraron médicos</div>
                                            ) : (
                                                medicosFiltrados.map(m => {
                                                    const yaEstaEnEstandar = grupoEstandar.some(g => g.doctor_id === m.id)
                                                    const yaEstaEnEspecialista = grupoEspecialista.some(g => g.doctor_id === m.id)

                                                    return (
                                                        <button
                                                            key={m.id}
                                                            onClick={() => handleAgregarMedicoAGrupo(m.id)}
                                                            className="w-full flex items-center justify-between p-3 hover:bg-green-500/10 rounded-xl transition-all text-left group"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium text-gray-200 group-hover:text-green-400">{m.nombre}</span>
                                                                <span className="text-xs text-gray-500">M: {m.matricula}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {yaEstaEnEstandar && (
                                                                    <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded">Estándar</span>
                                                                )}
                                                                {yaEstaEnEspecialista && (
                                                                    <span className="text-[10px] uppercase font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded">Especialista</span>
                                                                )}
                                                                <Plus className="h-4 w-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        </button>
                                                    )
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Upload Excel Card */}
                        <div
                            className="p-12 rounded-[40px] relative overflow-hidden group"
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                        >
                            <div className="absolute top-0 right-0 p-8">
                                <Upload className="h-12 w-12 text-[#00FF88]/20 group-hover:text-[#00FF88]/40 transition-all duration-500" />
                            </div>

                            <div className="relative space-y-8">
                                <div className="space-y-2">
                                    <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase">Cargar Liquidación</h2>
                                    <p className="text-gray-500 font-bold tracking-widest text-xs">SISTEMA AUTOMATIZADO DE PROCESAMIENTO PEDIÁTRICO</p>
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

                        {/* Reglas de Negocio */}
                        <div
                            className="p-6 rounded-xl"
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.2)',
                            }}
                        >
                            <h3 className="text-xl font-semibold text-gray-200 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Reglas Vigentes
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-300">
                                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Retención</div>
                                    <div className="font-semibold text-white">30%</div>
                                    <div className="text-xs text-gray-400">Sobre monto facturado</div>
                                </div>

                                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Diferenciación</div>
                                    <div className="text-xs text-gray-400 mb-2">
                                        Consulta Guardia vs Especialista
                                    </div>
                                    <div className="text-xs text-green-400">
                                        Configurable por grupo mensual
                                    </div>
                                </div>

                                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Adicionales</div>
                                    <div className="text-xs text-gray-400 mb-2">
                                        DAMSU y PROVINCIA configurables
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        Admin → Adicionales
                                    </div>
                                </div>

                                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fórmula</div>
                                    <div className="font-mono text-[10px] text-gray-400">
                                        (Valor Grupo - 30%) + Adícl.
                                    </div>
                                </div>
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
                    <div className="fixed bottom-4 right-4 p-4 rounded-lg bg-green-500/20 border border-green-500/50 text-green-400">
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
                                            Estas filas fueron excluidas por: sin fecha, fecha inválida, no pediatría o duplicados.
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
                                            {excelData && excelData.headers.map((header: string, idx: number) => (
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
                                                    {filaExcluida.razon === 'no_pediatria' && (
                                                        <span className="flex items-center gap-1">
                                                            <X className="h-3 w-3" />
                                                            No es pediatría
                                                        </span>
                                                    )}
                                                    {filaExcluida.razon === 'duplicado' && (
                                                        <span className="flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            Duplicado
                                                        </span>
                                                    )}
                                                </td>
                                                {excelData && excelData.headers.map((header: string, colIdx: number) => (
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
        </div>
    )
}
