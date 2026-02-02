'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, GitCommit, Calendar, User, Sparkles } from 'lucide-react'
import changelogData from '../data/changelog.json'

export default function ChangelogPage() {
    return (
        <div className="min-h-screen bg-black text-white p-6 relative overflow-hidden">
            {/* Background effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00FF88]/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1E3A8A]/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="max-w-4xl mx-auto relative z-10 space-y-12">
                {/* Header */}
                <header className="flex items-center justify-between pb-8 border-b border-white/10">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/20 text-[#00FF88] text-[10px] font-black tracking-widest uppercase">
                            <Sparkles className="h-3 w-3" />
                            System Changelog
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase italic">
                            Actualizaciones <span className="text-[#00FF88]">del Sistema</span>
                        </h1>
                        <p className="text-gray-400 font-medium">Registro histórico de mejoras y correcciones.</p>
                    </div>
                    <Link href="/" className="group">
                        <div className="p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all group-hover:scale-110">
                            <ArrowLeft className="h-6 w-6 text-white" />
                        </div>
                    </Link>
                </header>

                {/* Timeline */}
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                    {changelogData.map((commit, index) => (
                        <div key={commit.hash} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">

                            {/* Icono Central */}
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-black shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 group-hover:border-[#00FF88]/50 group-hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all duration-500">
                                <GitCommit className="w-5 h-5 text-gray-500 group-hover:text-[#00FF88] transition-colors" />
                            </div>

                            {/* Tarjeta de Contenido */}
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#00FF88]/20 hover:bg-white/[0.04] transition-all duration-300 shadow-xl backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-xs font-mono text-[#00FF88]">
                                        <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse"></div>
                                        {commit.hash}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium bg-white/5 px-2 py-1 rounded">
                                        <Calendar className="w-3 h-3" />
                                        {commit.date}
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2 leading-tight">
                                    {commit.message}
                                </h3>
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                                        <User className="w-3 h-3 text-gray-400" />
                                    </div>
                                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                                        {commit.author}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center pt-8">
                    <p className="text-gray-600 text-xs font-mono uppercase tracking-widest">Fin del registro visible</p>
                </div>
            </div>
        </div>
    )
}
