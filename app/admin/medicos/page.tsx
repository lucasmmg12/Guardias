'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Medico } from '@/lib/types'
import { importMedicosFromExcel, exportMedicosToExcel } from '@/lib/medicos-excel'
import { UploadExcel } from '@/components/custom/UploadExcel'
import { MedicoFormModal } from '@/components/custom/MedicoFormModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Plus,
  Download,
  Upload,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Users,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function MedicosPage() {
  const router = useRouter()
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEspecialidad, setFilterEspecialidad] = useState<string>('all')
  const [filterActivo, setFilterActivo] = useState<string>('all')
  const [filterResidente, setFilterResidente] = useState<boolean>(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingMedico, setEditingMedico] = useState<Medico | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    loadMedicos()
  }, [])

  async function loadMedicos() {
    try {
      setLoading(true)
      let query = supabase
        .from('medicos')
        .select('*')
        .order('nombre', { ascending: true })

      // Aplicar filtros
      if (filterEspecialidad !== 'all') {
        query = query.eq('especialidad', filterEspecialidad)
      }
      if (filterActivo !== 'all') {
        query = query.eq('activo', filterActivo === 'activo')
      }

      const { data, error } = await query

      if (error) throw error
      setMedicos(data || [])
    } catch (error) {
      console.error('Error loading médicos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMedicos()
  }, [filterEspecialidad, filterActivo])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este médico?')) return

    try {
      const { error } = await supabase
        .from('medicos')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadMedicos()
    } catch (error) {
      console.error('Error deleting médico:', error)
      alert('Error al eliminar el médico')
    }
  }

  const handleToggleActivo = async (medico: Medico) => {
    try {
      const { error } = await supabase
        .from('medicos')
        // @ts-ignore - Los tipos de Supabase no reconocen los nuevos campos aún
        .update({ activo: !medico.activo })
        .eq('id', medico.id)

      if (error) throw error
      loadMedicos()
    } catch (error) {
      console.error('Error updating médico:', error)
      alert('Error al actualizar el médico')
    }
  }

  const handleToggleResidente_DB = async (medico: Medico) => {
    try {
      const { error } = await supabase
        .from('medicos')
        // @ts-ignore - Los tipos de Supabase no reconocen los nuevos campos aún
        .update({ es_residente: !medico.es_residente })
        .eq('id', medico.id)

      if (error) throw error
      loadMedicos()
    } catch (error) {
      console.error('Error updating médico:', error)
      alert('Error al actualizar el médico')
    }
  }

  const handleImport = async (file: File) => {
    // Actualizar estado inmediatamente para feedback visual
    setIsImporting(true)
    setImportResult(null)

    try {
      // Procesar Excel (esta es la operación más pesada)
      const resultado = await importMedicosFromExcel(file)

      // Verificar duplicados por matrícula o CUIT
      const { data: existingMedicos } = await supabase
        .from('medicos')
        .select('matricula, cuit') as any

      const existingMatriculas = new Set((existingMedicos as any)?.map((m: any) => m.matricula) || [])
      const existingCuits = new Set((existingMedicos as any)?.map((m: any) => m.cuit).filter(Boolean) || [])

      const medicosToInsert: Medico[] = []
      let duplicados = 0

      // Procesar duplicados de forma eficiente
      for (const medico of resultado.medicos) {
        const isDuplicate =
          existingMatriculas.has(medico.matricula) ||
          (medico.cuit && existingCuits.has(medico.cuit))

        if (isDuplicate) {
          duplicados++
        } else {
          medicosToInsert.push(medico as any)
          if (medico.matricula) existingMatriculas.add(medico.matricula)
          if (medico.cuit) existingCuits.add(medico.cuit)
        }
      }

      // Insertar médicos nuevos en batch
      if (medicosToInsert.length > 0) {
        const { error } = await supabase
          .from('medicos')
          .insert(medicosToInsert as any)

        if (error) throw error
      }

      setImportResult({
        total: resultado.medicos.length,
        insertados: medicosToInsert.length,
        duplicados: duplicados + resultado.duplicados,
        errores: resultado.errores
      })

      // Recargar médicos después de la inserción
      loadMedicos()
    } catch (error: any) {
      setImportResult({
        error: error.message || 'Error al importar médicos'
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleExport = () => {
    const blob = exportMedicosToExcel(medicos)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `medicos_${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Memoizar el filtrado de médicos para evitar recálculos innecesarios
  const filteredMedicos = useMemo(() => {
    return medicos.filter(medico => {
      // Filtro de residentes (aplicado primero para mejor rendimiento)
      if (filterResidente && !medico.es_residente) {
        return false
      }

      // Filtro de búsqueda
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch = (
          medico.nombre.toLowerCase().includes(search) ||
          medico.matricula?.toLowerCase().includes(search) ||
          medico.matricula_provincial?.toLowerCase().includes(search) ||
          medico.cuit?.toLowerCase().includes(search) ||
          medico.especialidad.toLowerCase().includes(search)
        )
        if (!matchesSearch) return false
      }

      return true
    })
  }, [medicos, filterResidente, searchTerm])

  // Memoizar especialidades para evitar recálculos
  const especialidades = useMemo(() => {
    return Array.from(new Set(medicos.map(m => m.especialidad))).sort()
  }, [medicos])

  // Memoizar el handler del toggle de residentes
  const handleToggleResidente = useCallback(() => {
    setFilterResidente(prev => !prev)
  }, [])

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Fondo con auroras de servidor GrowLabs */}
      <div className="fixed inset-0 z-0 text-white">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Header Premium */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 animate-in slide-in-from-top-4 duration-700">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[#00FF88] text-xs font-bold tracking-widest uppercase">
              <Users className="h-3 w-3" />
              Staff Intelligence
            </div>
            <h1 className="text-6xl font-black tracking-tighter leading-none">
              GESTIÓN DE<br />
              <span className="text-[#00FF88] italic">MÉDICOS</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-md font-medium leading-relaxed">
              Administración centralizada de prestadores y perfiles profesionales por especialidad.
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
              onClick={() => setShowFormModal(true)}
              className="flex items-center gap-3 px-8 py-4 rounded-full bg-[#00FF88] text-black font-black text-sm tracking-tighter hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,255,136,0.3)]"
            >
              <Plus className="h-5 w-5" />
              AGREGAR MÉDICO
            </button>
          </div>
        </div>

        {/* Barra de acciones Ultra-Dark */}
        <div
          className="p-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-12 animate-in fade-in slide-in-from-bottom-2 duration-1000"
        >
          <div className="flex flex-col md:flex-row gap-2 items-center">
            <div className="relative flex-1 px-4">
              <Search className="absolute left-8 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="BUSCAR PRESTADOR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none text-white placeholder-gray-500 h-12 pl-12 focus:outline-none font-bold text-sm tracking-tight"
              />
            </div>

            <div className="flex gap-2 pr-1.5">
              <select
                value={filterEspecialidad}
                onChange={(e) => setFilterEspecialidad(e.target.value)}
                className="bg-white/5 border border-white/10 text-white text-xs font-bold rounded-full px-6 h-11 focus:outline-none focus:border-[#00FF88]/50 appearance-none cursor-pointer"
              >
                <option value="all" className="bg-black">ESPECIALIDAD: TODAS</option>
                {especialidades.map(esp => (
                  <option key={esp} value={esp} className="bg-black uppercase">{esp}</option>
                ))}
              </select>

              <button
                onClick={handleToggleResidente}
                className={cn(
                  "px-8 py-3 rounded-full font-black text-xs tracking-tighter transition-all flex items-center gap-2",
                  filterResidente
                    ? "bg-[#00D1FF] text-black shadow-[0_0_20px_rgba(0,209,255,0.3)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {filterResidente ? 'SOLO RESIDENTES' : 'TODOS LOS PERFILES'}
              </button>

              <button
                onClick={() => setShowImportModal(true)}
                className="p-3 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-[#00FF88] hover:border-[#00FF88]/50 transition-all"
                title="Importar Excel"
              >
                <Upload className="h-5 w-5" />
              </button>

              <button
                onClick={handleExport}
                className="p-3 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-[#00FF88] hover:border-[#00FF88]/50 transition-all"
                title="Exportar Excel"
                disabled={medicos.length === 0}
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de médicos */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              Cargando médicos...
            </div>
          ) : filteredMedicos.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              No se encontraron médicos
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm table-fixed">
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[20%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[6%]" />
                  <col className="w-[7%]" />
                  <col className="w-[7%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Mat. Provinc</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">CUIT</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Especialidad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Grupo Persona</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Perfil</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Residente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMedicos.map((medico) => (
                    <tr
                      key={medico.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-300 break-words">{medico.nombre}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs break-words">
                        {medico.matricula_provincial || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs break-words">
                        {medico.cuit || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-300 break-words" style={{ wordBreak: 'break-word', maxWidth: '200px' }}>
                        {medico.especialidad}
                      </td>
                      <td className="px-4 py-3 text-gray-400 break-words">{medico.grupo_persona || '-'}</td>
                      <td className="px-4 py-3 text-gray-400 break-words">{medico.perfil || '-'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleResidente_DB(medico)}
                          className={`px-2 py-1 text-xs rounded transition-colors whitespace-nowrap ${medico.es_residente
                            ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                            : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                            }`}
                        >
                          {medico.es_residente ? 'Sí' : 'No'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActivo(medico)}
                          className={`px-2 py-1 text-xs rounded transition-colors whitespace-nowrap ${medico.activo
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            }`}
                        >
                          {medico.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingMedico(medico)
                              setShowFormModal(true)
                            }}
                            className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(medico.id)}
                            className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="text-sm text-gray-400">
          Total de médicos: <span className="text-green-400 font-semibold">{filteredMedicos.length}</span>
          {' • '}
          Activos: <span className="text-green-400 font-semibold">
            {filteredMedicos.filter(m => m.activo).length}
          </span>
          {filterResidente && (
            <>
              {' • '}
              Residentes: <span className="text-blue-400 font-semibold">
                {filteredMedicos.filter(m => m.es_residente).length}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Modal de formulario */}
      {showFormModal && (
        <MedicoFormModal
          medico={editingMedico}
          onClose={() => {
            setShowFormModal(false)
            setEditingMedico(null)
          }}
          onSave={() => {
            loadMedicos()
            setShowFormModal(false)
            setEditingMedico(null)
          }}
        />
      )}

      {/* Modal de importación */}
      {showImportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => !isImporting && setShowImportModal(false)}
        >
          <div
            className="relative rounded-2xl p-8 max-w-2xl w-full"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-green-400 mb-6">
              Importar Médicos desde Excel
            </h2>

            <UploadExcel onUpload={handleImport} isProcessing={isImporting} />

            {importResult && (
              <div className="mt-6">
                {importResult.error ? (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold">Error de Importación</h3>
                      <p className="text-sm opacity-90">{importResult.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                      <h3 className="text-lg font-semibold text-green-400">
                        Importación Completada
                      </h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-black/20 p-3 rounded-lg">
                        <div className="text-sm text-gray-400">Total</div>
                        <div className="text-2xl font-bold text-white">{importResult.total}</div>
                      </div>
                      <div className="bg-black/20 p-3 rounded-lg">
                        <div className="text-sm text-gray-400">Insertados</div>
                        <div className="text-2xl font-bold text-green-400">{importResult.insertados}</div>
                      </div>
                      <div className="bg-black/20 p-3 rounded-lg">
                        <div className="text-sm text-gray-400">Duplicados</div>
                        <div className="text-2xl font-bold text-yellow-400">{importResult.duplicados}</div>
                      </div>
                    </div>
                    {importResult.errores && importResult.errores.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-red-400 mb-2">Errores:</h4>
                        <ul className="text-sm text-red-300/80 space-y-1 max-h-32 overflow-y-auto bg-black/20 p-2 rounded">
                          {importResult.errores.map((err: string, i: number) => (
                            <li key={i}>• {err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => {
                  setShowImportModal(false)
                  setImportResult(null)
                }}
                variant="outline"
                className="border-gray-600 text-gray-300"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

