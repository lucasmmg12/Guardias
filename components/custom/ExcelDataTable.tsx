'use client'

import { useState, useMemo, useCallback } from 'react'
import { ExcelRow, ExcelData } from '@/lib/excel-reader'
import { InlineEditCell } from './InlineEditCell'
import { CheckCircle2, AlertCircle, Trash2, Clock } from 'lucide-react'
import { esParticular, tieneHorario, obtenerIndicesDuplicados } from '@/lib/utils'

interface ExcelDataTableProps {
  data: ExcelData
  onCellUpdate?: (rowIndex: number, column: string, newValue: any) => Promise<void>
}

export function ExcelDataTable({ data, onCellUpdate }: ExcelDataTableProps) {
  const [rows, setRows] = useState<ExcelRow[]>(data.rows)
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({})

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

  // Contar problemas
  const cantidadParticulares = filasParticulares.size
  const cantidadSinHorario = filasSinHorario.size
  const cantidadDuplicados = filasDuplicadas.size

  // Función para eliminar una fila
  const handleDeleteRow = useCallback((rowIndex: number) => {
    if (!confirm('¿Está seguro de que desea eliminar esta fila?')) {
      return
    }
    
    const updatedRows = rows.filter((_, index) => index !== rowIndex)
    setRows(updatedRows)
  }, [rows])

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

      {/* Alerta de PARTICULARES */}
      {cantidadParticulares > 0 && (
        <div 
          className="p-4 rounded-xl border-2 animate-pulse"
          style={{
            background: 'rgba(251, 191, 36, 0.15)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(251, 191, 36, 0.5)',
          }}
        >
          <div className="flex items-center gap-3 text-yellow-400">
            <AlertCircle className="h-6 w-6 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-lg mb-1">
                ⚠️ {cantidadParticulares} registro{cantidadParticulares > 1 ? 's' : ''} sin obra social detectado{cantidadParticulares > 1 ? 's' : ''}
              </div>
              <div className="text-sm text-yellow-300">
                Estos registros deben ser revisados. Si son pacientes particulares, edite la columna "Cliente" y agregue: <strong>"042 - PARTICULARES"</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de Sin Horario */}
      {cantidadSinHorario > 0 && (
        <div 
          className="p-4 rounded-xl border-2 animate-pulse"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(239, 68, 68, 0.5)',
          }}
        >
          <div className="flex items-center gap-3 text-red-400">
            <Clock className="h-6 w-6 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-lg mb-1">
                ⚠️ {cantidadSinHorario} registro{cantidadSinHorario > 1 ? 's' : ''} sin horario de inicio detectado{cantidadSinHorario > 1 ? 's' : ''}
              </div>
              <div className="text-sm text-red-300">
                Estos registros indican que el paciente <strong>no se atendió</strong>. Deben ser eliminados. Use el botón de eliminar en cada fila.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de Duplicados */}
      {cantidadDuplicados > 0 && (
        <div 
          className="p-4 rounded-xl border-2 animate-pulse"
          style={{
            background: 'rgba(168, 85, 247, 0.15)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(168, 85, 247, 0.5)',
          }}
        >
          <div className="flex items-center gap-3 text-purple-400">
            <AlertCircle className="h-6 w-6 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-lg mb-1">
                ⚠️ {cantidadDuplicados} registro{cantidadDuplicados > 1 ? 's' : ''} duplicado{cantidadDuplicados > 1 ? 's' : ''} detectado{cantidadDuplicados > 1 ? 's' : ''}
              </div>
              <div className="text-sm text-purple-300">
                Se detectaron filas completamente iguales (misma fecha, misma hora, mismo todo). Revise y elimine los duplicados si es necesario.
              </div>
            </div>
          </div>
        </div>
      )}

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
                
                // Determinar el estilo de la fila según la prioridad de problemas
                let filaClassName = 'border-b transition-colors border-white/5 hover:bg-white/5'
                if (esSinHorario) {
                  filaClassName = 'bg-red-500/20 border-red-500/30 hover:bg-red-500/30 border-b'
                } else if (esDuplicado) {
                  filaClassName = 'bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30 border-b'
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
      </div>
    </div>
  )
}

