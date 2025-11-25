import * as XLSX from 'xlsx'

export interface ExcelRow {
  [key: string]: any
}

export interface ExcelData {
  periodo: {
    desde: string
    hasta: string
  } | null
  headers: string[]
  rows: ExcelRow[]
}

/**
 * Extrae el período de la fila 2 del Excel
 * Formato esperado: "Desde fecha: 01/08/2025 Hasta fecha: 31/08/2025"
 */
function extractPeriodo(row2: any[]): { desde: string; hasta: string } | null {
  if (!row2 || row2.length === 0) return null

  // Buscar el texto que contiene las fechas
  const text = row2.map(cell => String(cell || '')).join(' ')
  
  // Patrones para buscar fechas
  const desdeMatch = text.match(/Desde fecha:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
  const hastaMatch = text.match(/Hasta fecha:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)

  if (desdeMatch && hastaMatch) {
    return {
      desde: desdeMatch[1],
      hasta: hastaMatch[1]
    }
  }

  return null
}

/**
 * Lee un archivo Excel con el formato específico:
 * - Fila 2: Período analizado
 * - Fila 10: Headers
 * - Desde fila 11: Datos
 */
export async function readExcelFile(file: File): Promise<ExcelData> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Obtener la primera hoja
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      throw new Error('El archivo Excel no contiene hojas')
    }

    const worksheet = workbook.Sheets[sheetName]

    // Leer la fila 2 (índice 1) para el período
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    const row2: any[] = []
    for (let col = 0; col <= Math.min(range.e.c, 50); col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col })
      const cell = worksheet[cellAddress]
      row2.push(cell ? cell.v : null)
    }

    const periodo = extractPeriodo(row2)

    // Leer la fila 10 (índice 9) para los headers
    const headerRow = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      range: { s: { r: 9, c: 0 }, e: { r: 9, c: 50 } }, // Fila 10 (índice 9)
      defval: null
    })[0] as any[]

    // Limpiar headers (eliminar nulls y espacios)
    const headers = headerRow
      .map((h: any) => String(h || '').trim())
      .filter((h: string) => h !== '')

    if (headers.length === 0) {
      throw new Error('No se encontraron headers en la fila 10')
    }

    // Leer datos desde la fila 11 (índice 10)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      range: 10, // Empieza desde la fila 11 (índice 10)
      defval: null,
      raw: false
    }) as ExcelRow[]

    // Mapear los datos usando los headers encontrados
    // XLSX puede usar los headers de la fila 10 automáticamente
    const rows = jsonData.map((row: any) => {
      const mappedRow: ExcelRow = {}
      headers.forEach((header, index) => {
        // Buscar el valor en el row original
        const cellValue = row[header] || row[Object.keys(row)[index]] || null
        mappedRow[header] = cellValue
      })
      return mappedRow
    })

    // Si el mapeo automático no funcionó bien, intentar leer manualmente
    if (rows.length > 0 && Object.keys(rows[0]).length === 0) {
      // Leer fila por fila manualmente
      const manualRows: ExcelRow[] = []
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
      
      for (let rowIndex = 10; rowIndex <= range.e.r; rowIndex++) {
        const row: ExcelRow = {}
        let hasData = false
        
        headers.forEach((header, colIndex) => {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })
          const cell = worksheet[cellAddress]
          if (cell && cell.v !== null && cell.v !== undefined) {
            row[header] = cell.v
            hasData = true
          } else {
            row[header] = null
          }
        })
        
        if (hasData) {
          manualRows.push(row)
        }
      }
      
      return {
        periodo,
        headers,
        rows: manualRows
      }
    }

    return {
      periodo,
      headers,
      rows: rows.filter(row => {
        // Filtrar filas completamente vacías
        return Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== '')
      })
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al leer el archivo Excel: ' + String(error))
  }
}

