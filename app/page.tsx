import Link from 'next/link'
import { Sparkles, Stethoscope, Baby, Upload, User, DollarSign, Hospital, BarChart3, Plus, BookOpen, ClipboardList, Scissors, Linkedin, Instagram, MessageCircle, Globe } from 'lucide-react'

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
                <div className="flex flex-col gap-6 mt-12">
                    {/* Módulo Pediatría */}
                    <Link href="/pediatria">
                        <div 
                            className="relative rounded-2xl shadow-2xl overflow-hidden p-6 hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
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
                            <div className="relative flex items-center gap-6">
                                <div className="flex-shrink-0">
                                    <Stethoscope className="h-16 w-16 text-green-400" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-green-400 mb-2">Pediatría</h2>
                                    <p className="text-gray-300 mb-3">
                                        Pago por producción con retención del 30%
                                    </p>
                                    <ul className="text-sm text-gray-400 space-y-1 flex flex-wrap gap-x-4">
                                        <li>✓ Cálculo automático de retenciones</li>
                                        <li>✓ Adicionales por Obra Social</li>
                                        <li>✓ Generación de PDFs</li>
                                    </ul>
                                </div>
                                <div className="flex-shrink-0 text-green-400 group-hover:translate-x-2 transition-transform flex items-center gap-2">
                                    Procesar liquidación 
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Módulo Ginecología */}
                    <Link href="/ginecologia">
                        <div 
                            className="relative rounded-2xl shadow-2xl overflow-hidden p-6 hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
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
                            <div className="relative flex items-center gap-6">
                                <div className="flex-shrink-0">
                                    <Baby className="h-16 w-16 text-blue-400" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-blue-400 mb-2">Ginecología</h2>
                                    <p className="text-gray-300 mb-3">
                                        Pago por hora con reglas de residentes
                                    </p>
                                    <ul className="text-sm text-gray-400 space-y-1 flex flex-wrap gap-x-4">
                                        <li>✓ Horario formativo (07:30-15:00)</li>
                                        <li>✓ Diferenciación residentes/planta</li>
                                        <li>✓ Cálculo por horas trabajadas</li>
                                    </ul>
                                </div>
                                <div className="flex-shrink-0 text-blue-400 group-hover:translate-x-2 transition-transform flex items-center gap-2">
                                    Procesar liquidación 
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Módulo Admisiones Clínicas */}
                    <Link href="/admisiones">
                        <div 
                            className="relative rounded-2xl shadow-2xl overflow-hidden p-6 hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                boxShadow: '0 8px 32px 0 rgba(168, 85, 247, 0.3)',
                            }}
                        >
                            {/* Borde brillante animado */}
                            <div 
                                className="absolute inset-0 rounded-2xl"
                                style={{
                                    background: 'linear-gradient(45deg, transparent, rgba(168, 85, 247, 0.3), transparent)',
                                    animation: 'borderGlow 3s ease-in-out infinite',
                                }}
                            ></div>
                            <div className="relative flex items-center gap-6">
                                <div className="flex-shrink-0">
                                    <ClipboardList className="h-16 w-16 text-purple-400" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-purple-400 mb-2">Admisiones Clínicas</h2>
                                    <p className="text-gray-300 mb-3">
                                        Pago fijo por admisión con deduplicación
                                    </p>
                                    <ul className="text-sm text-gray-400 space-y-1 flex flex-wrap gap-x-4">
                                        <li>✓ Valor fijo: $10,000</li>
                                        <li>✓ Regla FCFS (First Come First Served)</li>
                                        <li>✓ Deduplicación automática</li>
                                    </ul>
                                </div>
                                <div className="flex-shrink-0 text-purple-400 group-hover:translate-x-2 transition-transform flex items-center gap-2">
                                    Procesar liquidación 
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Módulo Guardias Clínicas */}
                    <Link href="/guardias-clinicas">
                        <div 
                            className="relative rounded-2xl shadow-2xl overflow-hidden p-6 hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(236, 72, 153, 0.3)',
                                boxShadow: '0 8px 32px 0 rgba(236, 72, 153, 0.3)',
                            }}
                        >
                            {/* Borde brillante animado */}
                            <div 
                                className="absolute inset-0 rounded-2xl"
                                style={{
                                    background: 'linear-gradient(45deg, transparent, rgba(236, 72, 153, 0.3), transparent)',
                                    animation: 'borderGlow 3s ease-in-out infinite',
                                }}
                            ></div>
                            <div className="relative flex items-center gap-6">
                                <div className="flex-shrink-0">
                                    <Hospital className="h-16 w-16 text-pink-400" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-pink-400 mb-2">Guardias Clínicas</h2>
                                    <p className="text-gray-300 mb-3">
                                        Liquidación por consultas y horas trabajadas
                                    </p>
                                    <ul className="text-sm text-gray-400 space-y-1 flex flex-wrap gap-x-4">
                                        <li>✓ Grupos 70% y 40%</li>
                                        <li>✓ Cálculo por horas y consultas</li>
                                        <li>✓ Garantía mínima por hora</li>
                                    </ul>
                                </div>
                                <div className="flex-shrink-0 text-pink-400 group-hover:translate-x-2 transition-transform flex items-center gap-2">
                                    Procesar liquidación 
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Módulo Instrumentadores */}
                    <a 
                        href="https://liquidaciones-osde.vercel.app/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                    >
                        <div 
                            className="relative rounded-2xl shadow-2xl overflow-hidden p-6 hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(251, 146, 60, 0.3)',
                                boxShadow: '0 8px 32px 0 rgba(251, 146, 60, 0.3)',
                            }}
                        >
                            {/* Borde brillante animado */}
                            <div 
                                className="absolute inset-0 rounded-2xl"
                                style={{
                                    background: 'linear-gradient(45deg, transparent, rgba(251, 146, 60, 0.3), transparent)',
                                    animation: 'borderGlow 3s ease-in-out infinite',
                                }}
                            ></div>
                            <div className="relative flex items-center gap-6">
                                <div className="flex-shrink-0">
                                    <Scissors className="h-16 w-16 text-orange-400" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-orange-400 mb-2">Instrumentadores</h2>
                                    <p className="text-gray-300 mb-3">
                                        Liquidaciones de procedimientos quirúrgicos
                                    </p>
                                    <ul className="text-sm text-gray-400 space-y-1 flex flex-wrap gap-x-4">
                                        <li>✓ Múltiples obras sociales</li>
                                        <li>✓ Gestión de nomencladores</li>
                                        <li>✓ Sistema integral</li>
                                    </ul>
                                </div>
                                <div className="flex-shrink-0 text-orange-400 group-hover:translate-x-2 transition-transform flex items-center gap-2">
                                    Ir al módulo 
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>

                {/* Manual de Usuario */}
                <div 
                    className="relative rounded-2xl shadow-2xl overflow-hidden p-6 mt-8"
                    style={{
                        background: 'rgba(34, 197, 94, 0.15)',
                        backdropFilter: 'blur(20px)',
                        border: '2px solid rgba(34, 197, 94, 0.5)',
                        boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.3)',
                    }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-green-500/30 flex items-center justify-center">
                                <BookOpen className="h-6 w-6 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-green-400">Manual de Usuario</h3>
                                <p className="text-sm text-gray-400">Aprende a usar el sistema paso a paso</p>
                            </div>
                        </div>
                        <Link href="/manual">
                            <button 
                                className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2"
                            >
                                Abrir Manual
                                <span>→</span>
                            </button>
                        </Link>
                    </div>
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
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <Link 
                            href="/admin/medicos" 
                            className="text-center p-4 rounded-lg transition-all duration-300 hover:scale-105"
                            style={{
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                            }}
                        >
                            <div className="mb-2 flex justify-center">
                                <User className="h-8 w-8 text-green-400" />
                            </div>
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
                            <div className="mb-2 flex justify-center">
                                <DollarSign className="h-8 w-8 text-green-400" />
                            </div>
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
                            <div className="mb-2 flex justify-center">
                                <Plus className="h-8 w-8 text-green-400" />
                            </div>
                            <div className="text-sm text-gray-300">Adicionales</div>
                        </Link>
                        <Link 
                            href="/admin/valores-consultas" 
                            className="text-center p-4 rounded-lg transition-all duration-300 hover:scale-105"
                            style={{
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                            }}
                        >
                            <div className="mb-2 flex justify-center">
                                <Hospital className="h-8 w-8 text-green-400" />
                            </div>
                            <div className="text-sm text-gray-300">Valores Consultas</div>
                        </Link>
                        <Link 
                            href="/liquidaciones" 
                            className="text-center p-4 rounded-lg transition-all duration-300 hover:scale-105"
                            style={{
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                            }}
                        >
                            <div className="mb-2 flex justify-center">
                                <BarChart3 className="h-8 w-8 text-green-400" />
                            </div>
                            <div className="text-sm text-gray-300">Historial</div>
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-16 pt-8 border-t border-white/10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        {/* Redes Sociales */}
                        <div className="flex items-center gap-3">
                            <a
                                href="https://www.linkedin.com/in/lucas-marinero-182521308/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center hover:bg-green-500/20 hover:border-green-500/50 transition-all duration-300 hover:scale-110"
                                aria-label="LinkedIn"
                            >
                                <Linkedin className="h-5 w-5 text-green-400" />
                            </a>
                            <a
                                href="https://www.instagram.com/growsanjuan/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center hover:bg-green-500/20 hover:border-green-500/50 transition-all duration-300 hover:scale-110"
                                aria-label="Instagram"
                            >
                                <Instagram className="h-5 w-5 text-green-400" />
                            </a>
                            <a
                                href="https://api.whatsapp.com/send/?phone=5492643229503&text&type=phone_number&app_absent=0"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center hover:bg-green-500/20 hover:border-green-500/50 transition-all duration-300 hover:scale-110"
                                aria-label="WhatsApp"
                            >
                                <MessageCircle className="h-5 w-5 text-green-400" />
                            </a>
                            <a
                                href="https://www.growsanjuan.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center hover:bg-green-500/20 hover:border-green-500/50 transition-all duration-300 hover:scale-110"
                                aria-label="Sitio Web"
                            >
                                <Globe className="h-5 w-5 text-green-400" />
                            </a>
                        </div>
                        
                        {/* Texto del Footer */}
                        <div className="text-center md:text-right text-gray-300 text-sm">
                            <p>
                                © 2025 Grow Labs. Todos los derechos reservados. | Powered by{' '}
                                <span className="text-green-400 font-semibold">Grow Labs Technology</span>
                            </p>
                        </div>
                    </div>
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
