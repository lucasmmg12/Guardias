import * as XLSX from 'xlsx'
import { ExcelRow } from '@/lib/excel-reader'

export interface ExportExcelOptions {
  rows: ExcelRow[]
  headers: string[]
  filename?: string
  sheetName?: string
}

export function exportFilteredDataToExcel({
  rows,
  headers,
  filename = 'datos_filtrados',
  sheetName = 'Datos'
}: ExportExcelOptions): void {
  if (rows.length === 0) {
    throw new Error('No hay datos para exportar')
  }

  // Preparar datos para Excel: convertir cada fila en un objeto con los headers como claves
  const datos = rows.map(row => {
    const fila: Record<string, any> = {}
    headers.forEach(header => {
      fila[header] = row[header] ?? ''
    })
    return fila
  })

  // Crear worksheet
  const worksheet = XLSX.utils.json_to_sheet(datos)
  
  // Ajustar ancho de columnas automáticamente
  const columnWidths = headers.map(header => {
    const maxLength = Math.max(
      header.length,
      ...datos.map(row => String(row[header] || '').length)
    )
    return { wch: Math.min(maxLength + 2, 50) } // Máximo 50 caracteres de ancho
  })
  worksheet['!cols'] = columnWidths

  // Crear workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Generar archivo
  const excelBuffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
    cellStyles: true
  })

  // Crear blob y descargar
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

