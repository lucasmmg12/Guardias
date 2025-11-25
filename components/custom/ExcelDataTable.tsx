'use client'

import { useState } from 'react'
import { ExcelRow, ExcelData } from '@/lib/excel-reader'
import { InlineEditCell } from './InlineEditCell'
import { CheckCircle2, AlertCircle } from 'lucide-react'

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

      {/* Tabla de datos */}
      <div className="overflow-x-auto rounded-xl" style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              {data.headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-300 bg-white/5"
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {header}
                    {isEditable(header) && (
                      <span className="text-xs text-green-400 bg-green-400/20 px-2 py-0.5 rounded">
                        Editable
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={data.headers.length} className="px-4 py-8 text-center text-gray-400">
                  No hay datos para mostrar
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  {data.headers.map((header, colIndex) => {
                    const value = row[header] ?? null
                    const editable = isEditable(header)
                    const savingKey = `${rowIndex}-${header}`
                    const isSaving = saving[savingKey] || false

                    return (
                      <td
                        key={colIndex}
                        className="px-4 py-2 text-sm text-gray-300"
                      >
                        {editable ? (
                          <InlineEditCell
                            value={value}
                            type="text"
                            onSave={async (newValue) => {
                              await handleCellSave(rowIndex, header, newValue)
                            }}
                            isEditable={true}
                            className={isSaving ? 'opacity-50' : ''}
                          />
                        ) : (
                          <div className="px-2 py-1">
                            {value === null || value === '' ? (
                              <span className="text-gray-500 italic text-xs">-</span>
                            ) : (
                              String(value)
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Resumen */}
      <div className="text-sm text-gray-400">
        Total de filas: <span className="text-green-400 font-semibold">{rows.length}</span>
        {' • '}
        Columnas: <span className="text-green-400 font-semibold">{data.headers.length}</span>
      </div>
    </div>
  )
}

