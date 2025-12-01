'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { ExcelRow, ExcelData } from '@/lib/excel-reader'
import { InlineEditCell } from './InlineEditCell'
import { ExpandableSection } from './ExpandableSection'
import { CheckCircle2, AlertCircle, Trash2, Clock, UserX, Database } from 'lucide-react'
import { esParticular, tieneHorario, obtenerIndicesDuplicados, esResidenteHorarioFormativo } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { Medico } from '@/lib/types'

interface ExcelDataTableProps {
  data: ExcelData
  especialidad?: 'Pediatría' | 'Ginecología'
  onCellUpdate?: (rowIndex: number, column: string, newValue: any) => Promise<void>
  mes?: number
  anio?: number
}

export function ExcelDataTable({ data, especialidad, onCellUpdate, mes, anio }: ExcelDataTableProps) {
  const [rows, setRows] = useState<ExcelRow[]>(data.rows)
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({})
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [medicosLoading, setMedicosLoading] = useState(false)

  // Cargar médicos una sola vez cuando se monta el componente
  useEffect(() => {
    if (!especialidad) {
      setMedicos([])
      setMedicosLoading(false)
      return
    }

    async function loadMedicos() {
      try {
        setMedicosLoading(true)
        // Guardar especialidad en variable local para TypeScript
        const especialidadValue = especialidad
        if (!especialidadValue) return

        const { data: medicosData, error } = await supabase
          .from('medicos')
          .select('*')
          .eq('especialidad', especialidadValue)
          .eq('activo', true)

        if (error) throw error
        setMedicos(medicosData || [])
      } catch (error) {
        console.error('Error loading médicos:', error)
      } finally {
        setMedicosLoading(false)
      }
    }

    loadMedicos()
  }, [especialidad])

  // Crear mapa optimizado de médicos por nombre (búsqueda rápida)
  const mapaMedicos = useMemo(() => {
    const mapa = new Map<string, Medico>()
    medicos.forEach(medico => {
      // Normalizar nombre para búsqueda (sin acentos, minúsculas)
      const nombreNormalizado = medico.nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
      mapa.set(nombreNormalizado, medico)
      
      // También agregar variaciones del nombre (solo apellido, etc.)
      const partes = medico.nombre.split(',').map(p => p.trim())
      if (partes.length > 0) {
        const apellidoNormalizado = partes[0]
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
        if (apellidoNormalizado && !mapa.has(apellidoNormalizado)) {
          mapa.set(apellidoNormalizado, medico)
        }
      }
    })
    return mapa
  }, [medicos])

  // Función optimizada para buscar médico por nombre
  const buscarMedico = useCallback((nombre: string | null | undefined): Medico | null => {
    if (!nombre || typeof nombre !== 'string') return null
    
    const nombreNormalizado = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
    
    // Buscar coincidencia exacta
    if (mapaMedicos.has(nombreNormalizado)) {
      return mapaMedicos.get(nombreNormalizado) || null
    }
    
    // Buscar coincidencia parcial (el nombre contiene el apellido del médico)
    for (const [key, medico] of mapaMedicos.entries()) {
      if (nombreNormalizado.includes(key) || key.includes(nombreNormalizado)) {
        return medico
      }
    }
    
    return null
  }, [mapaMedicos])

  const handleCellSave = async (rowIndex: number, column: string, newValue: any) => {
    const key = `${rowIndex}-${column}`
    setSaving(prev => ({ ...prev, [key]: true }))

    try {
      // Actualizar el estado local
      const updatedRows = [...rows]
      updatedRows[rowIndex] = {
        ...updatedRows[rowIndex],
        [column]: newValue
      }
      setRows(updatedRows)

      // Si hay un callback, llamarlo
      if (onCellUpdate) {
        await onCellUpdate(rowIndex, column, newValue)
      }
    } catch (error) {
      console.error('Error al guardar celda:', error)
      // Revertir el cambio en caso de error
      setRows(data.rows)
      throw error
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }))
    }
  }

  const isEditable = (column: string): boolean => {
    const columnLower = column.toLowerCase().trim()
    return columnLower === 'cliente' || columnLower === 'responsable'
  }

  // Detectar filas con PARTICULARES (sin obra social)
  const filasParticulares = useMemo(() => {
    const indices: Set<number> = new Set()
    const clienteIndex = data.headers.findIndex(h => h.toLowerCase().trim() === 'cliente')
    
    if (clienteIndex === -1) return indices
    
    rows.forEach((row, index) => {
      const cliente = row[data.headers[clienteIndex]]
      if (esParticular(cliente)) {
        indices.add(index)
      }
    })
    
    return indices
  }, [rows, data.headers])

  // Detectar filas sin horario de inicio
  const filasSinHorario = useMemo(() => {
    const indices: Set<number> = new Set()
    
    rows.forEach((row, index) => {
      if (!tieneHorario(row, data.headers)) {
        indices.add(index)
      }
    })
    
    return indices
  }, [rows, data.headers])

  // Detectar filas duplicadas
  const filasDuplicadas = useMemo(() => {
    return obtenerIndicesDuplicados(rows, data.headers)
  }, [rows, data.headers])

  // Detectar filas con residentes en horario formativo (optimizado)
  const filasResidenteHorarioFormativo = useMemo(() => {
    const indices: Set<number> = new Set()
    
    // Si no hay especialidad o no hay médicos cargados, retornar vacío
    if (!especialidad || medicos.length === 0 || medicosLoading) {
      return indices
    }

    // Buscar índices de columnas relevantes una sola vez
    const responsableIndex = data.headers.findIndex(h => {
      const hLower = h.toLowerCase().trim()
      return hLower === 'responsable' || hLower.includes('responsable') || hLower.includes('medico')
    })
    const fechaIndex = data.headers.findIndex(h => {
      const hLower = h.toLowerCase().trim()
      return hLower === 'fecha' || hLower.includes('fecha') || hLower.includes('fecha visita')
    })
    const horaIndex = data.headers.findIndex(h => {
      const hLower = h.toLowerCase().trim()
      return hLower.includes('hora') || hLower.includes('horario') || hLower.includes('inicio')
    })

    // Si no encontramos las columnas necesarias, retornar vacío
    if (responsableIndex === -1 || fechaIndex === -1 || horaIndex === -1) {
      return indices
    }

    // Procesar filas
    rows.forEach((row, index) => {
      const responsable = row[data.headers[responsableIndex]]
      const fecha = row[data.headers[fechaIndex]]
      const hora = row[data.headers[horaIndex]]

      // Buscar médico
      const medico = buscarMedico(responsable)
      if (!medico || !medico.es_residente) {
        return // No es residente, continuar
      }

      // Verificar si está en horario formativo
      if (esResidenteHorarioFormativo(fecha, hora, medico.es_residente)) {
        indices.add(index)
      }
    })

    return indices
  }, [rows, data.headers, especialidad, medicos, medicosLoading, buscarMedico])

  // Contar problemas
  const cantidadParticulares = filasParticulares.size
  const cantidadSinHorario = filasSinHorario.size
  const cantidadDuplicados = filasDuplicadas.size
  const cantidadResidenteHorarioFormativo = filasResidenteHorarioFormativo.size

  // Función para eliminar una fila
  const handleDeleteRow = useCallback((rowIndex: number) => {
    if (!confirm('¿Está seguro de que desea eliminar esta fila?')) {
      return
    }
    
    const updatedRows = rows.filter((_, index) => index !== rowIndex)
    setRows(updatedRows)
    // Actualizar data.rows también
    data.rows = updatedRows
  }, [rows, data])

  // Funciones para eliminar múltiples filas
  const handleDeleteRows = useCallback((indices: Set<number>) => {
    const updatedRows = rows.filter((_, index) => !indices.has(index))
    setRows(updatedRows)
    data.rows = updatedRows
  }, [rows, data])

  // Obtener filas filtradas por tipo
  const filasParticularesList = useMemo(() => {
    return rows.filter((row, index) => filasParticulares.has(index))
  }, [rows, filasParticulares])

  const filasSinHorarioList = useMemo(() => {
    return rows.filter((row, index) => filasSinHorario.has(index))
  }, [rows, filasSinHorario])

  const filasDuplicadasList = useMemo(() => {
    return rows.filter((row, index) => filasDuplicadas.has(index))
  }, [rows, filasDuplicadas])

  const filasResidenteFormativoList = useMemo(() => {
    return rows.filter((row, index) => filasResidenteHorarioFormativo.has(index))
  }, [rows, filasResidenteHorarioFormativo])

  return (
    <div className="w-full space-y-4">
      {/* Información del período */}
      {data.periodo && (
        <div 
          className="p-4 rounded-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}
        >
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">Período analizado:</span>
            <span className="text-white">
              {data.periodo.desde} - {data.periodo.hasta}
            </span>
          </div>
        </div>
      )}

      {/* Sección expandible: Registros sin obra social */}
      <ExpandableSection
        title={`⚠️ ${cantidadParticulares} registro${cantidadParticulares > 1 ? 's' : ''} sin obra social detectado${cantidadParticulares > 1 ? 's' : ''}`}
        count={cantidadParticulares}
        description='Estos registros deben ser revisados. Si son pacientes particulares, edite la columna "Cliente" y agregue: "042 - PARTICULARES"'
        icon={<AlertCircle className="h-6 w-6 flex-shrink-0" />}
        bgColor="rgba(251, 191, 36, 0.15)"
        borderColor="rgba(251, 191, 36, 0.5)"
        textColor="#fbbf24"
        rows={filasParticularesList}
        data={data}
        onCellUpdate={onCellUpdate}
        allowEdit={true}
        mes={mes}
        anio={anio}
        sectionKey="sin_obra_social"
      />

      {/* Sección expandible: Registros sin horario */}
      <ExpandableSection
        title={`⚠️ ${cantidadSinHorario} registro${cantidadSinHorario > 1 ? 's' : ''} sin horario de inicio detectado${cantidadSinHorario > 1 ? 's' : ''}`}
        count={cantidadSinHorario}
        description="Estos registros indican que el paciente no se atendió. Deben ser eliminados."
        icon={<Clock className="h-6 w-6 flex-shrink-0" />}
        bgColor="rgba(239, 68, 68, 0.15)"
        borderColor="rgba(239, 68, 68, 0.5)"
        textColor="#ef4444"
        rows={filasSinHorarioList}
        data={data}
        onDeleteRow={handleDeleteRow}
        onDeleteAll={() => {
          handleDeleteRows(filasSinHorario)
        }}
        allowDelete={true}
        mes={mes}
        anio={anio}
        sectionKey="sin_horario"
      />

      {/* Sección expandible: Registros duplicados */}
      <ExpandableSection
        title={`⚠️ ${cantidadDuplicados} registro${cantidadDuplicados > 1 ? 's' : ''} duplicado${cantidadDuplicados > 1 ? 's' : ''} detectado${cantidadDuplicados > 1 ? 's' : ''}`}
        count={cantidadDuplicados}
        description="Se detectaron filas completamente iguales (misma fecha, misma hora, mismo todo). Revise y elimine los duplicados si es necesario."
        icon={<AlertCircle className="h-6 w-6 flex-shrink-0" />}
        bgColor="rgba(168, 85, 247, 0.15)"
        borderColor="rgba(168, 85, 247, 0.5)"
        textColor="#a855f7"
        rows={filasDuplicadasList}
        data={data}
        onDeleteRow={handleDeleteRow}
        onDeleteAll={() => {
          handleDeleteRows(filasDuplicadas)
        }}
        allowDelete={true}
        mes={mes}
        anio={anio}
        sectionKey="duplicados"
      />

      {/* Sección expandible: Residentes en horario formativo */}
      <ExpandableSection
        title={`ℹ️ ${cantidadResidenteHorarioFormativo} consulta${cantidadResidenteHorarioFormativo > 1 ? 's' : ''} de residente${cantidadResidenteHorarioFormativo > 1 ? 's' : ''} en horario formativo detectada${cantidadResidenteHorarioFormativo > 1 ? 's' : ''}`}
        count={cantidadResidenteHorarioFormativo}
        description="Estas consultas son de residentes realizadas entre lunes a sábado de 07:00 a 15:00. NO se deben pagar según las reglas del sistema."
        icon={<UserX className="h-6 w-6 flex-shrink-0" />}
        bgColor="rgba(59, 130, 246, 0.15)"
        borderColor="rgba(59, 130, 246, 0.5)"
        textColor="#3b82f6"
        rows={filasResidenteFormativoList}
        data={data}
        onDeleteRow={handleDeleteRow}
        onDeleteAll={() => {
          handleDeleteRows(filasResidenteHorarioFormativo)
        }}
        allowDelete={true}
        mes={mes}
        anio={anio}
        sectionKey="residente_formativo"
      />

      {/* 5to recuadro: Detalle completo */}
      <ExpandableSection
        title={`📊 Ver detalle completo (${rows.length} registros)`}
        count={rows.length}
        description="Muestra todos los registros del Excel para revisión completa."
        icon={<Database className="h-6 w-6 flex-shrink-0" />}
        bgColor="rgba(34, 197, 94, 0.15)"
        borderColor="rgba(34, 197, 94, 0.5)"
        textColor="#22c55e"
        rows={rows}
        data={data}
        onCellUpdate={onCellUpdate}
        onDeleteRow={handleDeleteRow}
        allowEdit={true}
        allowDelete={true}
        mes={mes}
        anio={anio}
        sectionKey="detalle_completo"
      />

      {/* Tabla de datos */}
      <div className="overflow-x-auto rounded-xl" style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10">
              {data.headers.map((header, index) => (
                <th
                  key={index}
                  className="px-2 py-2 text-left text-xs font-semibold text-gray-300 bg-white/5 whitespace-nowrap"
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    minWidth: '120px',
                    maxWidth: '200px',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{header}</span>
                    {isEditable(header) && (
                      <span className="text-[10px] text-green-400 bg-green-400/20 px-1.5 py-0.5 rounded flex-shrink-0">
                        Editable
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {/* Columna de acciones */}
              <th
                className="px-2 py-2 text-left text-xs font-semibold text-gray-300 bg-white/5 whitespace-nowrap sticky right-0"
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 11,
                  minWidth: '60px',
                  maxWidth: '60px',
                }}
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={data.headers.length + 1} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No hay datos para mostrar
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => {
                const esParticularRow = filasParticulares.has(rowIndex)
                const esSinHorario = filasSinHorario.has(rowIndex)
                const esDuplicado = filasDuplicadas.has(rowIndex)
                const esResidenteFormativo = filasResidenteHorarioFormativo.has(rowIndex)
                
                // Determinar el estilo de la fila según la prioridad de problemas
                // Prioridad: Sin horario > Duplicado > Residente formativo > Particular
                let filaClassName = 'border-b transition-colors border-white/5 hover:bg-white/5'
                if (esSinHorario) {
                  filaClassName = 'bg-red-500/20 border-red-500/30 hover:bg-red-500/30 border-b'
                } else if (esDuplicado) {
                  filaClassName = 'bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30 border-b'
                } else if (esResidenteFormativo) {
                  filaClassName = 'bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30 border-b'
                } else if (esParticularRow) {
                  filaClassName = 'bg-yellow-500/20 border-yellow-500/30 hover:bg-yellow-500/30 border-b'
                }
                
                return (
                <tr
                  key={rowIndex}
                  className={filaClassName}
                >
                  {data.headers.map((header, colIndex) => {
                    const value = row[header] ?? null
                    const editable = isEditable(header)
                    const savingKey = `${rowIndex}-${header}`
                    const isSaving = saving[savingKey] || false

                    return (
                      <td
                        key={colIndex}
                        className="px-2 py-1.5 text-xs text-gray-300"
                        style={{
                          minWidth: '120px',
                          maxWidth: '200px',
                        }}
                      >
                        {editable ? (
                          <div className="relative">
                            <InlineEditCell
                              value={value}
                              type="text"
                              onSave={async (newValue) => {
                                await handleCellSave(rowIndex, header, newValue)
                              }}
                              isEditable={true}
                              className={isSaving ? 'opacity-50' : ''}
                              columnName={header}
                            />
                            {esParticularRow && header.toLowerCase().trim() === 'cliente' && (
                              <div className="absolute -top-1 -right-1">
                                <AlertCircle className="h-3 w-3 text-yellow-400" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="px-1 py-0.5 truncate" title={value ? String(value) : ''}>
                            {value === null || value === '' ? (
                              <span className="text-gray-500 italic text-[10px]">-</span>
                            ) : (
                              <span className="truncate block">{String(value)}</span>
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}
                  {/* Columna de acciones */}
                  <td
                    className={`px-2 py-1.5 sticky right-0 ${
                      esSinHorario 
                        ? 'bg-red-500/20' 
                        : esDuplicado 
                        ? 'bg-purple-500/20' 
                        : esResidenteFormativo
                        ? 'bg-blue-500/20'
                        : esParticularRow
                        ? 'bg-yellow-500/20'
                        : 'bg-white/5'
                    }`}
                    style={{
                      minWidth: '60px',
                      maxWidth: '60px',
                      zIndex: 1,
                    }}
                  >
                    <div className="flex items-center justify-center gap-1 relative">
                      {(esSinHorario || esDuplicado) && (
                        <button
                          onClick={() => handleDeleteRow(rowIndex)}
                          className="p-1.5 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                          title="Eliminar fila"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      {esSinHorario && (
                        <div className="absolute -top-1 -right-1">
                          <Clock className="h-3 w-3 text-red-400" />
                        </div>
                      )}
                      {esDuplicado && !esSinHorario && (
                        <div className="absolute -top-1 -right-1">
                          <AlertCircle className="h-3 w-3 text-purple-400" />
                        </div>
                      )}
                      {esResidenteFormativo && !esSinHorario && !esDuplicado && (
                        <div className="absolute -top-1 -right-1">
                          <UserX className="h-3 w-3 text-blue-400" />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>

      {/* Resumen */}
      <div className="text-sm text-gray-400">
        Total de filas: <span className="text-green-400 font-semibold">{rows.length}</span>
        {' • '}
        Columnas: <span className="text-green-400 font-semibold">{data.headers.length}</span>
        {cantidadParticulares > 0 && (
          <>
            {' • '}
            Sin obra social: <span className="text-yellow-400 font-semibold">{cantidadParticulares}</span>
          </>
        )}
        {cantidadSinHorario > 0 && (
          <>
            {' • '}
            Sin horario: <span className="text-red-400 font-semibold">{cantidadSinHorario}</span>
          </>
        )}
        {cantidadDuplicados > 0 && (
          <>
            {' • '}
            Duplicados: <span className="text-purple-400 font-semibold">{cantidadDuplicados}</span>
          </>
        )}
        {cantidadResidenteHorarioFormativo > 0 && (
          <>
            {' • '}
            Residente formativo: <span className="text-blue-400 font-semibold">{cantidadResidenteHorarioFormativo}</span>
          </>
        )}
      </div>
    </div>
  )
}

