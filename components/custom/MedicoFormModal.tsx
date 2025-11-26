'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Medico, MedicoInsert } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

interface MedicoFormModalProps {
  medico: Medico | null
  onClose: () => void
  onSave: () => void
}

export function MedicoFormModal({ medico, onClose, onSave }: MedicoFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<MedicoInsert>({
    nombre: '',
    matricula: '',
    matricula_provincial: '',
    cuit: '',
    grupo_persona: '',
    perfil: '',
    es_residente: false,
    especialidad: 'Pediatría',
    activo: true
  })

  useEffect(() => {
    if (medico) {
      setFormData({
        nombre: medico.nombre,
        matricula: medico.matricula,
        matricula_provincial: medico.matricula_provincial || '',
        cuit: medico.cuit || '',
        grupo_persona: medico.grupo_persona || '',
        perfil: medico.perfil || '',
        es_residente: medico.es_residente,
        especialidad: medico.especialidad,
        activo: medico.activo
      })
    } else {
      setFormData({
        nombre: '',
        matricula: '',
        matricula_provincial: '',
        cuit: '',
        grupo_persona: '',
        perfil: '',
        es_residente: false,
        especialidad: 'Pediatría',
        activo: true
      })
    }
  }, [medico])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validaciones
      if (!formData.nombre.trim()) {
        alert('El nombre es requerido')
        return
      }

      if (!formData.matricula.trim() && !formData.matricula_provincial?.trim() && !formData.cuit?.trim()) {
        alert('Debe proporcionar al menos una matrícula o CUIT')
        return
      }

      // Si no hay matrícula, usar matrícula provincial o CUIT
      if (!formData.matricula.trim()) {
        formData.matricula = formData.matricula_provincial?.trim() || formData.cuit?.trim() || `TEMP-${Date.now()}`
      }

      // Determinar si es residente basado en el perfil
      if (formData.perfil) {
        const perfilLower = formData.perfil.toLowerCase()
        formData.es_residente = perfilLower.includes('residente') || perfilLower.includes('resident')
      }

      if (medico) {
        // Actualizar
        const updateData = {
          nombre: formData.nombre.trim(),
          matricula: formData.matricula.trim(),
          matricula_provincial: formData.matricula_provincial?.trim() || null,
          cuit: formData.cuit?.trim() || null,
          grupo_persona: formData.grupo_persona?.trim() || null,
          perfil: formData.perfil?.trim() || null,
          es_residente: formData.es_residente,
          especialidad: formData.especialidad,
          activo: formData.activo
        }
        const { error } = await supabase
          .from('medicos')
          // @ts-ignore - Los tipos de Supabase no reconocen los nuevos campos aún
          .update(updateData)
          .eq('id', medico.id)

        if (error) throw error
      } else {
        // Crear
        const { error } = await supabase
          .from('medicos')
          // @ts-ignore - Los tipos de Supabase no reconocen los nuevos campos aún
          .insert([formData])

        if (error) throw error
      }

      onSave()
    } catch (error: any) {
      console.error('Error saving médico:', error)
      alert(error.message || 'Error al guardar el médico')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.8)' }}
      onClick={onClose}
    >
      <div 
        className="relative rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-green-400">
            {medico ? 'Editar Médico' : 'Agregar Médico'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-green-300 mb-2">
              Nombre Completo *
            </label>
            <Input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              className="bg-black/30 border-gray-600 text-white"
              placeholder="Ej: GONZALEZ, JUAN CARLOS"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-green-300 mb-2">
                Matrícula Provincial
              </label>
              <Input
                type="text"
                value={formData.matricula_provincial || ''}
                onChange={(e) => setFormData({ ...formData, matricula_provincial: e.target.value })}
                className="bg-black/30 border-gray-600 text-white"
                placeholder="Ej: 3540"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-green-300 mb-2">
                CUIT
              </label>
              <Input
                type="text"
                value={formData.cuit || ''}
                onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                className="bg-black/30 border-gray-600 text-white"
                placeholder="Ej: 20259398909"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-green-300 mb-2">
              Matrícula (si no tiene provincial, usar CUIT) *
            </label>
            <Input
              type="text"
              value={formData.matricula}
              onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
              required
              className="bg-black/30 border-gray-600 text-white"
              placeholder="Se usará matrícula provincial o CUIT si está vacío"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-green-300 mb-2">
                Especialidad *
              </label>
              <select
                value={formData.especialidad}
                onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                required
                className="w-full px-4 py-2 rounded-lg bg-black/30 border border-gray-600 text-white"
              >
                <option value="Pediatría">Pediatría</option>
                <option value="Ginecología">Ginecología</option>
                <option value="Obstetricia">Obstetricia</option>
                <option value="Cirugía">Cirugía</option>
                <option value="Clínica">Clínica</option>
                <option value="ECOGRAFISTA">ECOGRAFISTA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-green-300 mb-2">
                Grupo Persona
              </label>
              <Input
                type="text"
                value={formData.grupo_persona || ''}
                onChange={(e) => setFormData({ ...formData, grupo_persona: e.target.value })}
                className="bg-black/30 border-gray-600 text-white"
                placeholder="Ej: Médico"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-green-300 mb-2">
                Perfil
              </label>
              <Input
                type="text"
                value={formData.perfil || ''}
                onChange={(e) => {
                  const perfil = e.target.value
                  setFormData({ 
                    ...formData, 
                    perfil,
                    es_residente: perfil.toLowerCase().includes('residente') || 
                                 perfil.toLowerCase().includes('resident')
                  })
                }}
                className="bg-black/30 border-gray-600 text-white"
                placeholder="Ej: DOCTOR, RESIDENTE"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-green-300 mb-2">
                Estado
              </label>
              <select
                value={formData.activo ? 'activo' : 'inactivo'}
                onChange={(e) => setFormData({ ...formData, activo: e.target.value === 'activo' })}
                className="w-full px-4 py-2 rounded-lg bg-black/30 border border-gray-600 text-white"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.es_residente}
                onChange={(e) => setFormData({ ...formData, es_residente: e.target.checked })}
                className="w-4 h-4 rounded bg-black/30 border-gray-600 text-green-500"
              />
              <span className="text-sm font-semibold text-green-300">
                Es Residente (aplica horario formativo)
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              {loading ? 'Guardando...' : medico ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

