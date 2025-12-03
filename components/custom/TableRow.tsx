'use client'

import { memo } from 'react'
import { ExcelRow, ExcelData } from '@/lib/excel-reader'
import { InlineEditCell } from './InlineEditCell'

interface TableRowProps {
  row: ExcelRow
  originalRowIndex: number
  data: ExcelData
  allowEdit: boolean
  allowDelete: boolean
  isSelected: boolean
  onCellUpdate?: (rowIndex: number, column: string, newValue: any) => Promise<void>
  onDeleteRow?: (rowIndex: number) => Promise<void> | void
  onToggleSelect: (index: number) => void
  valoresCalculados: Map<number, { adicional: number; importe: number }>
  obtenerAdicional: (row: ExcelRow) => number
  obtenerImporte: (row: ExcelRow) => number
  rowBgColor: string
  isEditable: (header: string) => boolean
}

export const TableRow = memo(function TableRow({
  row,
  originalRowIndex,
  data,
  allowEdit,
  allowDelete,
  isSelected,
  onCellUpdate,
  onDeleteRow,
  onToggleSelect,
  valoresCalculados,
  obtenerAdicional,
  obtenerImporte,
  rowBgColor,
  isEditable
}: TableRowProps) {
  // Encontrar fila_excel para key estable
  const filaExcel = (row as any).__fila_excel
  const rowKey = filaExcel !== undefined && filaExcel !== null 
    ? `row-${filaExcel}` 
    : `row-${originalRowIndex}`

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
            onChange={() => onToggleSelect(originalRowIndex)}
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
}, (prevProps, nextProps) => {
  // Comparación optimizada para evitar re-renders innecesarios
  return (
    prevProps.row === nextProps.row &&
    prevProps.originalRowIndex === nextProps.originalRowIndex &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.allowEdit === nextProps.allowEdit &&
    prevProps.allowDelete === nextProps.allowDelete &&
    prevProps.valoresCalculados === nextProps.valoresCalculados &&
    prevProps.rowBgColor === nextProps.rowBgColor
  )
})

