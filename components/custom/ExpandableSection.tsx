'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { ChevronDown, ChevronUp, Trash2, Search, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExcelRow, ExcelData } from '@/lib/excel-reader'
import { InlineEditCell } from './InlineEditCell'
import { ConfirmModal } from './ConfirmModal'
import { exportFilteredDataToExcel } from '@/lib/excel-exporter'

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
  // Valores de consultas para calcular importe
  valoresConsultas?: Map<string, number>
  // Adicionales para calcular adicional
  adicionales?: Map<string, number>
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
  esResidenteFormativoRow,
  valoresConsultas = new Map(),
  adicionales = new Map()
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
    return headerLower.includes('cliente') || headerLower.includes('obra') || headerLower === 'importe' || headerLower === 'adicional'
  }

  // Función para obtener el valor de adicional basado en la obra social
  const obtenerAdicional = useCallback((row: ExcelRow): number => {
    // Si el adicional ya está guardado en el row (desde BD), usarlo
    if (row['Adicional'] !== null && row['Adicional'] !== undefined) {
      const adicionalValue = row['Adicional']
      if (typeof adicionalValue === 'number') {
        return adicionalValue
      }
      if (typeof adicionalValue === 'string') {
        const parsed = parseFloat(adicionalValue)
        if (!isNaN(parsed)) {
          return parsed
        }
      }
    }
    
    // Si no está guardado, calcular desde la obra social
    const clienteHeader = data.headers.find(h => {
      const hLower = h.toLowerCase().trim()
      return hLower === 'cliente' || hLower.includes('obra social') || hLower.includes('obra')
    })
    
    if (!clienteHeader) return 0
    
    const obraSocial = row[clienteHeader]
    if (!obraSocial || typeof obraSocial !== 'string') return 0
    
    const obraSocialTrimmed = obraSocial.trim()
    
    // Buscar en el mapa de adicionales
    return adicionales.get(obraSocialTrimmed) || 0
  }, [data.headers, adicionales])

  // Función para obtener el valor de importe basado en la obra social
  const obtenerImporte = useCallback((row: ExcelRow): number => {
    // Si el importe ya está guardado en el row (desde BD), usarlo
    if (row['Importe'] !== null && row['Importe'] !== undefined) {
      const importeValue = row['Importe']
      if (typeof importeValue === 'number') {
        return importeValue
      }
      if (typeof importeValue === 'string') {
        const parsed = parseFloat(importeValue)
        if (!isNaN(parsed)) {
          return parsed
        }
      }
    }
    
    // Si no está guardado, calcular desde la obra social
    const clienteHeader = data.headers.find(h => {
      const hLower = h.toLowerCase().trim()
      return hLower === 'cliente' || hLower.includes('obra social') || hLower.includes('obra')
    })
    
    if (!clienteHeader) return 0
    
    const obraSocial = row[clienteHeader]
    if (!obraSocial || typeof obraSocial !== 'string') return 0
    
    const obraSocialTrimmed = obraSocial.trim()
    
    // Buscar en el mapa de valores
    let valor = valoresConsultas.get(obraSocialTrimmed) || 0
    
    // Si no se encontró, intentar con variaciones
    if (valor === 0) {
      if (obraSocialTrimmed === 'PARTICULARES' || obraSocialTrimmed === '042 - PARTICULARES') {
        valor = valoresConsultas.get('PARTICULARES') || valoresConsultas.get('042 - PARTICULARES') || 0
      }
    }
    
    return valor
  }, [data.headers, valoresConsultas])

  // Memoizar cálculos de importe y adicional para todas las filas
  const valoresCalculados = useMemo(() => {
    const mapa = new Map<number, { adicional: number; importe: number }>()
    rows.forEach((row, index) => {
      const adicional = obtenerAdicional(row)
      const importe = obtenerImporte(row)
      mapa.set(index, { adicional, importe })
    })
    return mapa
  }, [rows, obtenerAdicional, obtenerImporte])

  // Filtrar filas basándose en los filtros activos
  const filteredRows = useMemo(() => {
    if (filters.size === 0) return rows

    return rows.filter((row, index) => {
      // Filtrar por headers normales
      const headersMatch = data.headers.every((header) => {
        const filterValue = filters.get(header)
        if (!filterValue || filterValue.trim() === '') return true

        const cellValue = row[header]
        if (cellValue === null || cellValue === undefined) return false

        // Búsqueda case-insensitive
        const cellStr = String(cellValue).toLowerCase()
        const filterStr = filterValue.toLowerCase().trim()
        
        return cellStr.includes(filterStr)
      })

      if (!headersMatch) return false

      // Filtrar por columna Adicional si hay filtro (usar valores calculados)
      const adicionalFilter = filters.get('Adicional')
      if (adicionalFilter && adicionalFilter.trim() !== '') {
        const valores = valoresCalculados.get(index)
        const adicional = valores?.adicional ?? obtenerAdicional(row)
        const adicionalStr = adicional.toString()
        const filterStr = adicionalFilter.toLowerCase().trim()
        
        if (!adicionalStr.toLowerCase().includes(filterStr)) {
          return false
        }
      }

      // Filtrar por columna Importe si hay filtro (usar valores calculados)
      const importeFilter = filters.get('Importe')
      if (importeFilter && importeFilter.trim() !== '') {
        const valores = valoresCalculados.get(index)
        const importe = valores?.importe ?? obtenerImporte(row)
        const importeStr = importe.toString()
        const filterStr = importeFilter.toLowerCase().trim()
        
        if (!importeStr.toLowerCase().includes(filterStr)) {
          return false
        }
      }

      return true
    })
  }, [rows, filters, data.headers, valoresCalculados, obtenerAdicional, obtenerImporte])

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

  // Función para exportar datos filtrados
  const handleExportExcel = (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const nombreArchivo = `${title.toLowerCase().replace(/\s+/g, '_')}_filtrado`
      exportFilteredDataToExcel({
        rows: filteredRows,
        headers: data.headers,
        filename: nombreArchivo,
        sheetName: title
      })
    } catch (error: any) {
      console.error('Error exportando Excel:', error)
      alert(`Error al exportar: ${error.message}`)
    }
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
            {/* Botón de descarga Excel */}
            {isExpanded && filteredRows.length > 0 && (
              <Button
                onClick={handleExportExcel}
                size="sm"
                variant="outline"
                className="mr-2"
                style={{
                  borderColor: borderColor,
                  color: textColor,
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                Descargar Excel ({filteredRows.length})
              </Button>
            )}
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
                            const allIndices = filteredRows.map((row) => {
                              // Usar la misma lógica mejorada para encontrar índices
                              const filaExcel = (row as any).__fila_excel
                              let originalRowIndex = -1
                              
                              if (filaExcel !== undefined && filaExcel !== null) {
                                originalRowIndex = data.rows.findIndex(r => (r as any).__fila_excel === filaExcel)
                              }
                              
                              if (originalRowIndex === -1) {
                                originalRowIndex = data.rows.findIndex(r => r === row)
                              }
                              
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
                  {/* Columna Adicional */}
                  <th
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
                      <span className="truncate">Adicional</span>
                      {allowEdit && (
                        <span className="text-[10px] text-green-400 bg-green-400/20 px-1.5 py-0.5 rounded flex-shrink-0">
                          Editable
                        </span>
                      )}
                    </div>
                  </th>
                  {/* Columna Importe */}
                  <th
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
                      <span className="truncate">Importe</span>
                      {allowEdit && (
                        <span className="text-[10px] text-green-400 bg-green-400/20 px-1.5 py-0.5 rounded flex-shrink-0">
                          Editable
                        </span>
                      )}
                    </div>
                  </th>
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
                  {/* Filtro para columna Importe */}
                  <td
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
                        value={filterInputs.get('Importe') || ''}
                        onChange={(e) => handleFilterChange('Importe', e.target.value)}
                        placeholder="Filtrar..."
                        className="w-full px-2 py-1.5 text-xs bg-gray-800/70 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {filterInputs.get('Importe') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleFilterChange('Importe', '')
                          }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white z-10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              </thead>
              <tbody style={{ paddingTop: tbodyPaddingTop }}>
                {filteredRows.map((row, filteredIndex) => {
                  // Intentar obtener fila_excel primero para búsqueda más confiable
                  const filaExcel = (row as any).__fila_excel
                  let originalRowIndex = -1
                  
                  if (filaExcel !== undefined && filaExcel !== null) {
                    // Buscar por fila_excel que es más confiable
                    originalRowIndex = data.rows.findIndex(r => (r as any).__fila_excel === filaExcel)
                  }
                  
                  // Si no se encontró por fila_excel, usar comparación de referencia
                  if (originalRowIndex === -1) {
                    originalRowIndex = data.rows.findIndex(r => r === row)
                  }
                  
                  // Si aún no se encontró, usar comparación por contenido (fallback)
                  if (originalRowIndex === -1) {
                    // Comparar por múltiples campos clave para encontrar la fila correcta
                    const keyFields = data.headers.filter(h => {
                      const hLower = h.toLowerCase()
                      return hLower.includes('fecha') || hLower.includes('hora') || 
                             hLower.includes('paciente') || hLower.includes('responsable')
                    })
                    
                    if (keyFields.length > 0) {
                      originalRowIndex = data.rows.findIndex(r => {
                        return keyFields.every(field => {
                          const rVal = r[field]
                          const rowVal = row[field]
                          return rVal === rowVal || (rVal == null && rowVal == null)
                        })
                      })
                    }
                  }
                  
                  // Usar un key más estable para evitar problemas de renderizado
                  const rowKey = filaExcel !== undefined && filaExcel !== null 
                    ? `fila-${filaExcel}` 
                    : originalRowIndex !== -1
                    ? `row-${originalRowIndex}`
                    : `filtered-${filteredIndex}`
                  
                  const isSelected = originalRowIndex !== -1 && selectedRows.has(originalRowIndex)
                  
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
                      key={rowKey}
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
                      {/* Columna Adicional */}
                      <td
                        className="px-2 py-1.5 text-xs text-gray-300 text-right"
                        style={{
                          minWidth: '120px',
                          maxWidth: '200px',
                          position: 'relative',
                          zIndex: 1,
                        }}
                      >
                        {(() => {
                          // Usar valor calculado memoizado si está disponible
                          const valores = valoresCalculados.get(originalRowIndex)
                          const adicionalValue = row['Adicional'] !== null && row['Adicional'] !== undefined
                            ? (typeof row['Adicional'] === 'number' ? row['Adicional'] : parseFloat(String(row['Adicional'])) || 0)
                            : (valores?.adicional ?? obtenerAdicional(row))
                          
                          return allowEdit && onCellUpdate ? (
                            <InlineEditCell
                              value={adicionalValue}
                              type="number"
                              onSave={async (newValue) => {
                                const numValue = typeof newValue === 'string' ? parseFloat(newValue) || 0 : newValue
                                await onCellUpdate(originalRowIndex, 'Adicional', numValue)
                              }}
                              columnName="Adicional"
                            />
                          ) : (
                            <span className="truncate block text-right">
                              {new Intl.NumberFormat('es-AR', {
                                style: 'currency',
                                currency: 'ARS',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(adicionalValue)}
                            </span>
                          )
                        })()}
                      </td>
                      {/* Columna Importe */}
                      <td
                        className="px-2 py-1.5 text-xs text-gray-300 text-right"
                        style={{
                          minWidth: '120px',
                          maxWidth: '200px',
                          position: 'relative',
                          zIndex: 1,
                        }}
                      >
                        {(() => {
                          // Usar valor calculado memoizado si está disponible
                          const valores = valoresCalculados.get(originalRowIndex)
                          const importeValue = row['Importe'] !== null && row['Importe'] !== undefined
                            ? (typeof row['Importe'] === 'number' ? row['Importe'] : parseFloat(String(row['Importe'])) || 0)
                            : (valores?.importe ?? obtenerImporte(row))
                          
                          return allowEdit && onCellUpdate ? (
                            <InlineEditCell
                              value={importeValue}
                              type="number"
                              onSave={async (newValue) => {
                                const numValue = typeof newValue === 'string' ? parseFloat(newValue) || 0 : newValue
                                await onCellUpdate(originalRowIndex, 'Importe', numValue)
                              }}
                              columnName="Importe"
                            />
                          ) : (
                            <span className="truncate block text-right">
                              {new Intl.NumberFormat('es-AR', {
                                style: 'currency',
                                currency: 'ARS',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(importeValue)}
                            </span>
                          )
                        })()}
                      </td>
                    </tr>
                  )
                })}
                {/* Fila de totales */}
                {filteredRows.length > 0 && (
                  <tr className="bg-gray-800/70 font-bold border-t-2 border-gray-600">
                    {allowDelete && (
                      <td
                        className="px-2 py-2 text-center sticky left-0"
                        style={{
                          minWidth: '50px',
                          maxWidth: '50px',
                          background: 'rgba(0, 0, 0, 0.8)',
                          zIndex: 8,
                        }}
                      ></td>
                    )}
                    {data.headers.map((header, colIndex) => {
                      // Si es la última columna antes de Adicional e Importe, mostrar "TOTAL"
                      const isLastColumn = colIndex === data.headers.length - 1
                      return (
                        <td
                          key={colIndex}
                          className="px-2 py-2 text-xs text-green-400 font-semibold"
                          style={{
                            minWidth: '120px',
                            maxWidth: '200px',
                          }}
                        >
                          {isLastColumn ? 'TOTAL' : ''}
                        </td>
                      )
                    })}
                    {/* Total de Adicional */}
                    <td
                      className="px-2 py-2 text-xs text-green-400 font-semibold text-right"
                      style={{
                        minWidth: '120px',
                        maxWidth: '200px',
                      }}
                    >
                      {new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: 'ARS',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(
                        filteredRows.reduce((sum, row, filteredIdx) => {
                          // Encontrar el índice original de la fila
                          const originalIdx = rows.findIndex(r => {
                            const filaExcel = (r as any).__fila_excel
                            const rowFilaExcel = (row as any).__fila_excel
                            if (filaExcel !== undefined && rowFilaExcel !== undefined) {
                              return filaExcel === rowFilaExcel
                            }
                            return r === row
                          })
                          const valores = originalIdx >= 0 ? valoresCalculados.get(originalIdx) : null
                          const adicional = row['Adicional'] !== null && row['Adicional'] !== undefined
                            ? (typeof row['Adicional'] === 'number' ? row['Adicional'] : parseFloat(String(row['Adicional'])) || 0)
                            : (valores?.adicional ?? obtenerAdicional(row))
                          return sum + adicional
                        }, 0)
                      )}
                    </td>
                    {/* Total de Importe */}
                    <td
                      className="px-2 py-2 text-xs text-green-400 font-semibold text-right"
                      style={{
                        minWidth: '120px',
                        maxWidth: '200px',
                      }}
                    >
                      {new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: 'ARS',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(
                        filteredRows.reduce((sum, row, filteredIdx) => {
                          // Encontrar el índice original de la fila
                          const originalIdx = rows.findIndex(r => {
                            const filaExcel = (r as any).__fila_excel
                            const rowFilaExcel = (row as any).__fila_excel
                            if (filaExcel !== undefined && rowFilaExcel !== undefined) {
                              return filaExcel === rowFilaExcel
                            }
                            return r === row
                          })
                          const valores = originalIdx >= 0 ? valoresCalculados.get(originalIdx) : null
                          const importe = row['Importe'] !== null && row['Importe'] !== undefined
                            ? (typeof row['Importe'] === 'number' ? row['Importe'] : parseFloat(String(row['Importe'])) || 0)
                            : (valores?.importe ?? obtenerImporte(row))
                          return sum + importe
                        }, 0)
                      )}
                    </td>
                  </tr>
                )}
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
              // IMPORTANTE: Obtener los índices originales ANTES de empezar a eliminar
              // porque después de cada eliminación, los índices cambian al recargar los datos
              const indicesArray = Array.from(selectedRows).sort((a, b) => b - a) // Orden inverso
              
              // Obtener los fila_excel de todas las filas seleccionadas ANTES de eliminar
              const filasExcel = indicesArray
                .map(index => {
                  const row = data.rows[index]
                  return row ? (row as any).__fila_excel : null
                })
                .filter((filaExcel): filaExcel is number => filaExcel !== null && filaExcel !== undefined)
              
              // Eliminar cada fila usando su índice original
              // El handleDeleteRow ya maneja la recarga de datos después de cada eliminación
              // Pero como estamos usando fila_excel, no importa si los índices cambian
              for (const index of indicesArray) {
                // Verificar que la fila todavía existe antes de intentar eliminarla
                if (index < data.rows.length) {
                  await onDeleteRow(index)
                }
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

// Memoizar el componente para evitar re-renders innecesarios
export const MemoizedExpandableSection = memo(ExpandableSection, (prevProps, nextProps) => {
  // Comparación personalizada para evitar re-renders innecesarios
  return (
    prevProps.title === nextProps.title &&
    prevProps.count === nextProps.count &&
    prevProps.rows === nextProps.rows &&
    prevProps.data === nextProps.data &&
    prevProps.mes === nextProps.mes &&
    prevProps.anio === nextProps.anio &&
    prevProps.sectionKey === nextProps.sectionKey
  )
})


