import Link from 'next/link'

export default function HomePage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <div className="max-w-4xl w-full space-y-8">
                {/* Logo y Título */}
                <div className="text-center space-y-4">
                    <div className="flex justify-center mb-6">
                        <div className="animate-float">
                            {/* Logo Grow Labs */}
                            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-green-500/50">
                                🌱
                            </div>
                        </div>
                    </div>

                    <h1 className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                        Sistema de Liquidaciones
                    </h1>
                    <p className="text-xl text-gray-300">
                        Guardias Médicas - Grow Labs
                    </p>
                </div>

                {/* Cards de Módulos */}
                <div className="grid md:grid-cols-2 gap-6 mt-12">
                    {/* Módulo Pediatría */}
                    <Link href="/pediatria">
                        <div className="glass-effect glow-green p-8 rounded-xl hover:scale-105 transition-all duration-300 cursor-pointer group">
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
                            <div className="mt-4 text-green-400 group-hover:translate-x-2 transition-transform">
                                Procesar liquidación →
                            </div>
                        </div>
                    </Link>

                    {/* Módulo Ginecología */}
                    <Link href="/ginecologia">
                        <div className="glass-effect glow-blue p-8 rounded-xl hover:scale-105 transition-all duration-300 cursor-pointer group">
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
                            <div className="mt-4 text-blue-400 group-hover:translate-x-2 transition-transform">
                                Procesar liquidación →
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Acceso Rápido */}
                <div className="glass-effect p-6 rounded-xl mt-8">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">Acceso Rápido</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link href="/admin/medicos" className="text-center p-4 rounded-lg hover:bg-white/5 transition-colors">
                            <div className="text-2xl mb-2">👨‍⚕️</div>
                            <div className="text-sm text-gray-300">Médicos</div>
                        </Link>
                        <Link href="/admin/tarifas" className="text-center p-4 rounded-lg hover:bg-white/5 transition-colors">
                            <div className="text-2xl mb-2">💰</div>
                            <div className="text-sm text-gray-300">Tarifas</div>
                        </Link>
                        <Link href="/admin/adicionales" className="text-center p-4 rounded-lg hover:bg-white/5 transition-colors">
                            <div className="text-2xl mb-2">➕</div>
                            <div className="text-sm text-gray-300">Adicionales</div>
                        </Link>
                        <Link href="/liquidaciones" className="text-center p-4 rounded-lg hover:bg-white/5 transition-colors">
                            <div className="text-2xl mb-2">📊</div>
                            <div className="text-sm text-gray-300">Historial</div>
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-gray-500 text-sm mt-12">
                    <p>Powered by Grow Labs 🌱</p>
                    <p className="mt-1">© 2025 - Sistema de Liquidaciones de Guardias Médicas</p>
                </div>
            </div>
        </div>
    )
}
