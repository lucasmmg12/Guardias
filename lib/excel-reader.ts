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
 * - Fila 1: Headers
 * - Desde fila 2: Datos
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

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    
    // Intentar leer el período de la fila 2 (índice 1) si existe
    const row2: any[] = []
    for (let col = 0; col <= Math.min(range.e.c, 50); col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col })
      const cell = worksheet[cellAddress]
      row2.push(cell ? cell.v : null)
    }
    const periodo = extractPeriodo(row2)

    // Leer la fila 1 (índice 0) para los headers
    // IMPORTANTE: Leer TODAS las columnas, incluso las vacías, para mantener la correspondencia exacta
    const headers: Array<{ name: string; colIndex: number }> = []
    const maxCols = Math.min(range.e.c + 1, 50) // Limitar a 50 columnas máximo para evitar problemas
    
    // Primero, encontrar la última columna con un header válido
    let lastHeaderCol = -1
    for (let col = 0; col < maxCols; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      const cell = worksheet[cellAddress]
      if (cell && cell.v !== null && cell.v !== undefined) {
        const headerValue = String(cell.v).trim()
        if (headerValue !== '') {
          lastHeaderCol = col
        }
      }
    }
    
    // Si no encontramos headers, lanzar error
    if (lastHeaderCol === -1) {
      throw new Error('No se encontraron headers en la fila 1')
    }
    
    // Leer todos los headers desde la columna 0 hasta la última con header válido
    for (let col = 0; col <= lastHeaderCol; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      const cell = worksheet[cellAddress]
      
      if (cell && cell.v !== null && cell.v !== undefined) {
        const headerValue = String(cell.v).trim()
        headers.push({
          name: headerValue || `Columna ${col + 1}`, // Si está vacío, usar nombre genérico
          colIndex: col
        })
      } else {
        // Si la celda está vacía pero estamos antes de la última columna con header,
        // agregar un header vacío para mantener la correspondencia
        headers.push({
          name: `Columna ${col + 1}`,
          colIndex: col
        })
      }
    }

    // Filtrar headers vacíos solo para la visualización, pero mantener la estructura
    const headerNames = headers.map(h => h.name).filter(name => !name.startsWith('Columna'))

    // Leer datos manualmente desde la fila 2 (índice 1) en adelante
    const rows: ExcelRow[] = []
    
    for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex++) {
      const row: ExcelRow = {}
      let hasData = false
      
      // Leer usando el índice de columna real del Excel
      headers.forEach((headerInfo) => {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: headerInfo.colIndex })
        const cell = worksheet[cellAddress]
        
        if (cell && cell.v !== null && cell.v !== undefined) {
          let value: any = cell.v
          
          // Detectar si es la columna "Duración"
          const isDuracion = headerInfo.name.toLowerCase().includes('duración') || 
                            headerInfo.name.toLowerCase().includes('duracion')
          
          if (isDuracion) {
            // Para la columna Duración, mantener como número (minutos)
            if (typeof value === 'number') {
              // Ya es un número, mantenerlo tal cual
              value = Math.round(value) // Redondear a entero si es necesario
            } else if (typeof value === 'string') {
              // Si viene como string, intentar convertir a número
              const numValue = parseFloat(value.replace(',', '.'))
              value = isNaN(numValue) ? value : Math.round(numValue)
            }
            // No aplicar conversión de fecha para Duración
          } else {
            // Para otras columnas, aplicar la lógica de conversión de fechas
            // Si es una fecha, convertirla a string formateado
            if (cell.t === 'd' && value instanceof Date) {
              const day = value.getDate()
              const month = value.getMonth() + 1
              const year = value.getFullYear()
              value = `${day}/${month}/${year}`
            } else if (cell.t === 'n' && typeof value === 'number') {
              // Si es un número que parece una fecha serial de Excel
              // Solo convertir si NO es la columna Duración
              if (value > 1 && value < 100000) {
                try {
                  const excelDate = XLSX.SSF.parse_date_code(value)
                  if (excelDate) {
                    value = `${excelDate.d}/${excelDate.m}/${excelDate.y}`
                  }
                } catch {
                  // Si no se puede parsear como fecha, mantener el número
                }
              }
            }
          }
          
          // Solo agregar al row si el header tiene un nombre válido (no es "Columna X")
          if (!headerInfo.name.startsWith('Columna')) {
            row[headerInfo.name] = value
            hasData = true
          }
        } else {
          // Solo agregar null si el header tiene un nombre válido
          if (!headerInfo.name.startsWith('Columna')) {
            row[headerInfo.name] = null
          }
        }
      })
      
      // Solo agregar la fila si tiene al menos un dato
      if (hasData) {
        rows.push(row)
      }
    }

    return {
      periodo,
      headers: headerNames, // Usar solo los headers con nombre válido para la visualización
      rows
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al leer el archivo Excel: ' + String(error))
  }
}

