import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function HomePage() {
    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center p-8 overflow-hidden">
            {/* Efectos de luz verde */}
            <div className="absolute top-20 left-20 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-green-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>

            <div className="max-w-4xl w-full space-y-8 relative z-10">
                {/* Logo y Título */}
                <div className="text-center space-y-4">
                    <div className="flex justify-center mb-6">
                        <img 
                            src="/logogrow.png" 
                            alt="Grow Labs" 
                            className="h-32 w-auto drop-shadow-2xl animate-float"
                            style={{
                                filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.5))'
                            }}
                        />
                    </div>

                    <h1 className="text-5xl font-bold mb-2 tracking-tight">
                        <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                            Sistema de Liquidaciones
                        </span>
                    </h1>
                    <p className="text-xl text-gray-300 flex items-center justify-center gap-2">
                        <Sparkles className="h-5 w-5 text-green-400" />
                        Guardias Médicas - Grow Labs
                    </p>
                </div>

                {/* Cards de Módulos */}
                <div className="grid md:grid-cols-2 gap-6 mt-12">
                    {/* Módulo Pediatría */}
                    <Link href="/pediatria">
                        <div 
                            className="relative rounded-2xl shadow-2xl overflow-hidden p-8 hover:scale-105 transition-all duration-300 cursor-pointer group"
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
                                <div className="text-4xl mb-4">🩺</div>
                                <h2 className="text-2xl font-bold text-green-400 mb-2">Pediatría</h2>
                                <p className="text-gray-300 mb-4">
                                    Pago por producción con retención del 30%
                                </p>
                                <ul className="text-sm text-gray-400 space-y-1">
                                    <li>✓ Cálculo automático de retenciones</li>
                                    <li>✓ Adicionales por Obra Social</li>
                                    <li>✓ Generación de PDFs</li>
                                </ul>
                                <div className="mt-4 text-green-400 group-hover:translate-x-2 transition-transform flex items-center gap-2">
                                    Procesar liquidación 
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Módulo Ginecología */}
                    <Link href="/ginecologia">
                        <div 
                            className="relative rounded-2xl shadow-2xl overflow-hidden p-8 hover:scale-105 transition-all duration-300 cursor-pointer group"
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
                                <div className="text-4xl mb-4">🤰</div>
                                <h2 className="text-2xl font-bold text-blue-400 mb-2">Ginecología</h2>
                                <p className="text-gray-300 mb-4">
                                    Pago por hora con reglas de residentes
                                </p>
                                <ul className="text-sm text-gray-400 space-y-1">
                                    <li>✓ Horario formativo (07:30-15:00)</li>
                                    <li>✓ Diferenciación residentes/planta</li>
                                    <li>✓ Cálculo por horas trabajadas</li>
                                </ul>
                                <div className="mt-4 text-blue-400 group-hover:translate-x-2 transition-transform flex items-center gap-2">
                                    Procesar liquidación 
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Acceso Rápido */}
                <div 
                    className="relative rounded-2xl shadow-2xl overflow-hidden p-6 mt-8"
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.2)',
                    }}
                >
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">Acceso Rápido</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link 
                            href="/admin/medicos" 
                            className="text-center p-4 rounded-lg transition-all duration-300 hover:scale-105"
                            style={{
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                            }}
                        >
                            <div className="text-2xl mb-2">👨‍⚕️</div>
                            <div className="text-sm text-gray-300">Médicos</div>
                        </Link>
                        <Link 
                            href="/admin/tarifas" 
                            className="text-center p-4 rounded-lg transition-all duration-300 hover:scale-105"
                            style={{
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                            }}
                        >
                            <div className="text-2xl mb-2">💰</div>
                            <div className="text-sm text-gray-300">Tarifas</div>
                        </Link>
                        <Link 
                            href="/admin/adicionales" 
                            className="text-center p-4 rounded-lg transition-all duration-300 hover:scale-105"
                            style={{
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                            }}
                        >
                            <div className="text-2xl mb-2">➕</div>
                            <div className="text-sm text-gray-300">Adicionales</div>
                        </Link>
                        <Link 
                            href="/liquidaciones" 
                            className="text-center p-4 rounded-lg transition-all duration-300 hover:scale-105"
                            style={{
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                            }}
                        >
                            <div className="text-2xl mb-2">📊</div>
                            <div className="text-sm text-gray-300">Historial</div>
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-gray-400 text-sm mt-12">
                    <p className="flex items-center justify-center gap-2">
                        Powered by{' '}
                        <span className="text-green-400 font-semibold">Grow Labs</span>
                    </p>
                    <p className="mt-1">© 2025 - Sistema de Liquidaciones de Guardias Médicas</p>
                </div>

                {/* Decoración inferior */}
                <div className="mt-8 flex justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse delay-150"></div>
                    <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse delay-300"></div>
                </div>
            </div>
        </div>
    )
}
