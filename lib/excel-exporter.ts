import * as XLSX from 'xlsx'
import { ExcelRow } from '@/lib/excel-reader'
import { ResumenPorPrestador } from './pediatria-resumenes'

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

  // Excel limita los nombres de hojas a 31 caracteres
  const maxSheetNameLength = 31
  const truncatedSheetName = sheetName.length > maxSheetNameLength
    ? sheetName.substring(0, maxSheetNameLength)
    : sheetName

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
  XLSX.utils.book_append_sheet(workbook, worksheet, truncatedSheetName)

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

/**
 * Exporta resúmenes por prestador a Excel con las columnas requeridas
 * Columnas: Nombre del Médico, Cantidad de Pacientes, Total Bruto ($), 
 * Retención 30% ($), Subtotal ($), Plus Adicionales ($), Total Final ($)
 */
export function exportResumenPrestadorToExcel({
  resumenes,
  mes,
  anio,
  especialidad = 'Pediatría'
}: {
  resumenes: ResumenPorPrestador[]
  mes: number
  anio: number
  especialidad?: string
}): void {
  if (resumenes.length === 0) {
    throw new Error('No hay datos para exportar')
  }

  const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  // Mapear datos a las columnas requeridas exactas
  const datos = resumenes.map(resumen => ({
    'Nombre del Médico': resumen.medico_nombre,
    'Cantidad de Pacientes': resumen.cantidad,
    'Total Bruto ($)': resumen.total_bruto,
    'Retención 30% ($)': resumen.retencion_30,
    'Subtotal ($)': resumen.total_neto,
    'Plus Adicionales ($)': resumen.adicionales,
    'Total Final ($)': resumen.total_final
  }))

  // Agregar fila de totales
  const totales = {
    'Nombre del Médico': 'TOTAL',
    'Cantidad de Pacientes': resumenes.reduce((sum, r) => sum + r.cantidad, 0),
    'Total Bruto ($)': resumenes.reduce((sum, r) => sum + r.total_bruto, 0),
    'Retención 30% ($)': resumenes.reduce((sum, r) => sum + r.retencion_30, 0),
    'Subtotal ($)': resumenes.reduce((sum, r) => sum + r.total_neto, 0),
    'Plus Adicionales ($)': resumenes.reduce((sum, r) => sum + r.adicionales, 0),
    'Total Final ($)': resumenes.reduce((sum, r) => sum + r.total_final, 0)
  }
  datos.push(totales)

  // Crear worksheet
  const worksheet = XLSX.utils.json_to_sheet(datos)

  // Ajustar ancho de columnas
  const headers = [
    'Nombre del Médico',
    'Cantidad de Pacientes',
    'Total Bruto ($)',
    'Retención 30% ($)',
    'Subtotal ($)',
    'Plus Adicionales ($)',
    'Total Final ($)'
  ]

  const columnWidths = headers.map(header => {
    const maxLength = Math.max(
      header.length,
      ...datos.map(row => String(row[header as keyof typeof row] || '').length)
    )
    return { wch: Math.min(maxLength + 2, 50) }
  })
  worksheet['!cols'] = columnWidths

  // Estilizar la fila de totales (última fila)
  const totalRowIndex = datos.length
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: totalRowIndex - 1, c: col })
    if (!worksheet[cellAddress]) continue
    
    // Hacer la fila de totales en negrita
    worksheet[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E0E0E0' } }
    }
  }

  // Crear workbook
  const workbook = XLSX.utils.book_new()
  const sheetName = `Resumen ${MESES[mes - 1]} ${anio}`
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
  link.download = `Resumen_Prestadores_${especialidad}_${MESES[mes - 1]}_${anio}_${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

