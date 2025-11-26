'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Medico } from '@/lib/types'
import { importMedicosFromExcel, exportMedicosToExcel } from '@/lib/medicos-excel'
import { UploadExcel } from '@/components/custom/UploadExcel'
import { MedicoFormModal } from '@/components/custom/MedicoFormModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Sparkles
} from 'lucide-react'
import Link from 'next/link'

export default function MedicosPage() {
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEspecialidad, setFilterEspecialidad] = useState<string>('all')
  const [filterActivo, setFilterActivo] = useState<string>('all')
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

  const handleImport = async (file: File) => {
    setIsImporting(true)
    setImportResult(null)

    try {
      const resultado = await importMedicosFromExcel(file)
      
      // Verificar duplicados por matrícula o CUIT
      const { data: existingMedicos } = await supabase
        .from('medicos')
        .select('matricula, cuit') as any

      const existingMatriculas = new Set((existingMedicos as any)?.map((m: any) => m.matricula) || [])
      const existingCuits = new Set((existingMedicos as any)?.map((m: any) => m.cuit).filter(Boolean) || [])

      const medicosToInsert: Medico[] = []
      let duplicados = 0

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

      // Insertar médicos nuevos
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

  const filteredMedicos = medicos.filter(medico => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      medico.nombre.toLowerCase().includes(search) ||
      medico.matricula?.toLowerCase().includes(search) ||
      medico.matricula_provincial?.toLowerCase().includes(search) ||
      medico.cuit?.toLowerCase().includes(search) ||
      medico.especialidad.toLowerCase().includes(search)
    )
  })

  const especialidades = Array.from(new Set(medicos.map(m => m.especialidad))).sort()

  return (
    <div className="min-h-screen relative p-8 pb-20 overflow-hidden">
      {/* Efectos de luz verde */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-green-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header */}
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
                    Administración de Médicos
                  </span>
                </h1>
                <p className="text-gray-400 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-400" />
                  Gestión de prestadores para Pediatría y Ginecología
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de acciones */}
        <div 
          className="p-6 rounded-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.2)',
          }}
        >
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Búsqueda y filtros */}
            <div className="flex flex-1 gap-4 items-center w-full md:w-auto">
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, matrícula, CUIT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-black/30 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <select
                value={filterEspecialidad}
                onChange={(e) => setFilterEspecialidad(e.target.value)}
                className="px-4 py-2 rounded-lg bg-black/30 border border-gray-600 text-white text-sm"
              >
                <option value="all">Todas las especialidades</option>
                {especialidades.map(esp => (
                  <option key={esp} value={esp}>{esp}</option>
                ))}
              </select>
              <select
                value={filterActivo}
                onChange={(e) => setFilterActivo(e.target.value)}
                className="px-4 py-2 rounded-lg bg-black/30 border border-gray-600 text-white text-sm"
              >
                <option value="all">Todos</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowFormModal(true)}
                className="bg-green-600 hover:bg-green-500 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Médico
              </Button>
              <Button
                onClick={() => setShowImportModal(true)}
                variant="outline"
                className="border-green-500 text-green-400 hover:bg-green-500/20"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar Excel
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                className="border-green-500 text-green-400 hover:bg-green-500/20"
                disabled={medicos.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
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
              <table className="w-full border-collapse text-sm">
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
                      <td className="px-4 py-3 text-gray-300">{medico.nombre}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {medico.matricula_provincial || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {medico.cuit || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{medico.especialidad}</td>
                      <td className="px-4 py-3 text-gray-400">{medico.grupo_persona || '-'}</td>
                      <td className="px-4 py-3 text-gray-400">{medico.perfil || '-'}</td>
                      <td className="px-4 py-3">
                        {medico.es_residente ? (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                            Sí
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActivo(medico)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            medico.activo
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

