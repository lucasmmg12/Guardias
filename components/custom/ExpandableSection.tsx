'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { ChevronDown, ChevronUp, Trash2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExcelRow, ExcelData } from '@/lib/excel-reader'
import { InlineEditCell } from './InlineEditCell'
import { ConfirmModal } from './ConfirmModal'

interface ExpandableSectionProps {
  title: string
  count: number
  description: string
  icon: React.ReactNode
  bgColor: string
  borderColor: string
  textColor: string
  rows: ExcelRow[]
  data: ExcelData
  onCellUpdate?: (rowIndex: number, column: string, newValue: any) => Promise<void>
  onDeleteRow?: (rowIndex: number) => Promise<void> | void
  onDeleteAll?: () => Promise<void> | void
  allowEdit?: boolean
  allowDelete?: boolean
  mes?: number
  anio?: number
  sectionKey: string
  // Funciones de detección para aplicar colores (solo para detalle completo)
  esParticularRow?: (rowIndex: number) => boolean
  esSinHorarioRow?: (rowIndex: number) => boolean
  esDuplicadoRow?: (rowIndex: number) => boolean
  esResidenteFormativoRow?: (rowIndex: number) => boolean
}

export function ExpandableSection({
  title,
  count,
  description,
  icon,
  bgColor,
  borderColor,
  textColor,
  rows,
  data,
  onCellUpdate,
  onDeleteRow,
  onDeleteAll,
  allowEdit = false,
  allowDelete = false,
  mes,
  anio,
  sectionKey,
  esParticularRow,
  esSinHorarioRow,
  esDuplicadoRow,
  esResidenteFormativoRow
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'single' | 'multiple' | 'all'
    rowIndex?: number
    count?: number
  } | null>(null)
  
  // Estado para filtros por columna (valor inmediato para el input)
  const [filterInputs, setFilterInputs] = useState<Map<string, string>>(new Map())
  // Estado para filtros aplicados (con debounce)
  const [filters, setFilters] = useState<Map<string, string>>(new Map())
  
  // Refs para los timers de debounce
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Cargar estado guardado al montar
  useEffect(() => {
    if (mes && anio) {
      const savedState = localStorage.getItem(`expandable_${sectionKey}_${mes}_${anio}`)
      if (savedState === 'true') {
        setIsExpanded(true)
      }
    }
  }, [mes, anio, sectionKey])

  // Guardar estado cuando cambia
  const handleToggle = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    if (mes && anio) {
      localStorage.setItem(`expandable_${sectionKey}_${mes}_${anio}`, String(newState))
    }
    // Limpiar selección al colapsar
    if (!newState) {
      setSelectedRows(new Set())
    }
  }

  const isEditable = (header: string) => {
    const headerLower = header.toLowerCase().trim()
    return headerLower.includes('cliente') || headerLower.includes('obra')
  }

  // Filtrar filas basándose en los filtros activos
  const filteredRows = useMemo(() => {
    if (filters.size === 0) return rows

    return rows.filter(row => {
      return data.headers.every((header) => {
        const filterValue = filters.get(header)
        if (!filterValue || filterValue.trim() === '') return true

        const cellValue = row[header]
        if (cellValue === null || cellValue === undefined) return false

        // Búsqueda case-insensitive
        const cellStr = String(cellValue).toLowerCase()
        const filterStr = filterValue.toLowerCase().trim()
        
        return cellStr.includes(filterStr)
      })
    })
  }, [rows, filters, data.headers])

  // Actualizar count basado en filas filtradas
  const displayCount = filteredRows.length

  // Función para actualizar filtro de una columna con debounce
  const handleFilterChange = useCallback((header: string, value: string) => {
    // Actualizar el input inmediatamente (sin delay visual)
    setFilterInputs(prev => {
      const newMap = new Map(prev)
      if (value.trim() === '') {
        newMap.delete(header)
      } else {
        newMap.set(header, value)
      }
      return newMap
    })

    // Cancelar timer anterior para esta columna
    const existingTimer = debounceTimers.current.get(header)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Crear nuevo timer con debounce de 300ms
    const timer = setTimeout(() => {
      setFilters(prev => {
        const newMap = new Map(prev)
        if (value.trim() === '') {
          newMap.delete(header)
        } else {
          newMap.set(header, value)
        }
        return newMap
      })
      debounceTimers.current.delete(header)
    }, 300)

    debounceTimers.current.set(header, timer)
  }, [])

  // Limpiar timers al desmontar
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach(timer => clearTimeout(timer))
      debounceTimers.current.clear()
    }
  }, [])

  // Limpiar todos los filtros
  const clearAllFilters = () => {
    // Limpiar todos los timers
    debounceTimers.current.forEach(timer => clearTimeout(timer))
    debounceTimers.current.clear()
    // Limpiar estados
    setFilters(new Map())
    setFilterInputs(new Map())
  }

  if (count === 0) return null

  // Calcular altura dinámica para sticky positioning
  // Header tiene aproximadamente 40px de altura
  const headerHeight = 40
  // Banner de filtros activos tiene aproximadamente 40px de altura
  const bannerHeight = filters.size > 0 ? 40 : 0
  // Fila de filtros tiene aproximadamente 48px de altura (py-2 + input)
  const filterRowHeight = 48
  // Top para la fila de filtros = altura del banner + altura del header
  const filterTop = `${bannerHeight + headerHeight}px`
  // Padding del tbody = altura de la fila de filtros + espacio adicional para evitar solapamiento
  const tbodyPaddingTop = `${filterRowHeight + 12}px` // 12px de espacio extra

  return (
    <div className="w-full space-y-2">
      {/* Header clickeable */}
      <div 
        className="p-4 rounded-xl border-2 cursor-pointer transition-all hover:opacity-90"
        style={{
          background: bgColor,
          backdropFilter: 'blur(20px)',
          borderColor: borderColor,
        }}
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3" style={{ color: textColor }}>
            {icon}
              <div className="flex-1">
                <div className="font-bold text-lg mb-1">
                  {title} {displayCount !== count && `(${displayCount} de ${count})`}
                </div>
                <div className="text-sm" style={{ color: textColor, opacity: 0.8 }}>
                  {description}
                </div>
              </div>
          </div>
          <div className="flex items-center gap-2">
            {allowDelete && isExpanded && (
              <>
                {selectedRows.size > 0 && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmAction({
                        type: 'multiple',
                        count: selectedRows.size
                      })
                      setShowConfirmModal(true)
                    }}
                    size="sm"
                    variant="destructive"
                    className="mr-2"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar seleccionados ({selectedRows.size})
                  </Button>
                )}
                {onDeleteAll && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmAction({
                        type: 'all',
                        count: count
                      })
                      setShowConfirmModal(true)
                    }}
                    size="sm"
                    variant="destructive"
                    className="mr-2"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar todos
                  </Button>
                )}
              </>
            )}
            {isExpanded ? (
              <ChevronUp className="h-6 w-6" style={{ color: textColor }} />
            ) : (
              <ChevronDown className="h-6 w-6" style={{ color: textColor }} />
            )}
          </div>
        </div>
      </div>

      {/* Contenido expandible */}
      {isExpanded && (
        <div 
          className="rounded-xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Indicador de filtros activos */}
          {filters.size > 0 && (
            <div className="px-4 py-2 bg-blue-500/20 border-b border-blue-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-blue-400">
                <Search className="h-4 w-4" />
                <span>{filters.size} filtro(s) activo(s) - Mostrando {displayCount} de {rows.length} registros</span>
              </div>
              <Button
                onClick={clearAllFilters}
                size="sm"
                variant="ghost"
                className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 h-7 px-2"
              >
                <X className="h-3 w-3 mr-1" />
                Limpiar filtros
              </Button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                {/* Fila de headers */}
                <tr className="border-b border-white/10">
                  {allowDelete && (
                    <th
                      className="px-2 py-2 text-center text-xs font-semibold text-gray-300 bg-white/5 whitespace-nowrap sticky left-0"
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 12,
                        minWidth: '50px',
                        maxWidth: '50px',
                        background: 'rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const allIndices = filteredRows.map((_, idx) => {
                              const originalRowIndex = data.rows.findIndex(r => r === filteredRows[idx])
                              return originalRowIndex
                            }).filter(idx => idx !== -1)
                            setSelectedRows(new Set(allIndices))
                          } else {
                            setSelectedRows(new Set())
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-500 bg-gray-800 text-green-500 focus:ring-green-500 focus:ring-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </th>
                  )}
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
                        {isEditable(header) && allowEdit && (
                          <span className="text-[10px] text-green-400 bg-green-400/20 px-1.5 py-0.5 rounded flex-shrink-0">
                            Editable
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
                
                {/* Fila de filtros */}
                <tr className="border-b border-white/5 bg-white/2">
                  {allowDelete && (
                    <td
                      className="px-2 py-2 sticky left-0"
                      style={{
                        background: 'rgba(0, 0, 0, 0.9)',
                        zIndex: 11,
                        position: 'sticky',
                        top: filterTop,
                      }}
                    ></td>
                  )}
                  {data.headers.map((header, index) => (
                    <td
                      key={index}
                      className="px-1 py-2"
                      style={{
                        position: 'sticky',
                        top: filterTop,
                        zIndex: 9,
                        background: 'rgba(0, 0, 0, 0.9)',
                      }}
                    >
                      <div className="relative">
                        <input
                          type="text"
                          value={filterInputs.get(header) || ''}
                          onChange={(e) => handleFilterChange(header, e.target.value)}
                          placeholder="Filtrar..."
                          className="w-full px-2 py-1.5 text-xs bg-gray-800/70 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {filterInputs.get(header) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleFilterChange(header, '')
                            }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white z-10"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody style={{ paddingTop: tbodyPaddingTop }}>
                {filteredRows.map((row, rowIndex) => {
                  const originalRowIndex = data.rows.findIndex(r => r === row)
                  const isSelected = selectedRows.has(originalRowIndex)
                  
                  // Determinar colores según reglas (solo si es detalle completo)
                  const esDetalleCompleto = sectionKey === 'detalle_completo'
                  const esParticular = esDetalleCompleto && esParticularRow ? esParticularRow(originalRowIndex) : false
                  const esSinHorario = esDetalleCompleto && esSinHorarioRow ? esSinHorarioRow(originalRowIndex) : false
                  const esDuplicado = esDetalleCompleto && esDuplicadoRow ? esDuplicadoRow(originalRowIndex) : false
                  const esResidenteFormativo = esDetalleCompleto && esResidenteFormativoRow ? esResidenteFormativoRow(originalRowIndex) : false
                  
                  // Determinar color de fondo según prioridad
                  let rowBgColor = 'transparent'
                  if (esSinHorario) {
                    rowBgColor = 'rgba(239, 68, 68, 0.15)' // Rojo para sin horario
                  } else if (esDuplicado) {
                    rowBgColor = 'rgba(168, 85, 247, 0.15)' // Púrpura para duplicados
                  } else if (esParticular) {
                    rowBgColor = 'rgba(251, 191, 36, 0.15)' // Amarillo para sin obra social
                  } else if (esResidenteFormativo) {
                    rowBgColor = 'rgba(59, 130, 246, 0.15)' // Azul para residente formativo
                  }
                  
                  // Si está seleccionado, agregar borde
                  if (isSelected) {
                    rowBgColor = rowBgColor === 'transparent' 
                      ? 'rgba(34, 197, 94, 0.2)' 
                      : rowBgColor.replace('0.15', '0.25')
                  }
                  
                  return (
                    <tr
                      key={originalRowIndex}
                      className="border-b transition-colors border-white/5 hover:bg-white/5"
                      style={{
                        backgroundColor: rowBgColor,
                        borderLeft: isSelected ? '3px solid rgba(34, 197, 94, 0.8)' : undefined
                      }}
                    >
                      {allowDelete && (
                        <td
                          className="px-2 py-1.5 text-center sticky left-0"
                          style={{
                            minWidth: '50px',
                            maxWidth: '50px',
                            background: rowBgColor !== 'transparent' ? rowBgColor : 'rgba(0, 0, 0, 0.5)',
                            zIndex: 8,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = new Set(selectedRows)
                              if (e.target.checked) {
                                newSelected.add(originalRowIndex)
                              } else {
                                newSelected.delete(originalRowIndex)
                              }
                              setSelectedRows(newSelected)
                            }}
                            className="w-4 h-4 rounded border-gray-500 bg-gray-800 text-green-500 focus:ring-green-500 focus:ring-2"
                          />
                        </td>
                      )}
                      {data.headers.map((header, colIndex) => {
                        const value = row[header] ?? null
                        const editable = isEditable(header) && allowEdit

                        return (
                          <td
                            key={colIndex}
                            className="px-2 py-1.5 text-xs text-gray-300"
                            style={{
                              minWidth: '120px',
                              maxWidth: '200px',
                              position: 'relative',
                              zIndex: 1,
                            }}
                          >
                            {editable && onCellUpdate ? (
                              <InlineEditCell
                                value={value || ''}
                                onSave={async (newValue) => {
                                  await onCellUpdate(originalRowIndex, header, newValue)
                                }}
                                columnName={header}
                              />
                            ) : (
                              <span className="truncate block">{value || '-'}</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false)
          setConfirmAction(null)
        }}
        onConfirm={async () => {
          if (!confirmAction) return

          try {
            if (confirmAction.type === 'all' && onDeleteAll) {
              // Eliminar todos
              await onDeleteAll()
              setSelectedRows(new Set())
            } else if (confirmAction.type === 'multiple' && onDeleteRow) {
              // Eliminar seleccionados
              const indicesArray = Array.from(selectedRows).sort((a, b) => b - a) // Orden inverso
              for (const index of indicesArray) {
                await onDeleteRow(index)
              }
              setSelectedRows(new Set())
            } else if (confirmAction.type === 'single' && confirmAction.rowIndex !== undefined && onDeleteRow) {
              // Eliminar uno
              await onDeleteRow(confirmAction.rowIndex)
              const newSelected = new Set(selectedRows)
              newSelected.delete(confirmAction.rowIndex)
              setSelectedRows(newSelected)
            }
          } catch (error) {
            console.error('Error eliminando filas:', error)
          }
        }}
        title="Confirmar eliminación"
        message={
          confirmAction?.type === 'all'
            ? `¿Está seguro de que desea eliminar todos los ${confirmAction.count} registros? Esta acción no se puede deshacer.`
            : confirmAction?.type === 'multiple'
            ? `¿Está seguro de que desea eliminar los ${confirmAction.count} registros seleccionados? Esta acción no se puede deshacer.`
            : '¿Está seguro de que desea eliminar esta fila? Esta acción no se puede deshacer.'
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  )
}


