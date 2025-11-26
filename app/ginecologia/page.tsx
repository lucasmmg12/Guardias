'use client'

import { useState } from 'react'
import { UploadExcel } from '@/components/custom/UploadExcel'
import { ExcelDataTable } from '@/components/custom/ExcelDataTable'
import { EstadisticasObraSocial } from '@/components/custom/EstadisticasObraSocial'
import { readExcelFile, ExcelData } from '@/lib/excel-reader'
import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function GinecologiaPage() {
    const [isProcessing, setIsProcessing] = useState(false)
    const [excelData, setExcelData] = useState<ExcelData | null>(null)
    const [error, setError] = useState<string | null>(null)

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
                        <h2 className="text-2xl font-bold text-blue-400 mb-6">
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
        </div>
    )
}
