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

    // Leer la fila 10 (índice 9) para los headers manualmente
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    const headers: string[] = []
    
    // Leer headers de la fila 10 (índice 9)
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 9, c: col })
      const cell = worksheet[cellAddress]
      if (cell && cell.v !== null && cell.v !== undefined) {
        const headerValue = String(cell.v).trim()
        if (headerValue !== '') {
          headers.push(headerValue)
        } else {
          // Si encontramos un header vacío, seguimos leyendo hasta encontrar el siguiente no vacío
          // o hasta el final del rango
          let foundNext = false
          for (let nextCol = col + 1; nextCol <= range.e.c; nextCol++) {
            const nextCellAddress = XLSX.utils.encode_cell({ r: 9, c: nextCol })
            const nextCell = worksheet[nextCellAddress]
            if (nextCell && nextCell.v !== null && nextCell.v !== undefined) {
              const nextHeaderValue = String(nextCell.v).trim()
              if (nextHeaderValue !== '') {
                foundNext = true
                break
              }
            }
          }
          if (!foundNext) {
            break // No hay más headers
          }
        }
      } else {
        // Si encontramos una celda vacía, seguimos hasta encontrar el siguiente header
        // pero solo si ya tenemos headers anteriores
        if (headers.length > 0) {
          // Verificar si hay más headers después
          let hasMoreHeaders = false
          for (let nextCol = col + 1; nextCol <= Math.min(range.e.c, col + 5); nextCol++) {
            const nextCellAddress = XLSX.utils.encode_cell({ r: 9, c: nextCol })
            const nextCell = worksheet[nextCellAddress]
            if (nextCell && nextCell.v !== null && nextCell.v !== undefined) {
              const nextHeaderValue = String(nextCell.v).trim()
              if (nextHeaderValue !== '') {
                hasMoreHeaders = true
                break
              }
            }
          }
          if (!hasMoreHeaders) {
            break // No hay más headers
          }
        }
      }
    }

    if (headers.length === 0) {
      throw new Error('No se encontraron headers en la fila 10')
    }

    // Leer datos manualmente desde la fila 11 (índice 10) en adelante
    const rows: ExcelRow[] = []
    
    for (let rowIndex = 10; rowIndex <= range.e.r; rowIndex++) {
      const row: ExcelRow = {}
      let hasData = false
      
      headers.forEach((header, colIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })
        const cell = worksheet[cellAddress]
        if (cell && cell.v !== null && cell.v !== undefined) {
          // Preservar el tipo de dato original
          let value: any = cell.v
          
          // Si es una fecha, convertirla a string formateado
          if (cell.t === 'd' && value instanceof Date) {
            const day = value.getDate()
            const month = value.getMonth() + 1
            const year = value.getFullYear()
            value = `${day}/${month}/${year}`
          } else if (cell.t === 'n' && typeof value === 'number') {
            // Si es un número que parece una fecha serial de Excel
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
          
          row[header] = value
          hasData = true
        } else {
          row[header] = null
        }
      })
      
      // Solo agregar la fila si tiene al menos un dato
      if (hasData) {
        rows.push(row)
      }
    }

    return {
      periodo,
      headers,
      rows
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al leer el archivo Excel: ' + String(error))
  }
}

