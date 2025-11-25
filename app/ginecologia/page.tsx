'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { UploadExcel } from '@/components/custom/UploadExcel'
import { GuardiasProcessor } from '@/lib/guardias-processor'
import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function GinecologiaPage() {
    const [medicos, setMedicos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)
    const [result, setResult] = useState<any>(null)

    useEffect(() => {
        loadMedicos()
    }, [])

    async function loadMedicos() {
        try {
            const { data, error } = await supabase
                .from('medicos')
                .select('*')
                .eq('especialidad', 'Ginecología')
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
        setResult(null)

        try {
            // Instanciar procesador para Ginecología
            const processor = new GuardiasProcessor(
                supabase,
                'Ginecología',
                new Date().getMonth() + 1,
                new Date().getFullYear()
            )

            const processingResult = await processor.procesarExcel(file)
            setResult(processingResult)

        } catch (error) {
            console.error('Error processing file:', error)
            setResult({
                error: 'Ocurrió un error inesperado al procesar el archivo.'
            })
        } finally {
            setIsProcessing(false)
        }
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

                    {/* Resultados del Procesamiento */}
                    {result && (
                        <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                            {result.error ? (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3 text-red-400">
                                    <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                                    <div>
                                        <h3 className="font-semibold">Error de Procesamiento</h3>
                                        <p className="text-sm opacity-90">{result.error}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                                        <h3 className="text-lg font-semibold text-green-400">
                                            Procesamiento Completado
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div className="bg-black/20 p-3 rounded-lg">
                                            <div className="text-sm text-gray-400">Total Filas</div>
                                            <div className="text-2xl font-bold text-white">{result.totalFilas}</div>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-lg">
                                            <div className="text-sm text-gray-400">Procesadas</div>
                                            <div className="text-2xl font-bold text-green-400">{result.procesadas}</div>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-lg">
                                            <div className="text-sm text-gray-400">Errores</div>
                                            <div className="text-2xl font-bold text-red-400">{result.errores.length}</div>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-lg">
                                            <div className="text-sm text-gray-400">Advertencias</div>
                                            <div className="text-2xl font-bold text-yellow-400">{result.advertencias.length}</div>
                                        </div>
                                    </div>

                                    {result.errores.length > 0 && (
                                        <div className="mt-4">
                                            <h4 className="text-sm font-semibold text-red-400 mb-2">Detalle de Errores:</h4>
                                            <ul className="text-sm text-red-300/80 space-y-1 max-h-32 overflow-y-auto bg-black/20 p-2 rounded">
                                                {result.errores.map((err: string, i: number) => (
                                                    <li key={i}>• {err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Médicos Activos */}
                    <div 
                        className="md:col-span-2 p-6 rounded-xl"
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.2)',
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
                                No hay médicos registrados en Ginecología
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

            <style jsx>{`
                @keyframes borderGlow {
                    0%, 100% {
                        opacity: 0.3;
                    }
                    50% {
                        opacity: 0.8;
                    }
                }
                
                .delay-1000 {
                    animation-delay: 1000ms;
                }
            `}</style>
        </div>
    )
}
