import * as XLSX from 'xlsx'
import { MedicoInsert } from './types'

export interface MedicoExcelRow {
  'Nombre': string
  'Mat. provinc': string | number
  'CUIT': string | number
  'Especialidad': string
  'Grupo persona': string
  'Perfil': string
  'Activo': string | boolean
}

/**
 * Convierte el valor de "Activo" del Excel a boolean
 */
function parseActivo(value: any): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    return lower === 'si' || lower === 'sí' || lower === 'yes' || lower === 'true' || lower === '1'
  }
  if (typeof value === 'number') return value === 1
  return false
}

/**
 * Determina si un médico es residente basado en el perfil
 */
function esResidente(perfil: string | null | undefined): boolean {
  if (!perfil) return false
  const perfilLower = String(perfil).toLowerCase()
  return perfilLower.includes('residente') || perfilLower.includes('resident')
}

/**
 * Lee un archivo Excel de médicos y retorna un array de objetos MedicoInsert
 */
export async function importMedicosFromExcel(file: File): Promise<{
  medicos: MedicoInsert[]
  errores: string[]
  duplicados: number
}> {
  const resultado = {
    medicos: [] as MedicoInsert[],
    errores: [] as string[],
    duplicados: 0
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Obtener la primera hoja
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      throw new Error('El archivo Excel no contiene hojas')
    }

    const worksheet = workbook.Sheets[sheetName]
    
    // Leer datos como JSON (asume que la primera fila son los headers)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      raw: false
    }) as MedicoExcelRow[]

    if (jsonData.length === 0) {
      throw new Error('El archivo Excel no contiene datos')
    }

    // Procesar cada fila
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i]
      const filaNum = i + 2 // +2 porque empieza en 0 y la fila 1 es el header

      try {
        // Validar campos requeridos
        if (!row.Nombre || String(row.Nombre).trim() === '') {
          resultado.errores.push(`Fila ${filaNum}: El campo "Nombre" es requerido`)
          continue
        }

        if (!row['Mat. provinc'] && !row.CUIT) {
          resultado.errores.push(`Fila ${filaNum}: Debe tener al menos "Mat. provinc" o "CUIT"`)
          continue
        }

        if (!row.Especialidad || String(row.Especialidad).trim() === '') {
          resultado.errores.push(`Fila ${filaNum}: El campo "Especialidad" es requerido`)
          continue
        }

        // Crear objeto médico
        const matriculaProvincial = row['Mat. provinc'] ? String(row['Mat. provinc']).trim() : null
        const cuit = row.CUIT ? String(row.CUIT).trim() : null
        const matricula = matriculaProvincial || cuit || `TEMP-${Date.now()}-${i}`

        const medico: MedicoInsert = {
          nombre: String(row.Nombre).trim(),
          matricula: matricula,
          matricula_provincial: matriculaProvincial,
          cuit: cuit,
          grupo_persona: row['Grupo persona'] ? String(row['Grupo persona']).trim() : null,
          perfil: row.Perfil ? String(row.Perfil).trim() : null,
          es_residente: esResidente(row.Perfil),
          especialidad: String(row.Especialidad).trim(),
          activo: parseActivo(row.Activo)
        }

        resultado.medicos.push(medico)
      } catch (error: any) {
        resultado.errores.push(`Fila ${filaNum}: ${error.message || 'Error desconocido'}`)
      }
    }

    return resultado
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Error al leer el archivo Excel: ' + String(error))
  }
}

/**
 * Exporta un array de médicos a un archivo Excel
 */
export function exportMedicosToExcel(medicos: any[]): Blob {
  // Preparar datos para Excel
  const datos = medicos.map(medico => ({
    'Nombre': medico.nombre || '',
    'Mat. provinc': medico.matricula_provincial || medico.matricula || '',
    'CUIT': medico.cuit || '',
    'Especialidad': medico.especialidad || '',
    'Grupo persona': medico.grupo_persona || '',
    'Perfil': medico.perfil || '',
    'Activo': medico.activo ? 'Si' : 'No'
  }))

  // Crear workbook
  const worksheet = XLSX.utils.json_to_sheet(datos)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Médicos')

  // Generar archivo
  const excelBuffer = XLSX.write(workbook, { 
    type: 'array', 
    bookType: 'xlsx',
    cellStyles: true
  })

  return new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  })
}

