'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Stethoscope, Baby, Upload, FileText, History, FileSpreadsheet, User, DollarSign, Hospital, BarChart3, Plus, GraduationCap, ChevronRight, ChevronDown, CheckCircle2, XCircle, AlertTriangle, Info, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type SeccionManual = 'inicio' | 'pediatria' | 'ginecologia' | 'admisiones' | 'mapa' | 'problemas'

export default function ManualPage() {
  const router = useRouter()
  const [seccionActiva, setSeccionActiva] = useState<SeccionManual>('inicio')
  const [subseccionExpandida, setSubseccionExpandida] = useState<string | null>(null)

  const toggleSubseccion = (id: string) => {
    setSubseccionExpandida(subseccionExpandida === id ? null : id)
  }

  return (
    <div className="min-h-screen relative p-8 pb-20 overflow-hidden">
      {/* Efectos de luz verde */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-green-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="border-green-500/50 text-green-400 hover:bg-green-500/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-4xl font-bold mb-2 tracking-tight">
                <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent flex items-center gap-3">
                  <BookOpen className="h-10 w-10 text-green-400" />
                  Manual de Usuario
                </span>
              </h1>
              <p className="text-gray-400">Guía completa del sistema de liquidaciones</p>
            </div>
          </div>
        </div>

        {/* Navegación lateral y contenido */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar de navegación */}
          <div 
            className="lg:col-span-1"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '1rem',
              padding: '1.5rem',
              height: 'fit-content',
              position: 'sticky',
              top: '2rem'
            }}
          >
            <nav className="space-y-2">
              <button
                onClick={() => setSeccionActiva('inicio')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-2 ${
                  seccionActiva === 'inicio'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Inicio Rápido
              </button>
              <button
                onClick={() => setSeccionActiva('mapa')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-2 ${
                  seccionActiva === 'mapa'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Mapa del Sitio
              </button>
              <button
                onClick={() => setSeccionActiva('pediatria')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-2 ${
                  seccionActiva === 'pediatria'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <Stethoscope className="h-4 w-4" />
                Módulo Pediatría
              </button>
              <button
                onClick={() => setSeccionActiva('ginecologia')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-2 ${
                  seccionActiva === 'ginecologia'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <Baby className="h-4 w-4" />
                Módulo Ginecología
              </button>
              <button
                onClick={() => setSeccionActiva('admisiones')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-2 ${
                  seccionActiva === 'admisiones'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <ClipboardList className="h-4 w-4" />
                Módulo Admisiones Clínicas
              </button>
              <button
                onClick={() => setSeccionActiva('problemas')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-2 ${
                  seccionActiva === 'problemas'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                Solución de Problemas
              </button>
            </nav>
          </div>

          {/* Contenido principal */}
          <div className="lg:col-span-3">
            <div 
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '1rem',
                padding: '2rem',
                minHeight: '600px'
              }}
            >
              {/* Sección: Inicio Rápido */}
              {seccionActiva === 'inicio' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-green-400 mb-6">🚀 Inicio Rápido</h2>
                  
                  {/* Flujo de trabajo */}
                  <div 
                    className="p-6 rounded-xl"
                    style={{
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                    }}
                  >
                    <h3 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Flujo de Trabajo Básico
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">📥</span>
                        </div>
                        <h4 className="font-semibold text-white mb-2">Paso 1: Cargar</h4>
                        <p className="text-sm text-gray-400">Sube tu archivo Excel</p>
                      </div>
                      <div className="flex items-center justify-center">
                        <ChevronRight className="h-8 w-8 text-green-400 hidden md:block" />
                        <ChevronDown className="h-8 w-8 text-green-400 md:hidden" />
                      </div>
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">⚙️</span>
                        </div>
                        <h4 className="font-semibold text-white mb-2">Paso 2: Procesar</h4>
                        <p className="text-sm text-gray-400">El sistema procesa los datos</p>
                      </div>
                      <div className="flex items-center justify-center md:col-span-3">
                        <ChevronDown className="h-8 w-8 text-green-400" />
                      </div>
                      <div className="text-center md:col-span-3">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">📊</span>
                        </div>
                        <h4 className="font-semibold text-white mb-2">Paso 3: Ver Resúmenes</h4>
                        <p className="text-sm text-gray-400">Revisa y exporta los resultados</p>
                      </div>
                    </div>
                  </div>

                  {/* Selección de módulo */}
                  <div 
                    className="p-6 rounded-xl"
                    style={{
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                    }}
                  >
                    <h3 className="text-xl font-semibold text-green-400 mb-4">🎯 ¿Qué Módulo Usar?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div 
                        className="p-4 rounded-lg"
                        style={{
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                        }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Stethoscope className="h-8 w-8 text-green-400" />
                          <h4 className="text-lg font-semibold text-green-400">Pediatría</h4>
                        </div>
                        <ul className="text-sm text-gray-300 space-y-1">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                            Pago por consulta
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                            Retención 30%
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                            Adicionales por Obra Social
                          </li>
                        </ul>
                        <Link href="/pediatria">
                          <Button className="w-full mt-4 bg-green-600 hover:bg-green-500">
                            Ir a Pediatría →
                          </Button>
                        </Link>
                      </div>
                      <div 
                        className="p-4 rounded-lg"
                        style={{
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                        }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Baby className="h-8 w-8 text-blue-400" />
                          <h4 className="text-lg font-semibold text-blue-400">Ginecología</h4>
                        </div>
                        <ul className="text-sm text-gray-300 space-y-1">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-400" />
                            Pago por hora
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-400" />
                            Reglas de residentes
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-400" />
                            Retención 20%
                          </li>
                        </ul>
                        <Link href="/ginecologia">
                          <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-500">
                            Ir a Ginecología →
                          </Button>
                        </Link>
                      </div>
                      {/* Admisiones Clínicas */}
                      <div 
                        className="p-6 rounded-xl"
                        style={{
                          background: 'rgba(168, 85, 247, 0.15)',
                          border: '2px solid rgba(168, 85, 247, 0.5)',
                        }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <ClipboardList className="h-8 w-8 text-purple-400" />
                          <div>
                            <h3 className="text-xl font-bold text-purple-400">Admisiones Clínicas</h3>
                            <p className="text-sm text-gray-400">Pago fijo por admisión</p>
                          </div>
                        </div>
                        <ul className="space-y-2 mb-4">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-purple-400" />
                            Valor fijo: $10,000
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-purple-400" />
                            Deduplicación FCFS
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-purple-400" />
                            Sin retención
                          </li>
                        </ul>
                        <Link href="/admisiones">
                          <Button className="w-full mt-4 bg-purple-600 hover:bg-purple-500">
                            Ir a Admisiones →
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Guía rápida */}
                  <div 
                    className="p-6 rounded-xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <h3 className="text-xl font-semibold text-white mb-4">📋 Guía Rápida</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-green-400 font-bold">1</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white mb-1">Selecciona el módulo</h4>
                          <p className="text-sm text-gray-400">Elige Pediatría, Ginecología o Admisiones Clínicas según corresponda</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-green-400 font-bold">2</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white mb-1">Carga tu archivo Excel</h4>
                          <p className="text-sm text-gray-400">Arrastra o selecciona el archivo con los datos de las consultas</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-green-400 font-bold">3</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white mb-1">Confirma el período</h4>
                          <p className="text-sm text-gray-400">Verifica que el mes y año sean correctos</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-green-400 font-bold">4</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white mb-1">Procesa y revisa</h4>
                          <p className="text-sm text-gray-400">El sistema procesará los datos y podrás ver los resúmenes</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sección: Mapa del Sitio */}
              {seccionActiva === 'mapa' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-green-400 mb-6">🗺️ Mapa del Sitio</h2>
                  
                  {/* Mapa visual */}
                  <div className="space-y-4">
                    {/* Página Principal */}
                    <div 
                      className="p-6 rounded-xl"
                      style={{
                        background: 'rgba(34, 197, 94, 0.15)',
                        border: '2px solid rgba(34, 197, 94, 0.5)',
                      }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-green-500/30 flex items-center justify-center">
                          <span className="text-2xl">🏠</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-green-400">Página Principal</h3>
                          <p className="text-sm text-gray-400">Punto de entrada al sistema</p>
                        </div>
                      </div>
                    </div>

                    {/* Módulos principales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Pediatría */}
                      <div 
                        className="p-4 rounded-lg"
                        style={{
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Stethoscope className="h-5 w-5 text-green-400" />
                          <h4 className="font-semibold text-green-400">Módulo Pediatría</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-300">
                            <ChevronRight className="h-4 w-4 text-green-400" />
                            <span>Cargar Liquidación</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <ChevronRight className="h-4 w-4 text-green-400" />
                            <span>Resúmenes</span>
                            <span className="text-xs text-gray-500">(4 tabs)</span>
                          </div>
                        </div>
                      </div>

                      {/* Ginecología */}
                      <div 
                        className="p-4 rounded-lg"
                        style={{
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Baby className="h-5 w-5 text-blue-400" />
                          <h4 className="font-semibold text-blue-400">Módulo Ginecología</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-300">
                            <ChevronRight className="h-4 w-4 text-blue-400" />
                            <span>Cargar Liquidación</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <ChevronRight className="h-4 w-4 text-blue-400" />
                            <span>Resúmenes</span>
                            <span className="text-xs text-gray-500">(5 tabs)</span>
                          </div>
                        </div>
                      </div>

                      {/* Admisiones Clínicas */}
                      <div 
                        className="p-4 rounded-lg"
                        style={{
                          background: 'rgba(168, 85, 247, 0.1)',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <ClipboardList className="h-5 w-5 text-purple-400" />
                          <h4 className="font-semibold text-purple-400">Módulo Admisiones Clínicas</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-300">
                            <ChevronRight className="h-4 w-4 text-purple-400" />
                            <span>Cargar Liquidación</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <ChevronRight className="h-4 w-4 text-purple-400" />
                            <span>Resúmenes</span>
                            <span className="text-xs text-gray-500">(4 tabs)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Administración */}
                    <div 
                      className="p-6 rounded-xl"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-green-400" />
                        Administración
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="text-center p-3 rounded-lg bg-white/5">
                          <User className="h-6 w-6 text-green-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-300">Médicos</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-white/5">
                          <DollarSign className="h-6 w-6 text-green-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-300">Tarifas</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-white/5">
                          <Plus className="h-6 w-6 text-green-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-300">Adicionales</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-white/5">
                          <Hospital className="h-6 w-6 text-green-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-300">Valores</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-white/5">
                          <BarChart3 className="h-6 w-6 text-green-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-300">Historial</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Diagrama de flujo */}
                  <div 
                    className="p-6 rounded-xl"
                    style={{
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                    }}
                  >
                    <h3 className="text-lg font-semibold text-green-400 mb-4">📊 Estructura de Navegación</h3>
                    <div className="space-y-3 font-mono text-sm">
                      <div className="text-green-400">🏠 Inicio</div>
                      <div className="ml-4 space-y-2">
                        <div className="text-gray-300">├─ 🩺 Pediatría</div>
                        <div className="ml-4 space-y-1 text-gray-400">
                          <div>│  ├─ 📥 Cargar Liquidación</div>
                          <div>│  └─ 📊 Resúmenes</div>
                          <div className="ml-4 space-y-1">
                            <div>│     ├─ Por Médico y Obra Social</div>
                            <div>│     ├─ Por Prestador</div>
                            <div>│     ├─ Historial</div>
                            <div>│     └─ Excel</div>
                          </div>
                        </div>
                        <div className="text-gray-300">├─ 🤰 Ginecología</div>
                        <div className="ml-4 space-y-1 text-gray-400">
                          <div>│  ├─ 📥 Cargar Liquidación</div>
                          <div>│  └─ 📊 Resúmenes</div>
                          <div className="ml-4 space-y-1">
                            <div>│     ├─ Por Médico</div>
                            <div>│     ├─ Por Prestador</div>
                            <div>│     ├─ Historial</div>
                            <div>│     ├─ Residentes Formativos</div>
                            <div>│     └─ Excel</div>
                          </div>
                        </div>
                        <div className="text-gray-300">└─ 🔧 Administración</div>
                        <div className="ml-4 space-y-1 text-gray-400">
                          <div>   ├─ 👨‍⚕️ Médicos</div>
                          <div>   ├─ 💰 Tarifas</div>
                          <div>   ├─ ➕ Adicionales</div>
                          <div>   ├─ 🏥 Valores Consultas</div>
                          <div>   └─ 📊 Historial</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sección: Pediatría */}
              {seccionActiva === 'pediatria' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-green-400 mb-6 flex items-center gap-3">
                    <Stethoscope className="h-8 w-8" />
                    Módulo de Pediatría
                  </h2>

                  {/* Proceso de carga */}
                  <div 
                    className="p-6 rounded-xl cursor-pointer"
                    style={{
                      background: subseccionExpandida === 'carga' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                    }}
                    onClick={() => toggleSubseccion('carga')}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-green-400 flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Cargar Liquidación
                      </h3>
                      {subseccionExpandida === 'carga' ? (
                        <ChevronDown className="h-5 w-5 text-green-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    {subseccionExpandida === 'carga' && (
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="text-center p-4 rounded-lg bg-green-500/10">
                            <div className="text-3xl mb-2">1️⃣</div>
                            <p className="text-sm text-gray-300">Acceder al módulo</p>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-green-500/10">
                            <div className="text-3xl mb-2">2️⃣</div>
                            <p className="text-sm text-gray-300">Cargar Excel</p>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-green-500/10">
                            <div className="text-3xl mb-2">3️⃣</div>
                            <p className="text-sm text-gray-300">Confirmar período</p>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-green-500/10">
                            <div className="text-3xl mb-2">4️⃣</div>
                            <p className="text-sm text-gray-300">Procesar</p>
                          </div>
                        </div>
                        <div 
                          className="p-4 rounded-lg"
                          style={{
                            background: 'rgba(0, 0, 0, 0.2)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                          }}
                        >
                          <h4 className="font-semibold text-white mb-2">📊 Formato del Excel</h4>
                          <div className="text-sm text-gray-300 space-y-1">
                            <p>• <strong>Fila 1:</strong> Headers (nombres de columnas)</p>
                            <p>• <strong>Desde Fila 2:</strong> Datos de las consultas</p>
                            <p>• <strong>Columnas requeridas:</strong> Fecha, Hora, Paciente, Cliente, Responsable</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reglas de negocio */}
                  <div 
                    className="p-6 rounded-xl cursor-pointer"
                    style={{
                      background: subseccionExpandida === 'reglas' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                    }}
                    onClick={() => toggleSubseccion('reglas')}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-green-400 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Reglas de Negocio
                      </h3>
                      {subseccionExpandida === 'reglas' ? (
                        <ChevronDown className="h-5 w-5 text-green-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    {subseccionExpandida === 'reglas' && (
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-green-400 mb-2">Retención</h4>
                            <p className="text-2xl font-bold text-white">30%</p>
                            <p className="text-xs text-gray-400 mt-1">Sobre monto facturado</p>
                          </div>
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-green-400 mb-2">Adicionales</h4>
                            <p className="text-sm text-gray-300">DAMSU y PROVINCIA</p>
                            <p className="text-xs text-gray-400 mt-1">Configurables</p>
                          </div>
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-green-400 mb-2">Fórmula</h4>
                            <p className="text-sm font-mono text-gray-300">(Monto - 30%) + Adicional</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resúmenes */}
                  <div 
                    className="p-6 rounded-xl cursor-pointer"
                    style={{
                      background: subseccionExpandida === 'resumenes' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                    }}
                    onClick={() => toggleSubseccion('resumenes')}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-green-400 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Resúmenes Disponibles
                      </h3>
                      {subseccionExpandida === 'resumenes' ? (
                        <ChevronDown className="h-5 w-5 text-green-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    {subseccionExpandida === 'resumenes' && (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Por Médico y Obra Social
                            </h4>
                            <p className="text-sm text-gray-300">Desglose detallado por médico y obra social</p>
                            <p className="text-xs text-gray-400 mt-2">✓ Exportar PDF individual</p>
                          </div>
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              Por Prestador
                            </h4>
                            <p className="text-sm text-gray-300">Resumen consolidado por médico</p>
                            <p className="text-xs text-gray-400 mt-2">✓ Exportar Excel y PDF</p>
                          </div>
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                              <History className="h-4 w-4" />
                              Historial
                            </h4>
                            <p className="text-sm text-gray-300">Todas las liquidaciones procesadas</p>
                            <p className="text-xs text-gray-400 mt-2">✓ Ver detalles expandidos</p>
                          </div>
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4" />
                              Excel
                            </h4>
                            <p className="text-sm text-gray-300">Edición y revisión de datos</p>
                            <p className="text-xs text-gray-400 mt-2">✓ Edición inline, filtros, exportación</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sección: Ginecología */}
              {seccionActiva === 'ginecologia' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-blue-400 mb-6 flex items-center gap-3">
                    <Baby className="h-8 w-8" />
                    Módulo de Ginecología
                  </h2>

                  {/* Formato especial */}
                  <div 
                    className="p-6 rounded-xl"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '2px solid rgba(239, 68, 68, 0.5)',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                      <h3 className="text-lg font-semibold text-red-400">⚠️ Formato Especial del Excel</h3>
                    </div>
                    <div className="space-y-2 text-sm text-gray-300">
                      <p>• <strong>Fila 10:</strong> Headers (nombres de columnas) ⚠️</p>
                      <p>• <strong>Desde Fila 11:</strong> Datos de las consultas</p>
                      <p className="text-xs text-gray-400 mt-2">Diferente a Pediatría que usa Fila 1 para headers</p>
                    </div>
                  </div>

                  {/* Regla de residentes */}
                  <div 
                    className="p-6 rounded-xl cursor-pointer"
                    style={{
                      background: subseccionExpandida === 'residentes' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                    onClick={() => toggleSubseccion('residentes')}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" />
                        Regla de Residentes en Horario Formativo
                      </h3>
                      {subseccionExpandida === 'residentes' ? (
                        <ChevronDown className="h-5 w-5 text-blue-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    {subseccionExpandida === 'residentes' && (
                      <div className="mt-4 space-y-4">
                        <div 
                          className="p-4 rounded-lg"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                          }}
                        >
                          <h4 className="font-semibold text-red-400 mb-3">❌ NO SE PAGA si se cumplen TODAS estas condiciones:</h4>
                          <ul className="space-y-2 text-sm text-gray-300">
                            <li className="flex items-start gap-2">
                              <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                              <span>Médico es <strong>RESIDENTE</strong> (verificado en BD)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                              <span>Día: <strong>Lunes a Sábado</strong> (no domingo)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                              <span>Horario: <strong className="text-blue-400">07:00 a 15:00</strong> (incluye 07:00, excluye 15:00)</span>
                            </li>
                          </ul>
                        </div>
                        <div 
                          className="p-4 rounded-lg"
                          style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                          }}
                        >
                          <h4 className="font-semibold text-green-400 mb-3">✅ Casos que SÍ se Pagan:</h4>
                          <ul className="space-y-2 text-sm text-gray-300">
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                              <span>Residente fuera del horario formativo (ej: 16:00, 20:00)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                              <span>Residente en <strong>Domingo</strong> (cualquier hora)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                              <span>Médico de <strong>Planta</strong> (no residente) - siempre se paga</span>
                            </li>
                          </ul>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                            <p className="text-gray-300">07:00 (Residente, L-S)</p>
                            <p className="text-red-400 font-bold">$0</p>
                          </div>
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                            <p className="text-gray-300">14:59 (Residente, L-S)</p>
                            <p className="text-red-400 font-bold">$0</p>
                          </div>
                          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                            <p className="text-gray-300">15:00 (Residente, L-S)</p>
                            <p className="text-green-400 font-bold">Se paga</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resúmenes */}
                  <div 
                    className="p-6 rounded-xl cursor-pointer"
                    style={{
                      background: subseccionExpandida === 'resumenes-gine' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                    onClick={() => toggleSubseccion('resumenes-gine')}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Resúmenes Disponibles
                      </h3>
                      {subseccionExpandida === 'resumenes-gine' ? (
                        <ChevronDown className="h-5 w-5 text-blue-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    {subseccionExpandida === 'resumenes-gine' && (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Por Médico
                            </h4>
                            <p className="text-sm text-gray-300">Desglose por médico y obra social</p>
                          </div>
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              Por Prestador
                            </h4>
                            <p className="text-sm text-gray-300">Resumen consolidado</p>
                          </div>
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                              <GraduationCap className="h-4 w-4" />
                              Residentes Formativos
                            </h4>
                            <p className="text-sm text-gray-300">Solo control interno</p>
                            <p className="text-xs text-gray-400 mt-1">No se muestra a médicos</p>
                          </div>
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4" />
                              Excel
                            </h4>
                            <p className="text-sm text-gray-300">Edición y revisión</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sección: Módulo Admisiones Clínicas */}
              {seccionActiva === 'admisiones' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-purple-400 mb-6 flex items-center gap-3">
                    <ClipboardList className="h-8 w-8" />
                    Módulo de Admisiones Clínicas
                  </h2>

                  {/* Formato especial */}
                  <div 
                    className="p-6 rounded-xl"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '2px solid rgba(239, 68, 68, 0.5)',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                      <h3 className="text-lg font-semibold text-red-400">⚠️ Formato Especial del Excel</h3>
                    </div>
                    <div className="space-y-2 text-sm text-gray-300">
                      <p>• <strong>Filas 1-9:</strong> Metadatos y texto basura (se ignoran) ⚠️</p>
                      <p>• <strong>Fila 10:</strong> Headers (nombres de columnas) ⚠️</p>
                      <p>• <strong>Desde Fila 11:</strong> Datos de las admisiones</p>
                      <p className="text-xs text-gray-400 mt-2">El sistema filtra automáticamente las filas basura y solo procesa datos válidos</p>
                    </div>
                  </div>

                  {/* Reglas de negocio */}
                  <div 
                    className="p-6 rounded-xl cursor-pointer"
                    style={{
                      background: subseccionExpandida === 'reglas-adm' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                    }}
                    onClick={() => toggleSubseccion('reglas-adm')}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-purple-400 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Reglas de Negocio
                      </h3>
                      {subseccionExpandida === 'reglas-adm' ? (
                        <ChevronDown className="h-5 w-5 text-purple-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    {subseccionExpandida === 'reglas-adm' && (
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(168, 85, 247, 0.1)',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-purple-400 mb-2">Valor Fijo</h4>
                            <p className="text-2xl font-bold text-white">$10,000</p>
                            <p className="text-xs text-gray-400 mt-1">Por cada admisión válida</p>
                            <p className="text-xs text-gray-400 mt-1">Valor fijo para septiembre 2025</p>
                          </div>
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(168, 85, 247, 0.1)',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-purple-400 mb-2">Sin Retención</h4>
                            <p className="text-2xl font-bold text-white">0%</p>
                            <p className="text-xs text-gray-400 mt-1">No se aplica retención</p>
                            <p className="text-xs text-gray-400 mt-1">Pago completo al prestador</p>
                          </div>
                        </div>

                        {/* Deduplicación */}
                        <div 
                          className="p-4 rounded-lg"
                          style={{
                            background: 'rgba(103, 232, 249, 0.1)',
                            border: '1px solid rgba(103, 232, 249, 0.3)',
                          }}
                        >
                          <h4 className="font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                            <Info className="h-5 w-5" />
                            Sistema de Deduplicación (FCFS)
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-300 mb-2">Regla A: Auto-duplicado</p>
                              <p className="text-sm text-gray-400">Si el mismo médico admite al mismo paciente en la misma fecha múltiples veces, se cuenta como <strong className="text-cyan-400">1 admisión</strong>.</p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-300 mb-2">Regla B: First Come First Served (FCFS)</p>
                              <p className="text-sm text-gray-400">Si un paciente aparece en la misma fecha pero con <strong>diferentes médicos</strong>, se aplica la regla FCFS:</p>
                              <ul className="text-sm text-gray-400 mt-2 space-y-1 ml-4">
                                <li>• Se mantiene el <strong className="text-cyan-400">primer registro</strong> encontrado</li>
                                <li>• Los registros posteriores se marcan como <strong className="text-cyan-400">duplicados</strong> (color celeste)</li>
                                <li>• Solo un médico recibe el pago por paciente/día</li>
                              </ul>
                            </div>
                            <div className="mt-3 p-3 rounded bg-cyan-500/10 border border-cyan-500/30">
                              <p className="text-xs text-cyan-300">
                                <strong>Nota:</strong> Los duplicados se guardan en la base de datos pero se marcan visualmente para revisión manual.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Validaciones excluidas */}
                        <div 
                          className="p-4 rounded-lg"
                          style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                          }}
                        >
                          <h4 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" />
                            Validaciones Excluidas (Solo para Admisiones)
                          </h4>
                          <div className="space-y-2 text-sm text-gray-300">
                            <p className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                              <span><strong>NO se valida obra social</strong> - No se requiere verificar si el paciente tiene obra social</span>
                            </p>
                            <p className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                              <span><strong>NO se valida horario de inicio</strong> - No se requiere hora de atención</span>
                            </p>
                            <p className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                              <span><strong>SÍ se detectan duplicados</strong> - Se marcan en color celeste para revisión</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Proceso de carga */}
                  <div 
                    className="p-6 rounded-xl cursor-pointer"
                    style={{
                      background: subseccionExpandida === 'carga-adm' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                    }}
                    onClick={() => toggleSubseccion('carga-adm')}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-purple-400 flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Cargar Liquidación
                      </h3>
                      {subseccionExpandida === 'carga-adm' ? (
                        <ChevronDown className="h-5 w-5 text-purple-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    {subseccionExpandida === 'carga-adm' && (
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="text-center p-4 rounded-lg bg-purple-500/10">
                            <div className="text-3xl mb-2">1️⃣</div>
                            <p className="text-sm text-gray-300">Acceder al módulo</p>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-purple-500/10">
                            <div className="text-3xl mb-2">2️⃣</div>
                            <p className="text-sm text-gray-300">Cargar Excel</p>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-purple-500/10">
                            <div className="text-3xl mb-2">3️⃣</div>
                            <p className="text-sm text-gray-300">Confirmar período</p>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-purple-500/10">
                            <div className="text-3xl mb-2">4️⃣</div>
                            <p className="text-sm text-gray-300">Procesar</p>
                          </div>
                        </div>
                        <div 
                          className="p-4 rounded-lg"
                          style={{
                            background: 'rgba(0, 0, 0, 0.2)',
                            border: '1px solid rgba(168, 85, 247, 0.2)',
                          }}
                        >
                          <h4 className="font-semibold text-white mb-2">📊 Columnas Requeridas</h4>
                          <div className="text-sm text-gray-300 space-y-1">
                            <p>• <strong>Fecha Visita:</strong> Fecha de la admisión (formato: DD/MM/YYYY o YYYY-MM-DD)</p>
                            <p>• <strong>Paciente:</strong> Nombre del paciente</p>
                            <p>• <strong>Responsable de admisión:</strong> Nombre del médico responsable</p>
                            <p className="text-xs text-gray-400 mt-2">El sistema filtra automáticamente filas sin fecha válida</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resúmenes */}
                  <div 
                    className="p-6 rounded-xl cursor-pointer"
                    style={{
                      background: subseccionExpandida === 'resumenes-adm' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                    }}
                    onClick={() => toggleSubseccion('resumenes-adm')}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-purple-400 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Resúmenes Disponibles
                      </h3>
                      {subseccionExpandida === 'resumenes-adm' ? (
                        <ChevronDown className="h-5 w-5 text-purple-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    {subseccionExpandida === 'resumenes-adm' && (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(168, 85, 247, 0.1)',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-purple-400 mb-2 flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Por Médico
                            </h4>
                            <p className="text-sm text-gray-300">Resumen agrupado por médico responsable</p>
                            <p className="text-xs text-gray-400 mt-1">Cantidad, valor unitario y total</p>
                          </div>
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(168, 85, 247, 0.1)',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-purple-400 mb-2 flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              Por Prestador
                            </h4>
                            <p className="text-sm text-gray-300">Resumen consolidado por prestador</p>
                            <p className="text-xs text-gray-400 mt-1">Con detalle de pacientes atendidos</p>
                            <p className="text-xs text-purple-300 mt-1 font-semibold">✨ Incluye PDF individual por prestador</p>
                          </div>
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(168, 85, 247, 0.1)',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-purple-400 mb-2 flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4" />
                              Excel Original
                            </h4>
                            <p className="text-sm text-gray-300">Visualización y edición</p>
                            <p className="text-xs text-gray-400 mt-1">Duplicados marcados en celeste</p>
                          </div>
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(168, 85, 247, 0.1)',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-purple-400 mb-2 flex items-center gap-2">
                              <History className="h-4 w-4" />
                              Historial
                            </h4>
                            <p className="text-sm text-gray-300">Liquidaciones procesadas</p>
                            <p className="text-xs text-gray-400 mt-1">Por mes y año</p>
                          </div>
                        </div>
                        <div 
                          className="p-4 rounded-lg mt-4"
                          style={{
                            background: 'rgba(103, 232, 249, 0.1)',
                            border: '1px solid rgba(103, 232, 249, 0.3)',
                          }}
                        >
                          <h4 className="font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Exportación de PDFs
                          </h4>
                          <div className="text-sm text-gray-300 space-y-2">
                            <p>• <strong>PDF Completo:</strong> Resumen de todos los prestadores</p>
                            <p>• <strong>PDF Individual:</strong> Cada prestador puede descargar su resumen con:</p>
                            <ul className="text-xs text-gray-400 ml-4 mt-1 space-y-1">
                              <li>- Resumen general (cantidad, valor unitario, total)</li>
                              <li>- Tabla detallada con todos sus pacientes (fecha, paciente, valor)</li>
                              <li>- Formato profesional listo para presentar</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sección: Solución de Problemas */}
              {seccionActiva === 'problemas' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-green-400 mb-6 flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8" />
                    Solución de Problemas
                  </h2>

                  {/* Problemas comunes */}
                  <div className="space-y-4">
                    <div 
                      className="p-6 rounded-xl cursor-pointer"
                      style={{
                        background: subseccionExpandida === 'error-filas' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                      }}
                      onClick={() => toggleSubseccion('error-filas')}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                          <XCircle className="h-5 w-5" />
                          Error: "No se procesó ninguna fila válida"
                        </h3>
                        {subseccionExpandida === 'error-filas' ? (
                          <ChevronDown className="h-5 w-5 text-red-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      {subseccionExpandida === 'error-filas' && (
                        <div className="mt-4 space-y-3">
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(0, 0, 0, 0.2)',
                            }}
                          >
                            <h4 className="font-semibold text-white mb-2">🔍 Causa:</h4>
                            <p className="text-sm text-gray-300">El Excel no tiene fechas válidas o el formato es incorrecto</p>
                          </div>
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-green-400 mb-2">✅ Solución:</h4>
                            <ul className="text-sm text-gray-300 space-y-1">
                              <li>1. Verificar que la columna "Fecha" tenga datos</li>
                              <li>2. Verificar formato: DD/MM/YYYY</li>
                              <li>3. <strong>Ginecología:</strong> Verificar headers en fila 10</li>
                              <li>4. <strong>Pediatría:</strong> Verificar headers en fila 1</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    <div 
                      className="p-6 rounded-xl cursor-pointer"
                      style={{
                        background: subseccionExpandida === 'medicos-no-encontrados' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                      }}
                      onClick={() => toggleSubseccion('medicos-no-encontrados')}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-yellow-400 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Advertencia: "Médicos no encontrados"
                        </h3>
                        {subseccionExpandida === 'medicos-no-encontrados' ? (
                          <ChevronDown className="h-5 w-5 text-yellow-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      {subseccionExpandida === 'medicos-no-encontrados' && (
                        <div className="mt-4 space-y-3">
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(0, 0, 0, 0.2)',
                            }}
                          >
                            <h4 className="font-semibold text-white mb-2">🔍 Causa:</h4>
                            <p className="text-sm text-gray-300">Los nombres de médicos en el Excel no coinciden con los de la base de datos</p>
                          </div>
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-green-400 mb-2">✅ Solución:</h4>
                            <ul className="text-sm text-gray-300 space-y-1">
                              <li>1. Ir a: <strong className="text-green-400">Admin → Médicos</strong></li>
                              <li>2. Verificar que el médico esté cargado</li>
                              <li>3. Verificar que el nombre coincida exactamente</li>
                              <li>4. El sistema intenta coincidencias flexibles automáticamente</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    <div 
                      className="p-6 rounded-xl cursor-pointer"
                      style={{
                        background: subseccionExpandida === 'resumenes-incompletos' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                      }}
                      onClick={() => toggleSubseccion('resumenes-incompletos')}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                          <Info className="h-5 w-5" />
                          Resúmenes no muestran todos los registros
                        </h3>
                        {subseccionExpandida === 'resumenes-incompletos' ? (
                          <ChevronDown className="h-5 w-5 text-purple-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      {subseccionExpandida === 'resumenes-incompletos' && (
                        <div className="mt-4 space-y-3">
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(0, 0, 0, 0.2)',
                            }}
                          >
                            <h4 className="font-semibold text-white mb-2">🔍 Causa:</h4>
                            <p className="text-sm text-gray-300">Puede haber filtros activos o problemas en la consulta</p>
                          </div>
                          <div 
                            className="p-4 rounded-lg"
                            style={{
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                            }}
                          >
                            <h4 className="font-semibold text-green-400 mb-2">✅ Solución:</h4>
                            <ul className="text-sm text-gray-300 space-y-1">
                              <li>1. Verificar que no haya filtros activos en la pestaña Excel</li>
                              <li>2. El sistema procesa TODOS los registros sin límite</li>
                              <li>3. Revisar la consola del navegador (F12) para ver logs</li>
                              <li>4. Verificar que el mes y año seleccionados sean correctos</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


