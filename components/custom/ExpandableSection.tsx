'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExcelRow, ExcelData } from '@/lib/excel-reader'
import { InlineEditCell } from './InlineEditCell'

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
  onDeleteAll?: () => void
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
  }

  const isEditable = (header: string) => {
    const headerLower = header.toLowerCase().trim()
    return headerLower.includes('cliente') || headerLower.includes('obra')
  }

  if (count === 0) return null

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
                {title}
              </div>
              <div className="text-sm" style={{ color: textColor, opacity: 0.8 }}>
                {description}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {allowDelete && isExpanded && onDeleteAll && (
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`¿Está seguro de que desea eliminar todos los ${count} registros?`)) {
                    onDeleteAll()
                  }
                }}
                size="sm"
                variant="destructive"
                className="mr-2"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar todos
              </Button>
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
          <div className="overflow-x-auto">
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
                        {isEditable(header) && allowEdit && (
                          <span className="text-[10px] text-green-400 bg-green-400/20 px-1.5 py-0.5 rounded flex-shrink-0">
                            Editable
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  {allowDelete && (
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
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  const originalRowIndex = data.rows.findIndex(r => r === row)
                  
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
                  
                  return (
                    <tr
                      key={originalRowIndex}
                      className="border-b transition-colors border-white/5 hover:bg-white/5"
                      style={{
                        backgroundColor: rowBgColor
                      }}
                    >
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
                      {allowDelete && onDeleteRow && (
                        <td className="px-2 py-1.5 text-center sticky right-0 bg-gray-900">
                          <Button
                            onClick={async () => {
                              if (confirm('¿Está seguro de que desea eliminar esta fila?')) {
                                await onDeleteRow(originalRowIndex)
                              }
                            }}
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


