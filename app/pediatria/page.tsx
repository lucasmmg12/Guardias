'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { UploadExcel } from '@/components/custom/UploadExcel'
import { ExcelDataTable } from '@/components/custom/ExcelDataTable'
import { EstadisticasObraSocial } from '@/components/custom/EstadisticasObraSocial'
import { readExcelFile, ExcelData } from '@/lib/excel-reader'
import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function PediatriaPage() {
    const [medicos, setMedicos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)
    const [excelData, setExcelData] = useState<ExcelData | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadMedicos()
    }, [])

    async function loadMedicos() {
        try {
            const { data, error } = await supabase
                .from('medicos')
                .select('*')
                .eq('especialidad', 'Pediatría')
                .eq('activo', true)

            if (error) throw error
            setMedicos(data || [])
        } catch (error) {
            console.error('Error loading médicos:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpload = async (file: File) => {
        setIsProcessing(true)
        setExcelData(null)
        setError(null)

        try {
            const data = await readExcelFile(file)
            setExcelData(data)
        } catch (err: any) {
            console.error('Error processing file:', err)
            setError(err.message || 'Ocurrió un error inesperado al procesar el archivo.')
        } finally {
            setIsProcessing(false)
        }
    }

    // Extraer mes y año del período del Excel
    const obtenerMesAnio = () => {
        if (!excelData?.periodo) return { mes: new Date().getMonth() + 1, anio: new Date().getFullYear() }
        
        // Parsear fecha desde formato "DD/MM/YYYY"
        const fechaDesde = excelData.periodo.desde
        const partes = fechaDesde.split('/')
        if (partes.length === 3) {
            return {
                mes: parseInt(partes[1], 10),
                anio: parseInt(partes[2], 10)
            }
        }
        
        return { mes: new Date().getMonth() + 1, anio: new Date().getFullYear() }
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
                                    <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                                        Módulo Pediatría
                                    </span>
                                </h1>
                                <p className="text-gray-400 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-green-400" />
                                    Procesamiento de liquidaciones por producción
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
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.3)',
                    }}
                >
                    {/* Borde brillante animado */}
                    <div 
                        className="absolute inset-0 rounded-2xl"
                        style={{
                            background: 'linear-gradient(45deg, transparent, rgba(34, 197, 94, 0.3), transparent)',
                            animation: 'borderGlow 3s ease-in-out infinite',
                        }}
                    ></div>
                    <div className="relative">
                        <h2 className="text-2xl font-bold text-green-400 mb-6">
                            📤 Cargar Liquidación
                        </h2>

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
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.3)',
                        }}
                    >
                        <div className="relative">
                            <h2 className="text-2xl font-bold text-green-400 mb-6">
                                📊 Datos del Excel
                            </h2>
                            <ExcelDataTable 
                                data={excelData} 
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
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.3)',
                            }}
                        >
                            <EstadisticasObraSocial
                                mes={mes}
                                anio={anio}
                                especialidad="Pediatría"
                            />
                        </div>
                    )
                })()}

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Médicos Activos */}
                    <div 
                        className="md:col-span-2 p-6 rounded-xl"
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.2)',
                        }}
                    >
                        <h3 className="text-xl font-semibold text-gray-200 mb-4 flex items-center gap-2">
                            👨‍⚕️ Médicos Activos
                            <span className="text-sm font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                                {medicos.length}
                            </span>
                        </h3>

                        {loading ? (
                            <div className="text-center py-8 text-gray-400">
                                Cargando médicos...
                            </div>
                        ) : medicos.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                No hay médicos registrados en Pediatría
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-3">
                                {medicos.map((medico) => (
                                    <div
                                        key={medico.id}
                                        className="bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-colors border border-white/5"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="font-medium text-gray-200 text-sm">
                                                    {medico.nombre}
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono mt-1">
                                                    MN: {medico.matricula}
                                                </div>
                                            </div>
                                            {medico.es_residente ? (
                                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] uppercase tracking-wider font-semibold rounded">
                                                    Residente
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] uppercase tracking-wider font-semibold rounded">
                                                    Planta
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reglas de Negocio */}
                    <div 
                        className="p-6 rounded-xl h-fit"
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.2)',
                        }}
                    >
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">
                            📋 Reglas Vigentes
                        </h3>
                        <div className="space-y-4 text-sm text-gray-300">
                            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Retención</div>
                                <div className="font-semibold text-white">30%</div>
                                <div className="text-xs text-gray-400">Sobre monto facturado</div>
                            </div>

                            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Adicionales</div>
                                <ul className="space-y-1">
                                    <li className="flex justify-between">
                                        <span>Damsu</span>
                                        <span className="text-green-400">+$1,500</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Provincia</span>
                                        <span className="text-green-400">+$1,200</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fórmula</div>
                                <div className="font-mono text-xs text-gray-400">
                                    (Monto - 30%) + Adicional
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
