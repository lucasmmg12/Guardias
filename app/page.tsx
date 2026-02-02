'use client'

import Link from 'next/link'
import { Sparkles, Stethoscope, Baby, Upload, User, DollarSign, Hospital, BarChart3, Plus, BookOpen, ClipboardList, Scissors, Linkedin, Instagram, MessageCircle, Globe, ArrowLeft } from 'lucide-react'

export default function HomePage() {
    return (
        <div className="min-h-screen bg-black text-white relative flex flex-col items-center justify-center p-6 overflow-hidden">
            {/* Fondo con auroras de servidor GrowLabs */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00FF88]/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00FF88]/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-[#1E3A8A]/5 rounded-full blur-[150px] animate-pulse delay-1000"></div>
            </div>

            <div className="max-w-6xl w-full space-y-20 relative z-10 pt-12 pb-24">
                {/* Logo y Título Premium */}
                <div className="text-center space-y-8 animate-in fade-in slide-in-from-top-8 duration-1000">
                    <div className="flex justify-center flex-col items-center gap-6">
                        <div className="relative group">
                            <img
                                src="/logogrow.png"
                                alt="Grow Labs"
                                className="h-40 w-auto drop-shadow-[0_0_30px_rgba(0,255,136,0.4)] transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-[#00FF88]/20 blur-3xl rounded-full scale-75 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/20 text-[#00FF88] text-[10px] font-black tracking-[0.3em] uppercase">
                            <Sparkles className="h-3 w-3" />
                            Premium Human Intelligence
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-8xl font-black tracking-tighter leading-[0.85] uppercase italic">
                            SISTEMA DE <br />
                            <span className="text-[#00FF88] not-italic">LIQUIDACIONES</span>
                        </h1>
                        <p className="text-gray-500 text-xl font-bold tracking-tight max-w-2xl mx-auto leading-relaxed">
                            Motor avanzado de gestión para guardias médicas.<br />
                            Arquitectura <span className="text-white">Grow Labs Ultra-Dark</span>.
                        </p>
                    </div>
                </div>

                {/* Grid de Módulos High-Tech */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                    {/* Módulo Pediatría */}
                    <Link href="/pediatria" className="group">
                        <div className="relative h-full rounded-[32px] overflow-hidden p-8 bg-white/[0.03] border border-white/10 hover:border-[#00FF88]/50 hover:bg-[#00FF88]/5 transition-all duration-500 scale-100 hover:scale-[1.02] shadow-2xl">
                            <div className="flex items-start justify-between">
                                <div className="space-y-6">
                                    <div className="w-16 h-16 rounded-2xl bg-[#00FF88]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-[#00FF88]/20">
                                        <Baby className="h-8 w-8 text-[#00FF88]" />
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white group-hover:text-[#00FF88] transition-colors">Pediatría</h2>
                                        <p className="text-gray-400 font-medium mt-2">Producción + Retenciones 30%</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-widest">Auto-Retención</span>
                                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-widest">PDF Engine</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-500 shadow-[0_0_20px_rgba(0,255,136,0.3)]">
                                    <ArrowLeft className="h-6 w-6 text-[#00FF88] rotate-180" />
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Módulo Ginecología */}
                    <Link href="/ginecologia" className="group">
                        <div className="relative h-full rounded-[32px] overflow-hidden p-8 bg-white/[0.03] border border-white/10 hover:border-[#00D1FF]/50 hover:bg-[#00D1FF]/5 transition-all duration-500 scale-100 hover:scale-[1.02] shadow-2xl">
                            <div className="flex items-start justify-between">
                                <div className="space-y-6">
                                    <div className="w-16 h-16 rounded-2xl bg-[#00D1FF]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-[#00D1FF]/20">
                                        <Stethoscope className="h-8 w-8 text-[#00D1FF]" />
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white group-hover:text-[#00D1FF] transition-colors">Ginecología</h2>
                                        <p className="text-gray-400 font-medium mt-2">Horas + Reglas Residentes</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-widest">Time Tracking</span>
                                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-widest">Resident Logic</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-500 shadow-[0_0_20px_rgba(0,209,255,0.3)]">
                                    <ArrowLeft className="h-6 w-6 text-[#00D1FF] rotate-180" />
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Módulo Admisiones */}
                    <Link href="/admisiones" className="group">
                        <div className="relative h-full rounded-[32px] overflow-hidden p-8 bg-white/[0.03] border border-white/10 hover:border-[#FACC15]/50 hover:bg-[#FACC15]/5 transition-all duration-500 scale-100 hover:scale-[1.02] shadow-2xl">
                            <div className="flex items-start justify-between">
                                <div className="space-y-6">
                                    <div className="w-16 h-16 rounded-2xl bg-[#FACC15]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-[#FACC15]/20">
                                        <ClipboardList className="h-8 w-8 text-[#FACC15]" />
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white group-hover:text-[#FACC15] transition-colors">Admisiones</h2>
                                        <p className="text-gray-400 font-medium mt-2">Pago Fijo + Deduplicación</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-widest">Value: $12.000</span>
                                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-widest">Anti-Duplicate</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-500 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                                    <ArrowLeft className="h-6 w-6 text-[#FACC15] rotate-180" />
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Módulo Guardias Clínicas */}
                    <Link href="/guardias-clinicas" className="group">
                        <div className="relative h-full rounded-[32px] overflow-hidden p-8 bg-white/[0.03] border border-white/10 hover:border-[#FF3131]/50 hover:bg-[#FF3131]/5 transition-all duration-500 scale-100 hover:scale-[1.02] shadow-2xl">
                            <div className="flex items-start justify-between">
                                <div className="space-y-6">
                                    <div className="w-16 h-16 rounded-2xl bg-[#FF3131]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-[#FF3131]/20">
                                        <Hospital className="h-8 w-8 text-[#FF3131]" />
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white group-hover:text-[#FF3131] transition-colors">Clínica</h2>
                                        <p className="text-gray-400 font-medium mt-2">Consultas + Horas + Garantía</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-widest">Hybrid Engine</span>
                                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-widest">Min. Guarantee</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-500 shadow-[0_0_20px_rgba(255,49,49,0.3)]">
                                    <ArrowLeft className="h-6 w-6 text-[#FF3131] rotate-180" />
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Módulo Instrumentadores (External) */}
                    <a href="https://liquidaciones-osde.vercel.app/" target="_blank" rel="noopener noreferrer" className="group md:col-span-2">
                        <div className="relative rounded-[32px] overflow-hidden p-8 bg-gradient-to-r from-orange-500/10 to-orange-600/5 animate-shimmer border border-white/5 hover:border-orange-500/30 transition-all duration-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-8">
                                    <div className="w-20 h-20 rounded-2xl bg-orange-500 flex items-center justify-center group-hover:rotate-12 transition-transform duration-500 shadow-[0_10px_40px_rgba(249,115,22,0.4)]">
                                        <Scissors className="h-10 w-10 text-black" />
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white">Quirúrgico</h2>
                                        <p className="text-gray-400 font-medium">Liquidación Integral de Instrumentadores</p>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-4">
                                    <span className="text-[10px] font-black text-orange-500 tracking-[0.3em] uppercase">Vercel Deployment</span>
                                    <div className="p-4 bg-orange-500 rounded-full text-black hover:scale-110 transition-transform">
                                        <Globe className="h-6 w-6" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>

                {/* Footer y Acciones Secundarias Premium */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                    <div className="md:col-span-2 flex flex-col justify-between space-y-8">
                        <div className="flex flex-wrap gap-4">
                            <Link href="/admin/medicos" className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-[#00FF88]/10 hover:border-[#00FF88]/30 transition-all text-xs font-black tracking-widest text-gray-400 hover:text-white uppercase">
                                <User className="h-4 w-4" /> médicos
                            </Link>
                            <Link href="/admin/adicionales" className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-[#00FF88]/10 hover:border-[#00FF88]/30 transition-all text-xs font-black tracking-widest text-gray-400 hover:text-white uppercase">
                                <Plus className="h-4 w-4" /> adicionales
                            </Link>
                            <Link href="/admin/valores-consultas" className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-[#00FF88]/10 hover:border-[#00FF88]/30 transition-all text-xs font-black tracking-widest text-gray-400 hover:text-white uppercase">
                                <DollarSign className="h-4 w-4" /> tarifas
                            </Link>
                            <Link href="/changelog" className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-[#00FF88]/10 hover:border-[#00FF88]/30 transition-all text-xs font-black tracking-widest text-gray-400 hover:text-white uppercase transition-colors duration-300">
                                <Sparkles className="h-4 w-4 text-[#00FF88]" /> actualizaciones
                            </Link>
                            <Link href="/manual" className="flex items-center gap-3 px-6 py-3 rounded-full bg-[#00FF88] text-black hover:scale-105 transition-all text-xs font-black tracking-widest uppercase shadow-[0_0_20px_rgba(0,255,136,0.2)]">
                                <BookOpen className="h-4 w-4" /> manual de uso
                            </Link>
                        </div>

                        <div className="space-y-4">
                            <p className="text-gray-500 text-xs font-mono uppercase tracking-[0.2em] leading-relaxed">
                                © 2025 GROW LABS TECHNOLOGY. ALL RIGHTS RESERVED.<br />
                                POWERED BY <span className="text-white">ULTRA-DARK ENGINE v2.5</span>
                            </p>
                            <div className="flex gap-4">
                                <a href="https://www.linkedin.com/in/lucas-marinero-182521308/" target="_blank" className="text-gray-600 hover:text-[#00FF88] transition-colors"><Linkedin className="h-5 w-5" /></a>
                                <a href="https://www.instagram.com/growsanjuan/" target="_blank" className="text-gray-600 hover:text-[#00FF88] transition-colors"><Instagram className="h-5 w-5" /></a>
                                <a href="https://api.whatsapp.com/send/?phone=5492643229503" target="_blank" className="text-gray-600 hover:text-[#00FF88] transition-colors"><MessageCircle className="h-5 w-5" /></a>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 flex flex-col items-center text-center justify-center space-y-4 group">
                        <div className="w-16 h-16 rounded-full bg-[#00FF88]/10 flex items-center justify-center border border-[#00FF88]/20 group-hover:scale-110 transition-transform">
                            <BarChart3 className="h-8 w-8 text-[#00FF88]" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-tighter italic">Intelligence Hub</h3>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Monitor de rendimiento global activo</p>
                    </div>
                </div>
            </div>

            {/* Custom Animation Styles */}
            <style jsx global>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .animate-shimmer {
                    background-size: 200% auto;
                    animation: shimmer 10s linear infinite;
                }
            `}</style>
        </div>
    )
}
