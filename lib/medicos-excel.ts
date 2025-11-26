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
 * Busca un valor en un objeto row por diferentes variaciones del nombre de columna
 */
function getValueByVariations(row: any, variations: string[]): any {
  for (const variation of variations) {
    // Buscar coincidencia exacta
    if (row[variation] !== undefined && row[variation] !== null) {
      return row[variation]
    }
    // Buscar coincidencia case-insensitive
    const keys = Object.keys(row)
    const foundKey = keys.find(key => key.toLowerCase().trim() === variation.toLowerCase().trim())
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      return row[foundKey]
    }
  }
  return null
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
    }) as any[]

    if (jsonData.length === 0) {
      throw new Error('El archivo Excel no contiene datos')
    }

    // Procesar cada fila
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i]
      const filaNum = i + 2 // +2 porque empieza en 0 y la fila 1 es el header

      try {
        // Obtener valores con mapeo flexible de columnas
        const nombre = getValueByVariations(row, ['Nombre', 'nombre', 'NOMBRE'])
        const matriculaProvincialRaw = getValueByVariations(row, [
          'Mat. provinc', 
          'Mat provinc', 
          'Mat. Provincial',
          'Matricula Provincial',
          'Matrícula Provincial',
          'Matricula',
          'Matrícula',
          'Mat. Provinc'
        ])
        const cuitRaw = getValueByVariations(row, ['CUIT', 'cuit', 'Cuit'])
        const especialidadRaw = getValueByVariations(row, ['Especialidad', 'especialidad', 'ESPECIALIDAD'])
        const grupoPersonaRaw = getValueByVariations(row, [
          'Grupo persona',
          'Grupo Persona',
          'Grupo de Persona',
          'Grupo',
          'grupo persona'
        ])
        const perfilRaw = getValueByVariations(row, ['Perfil', 'perfil', 'PERFIL'])
        const activoRaw = getValueByVariations(row, ['Activo', 'activo', 'ACTIVO', 'Estado', 'estado'])

        // Validar campos requeridos
        if (!nombre || String(nombre).trim() === '') {
          resultado.errores.push(`Fila ${filaNum}: El campo "Nombre" es requerido`)
          continue
        }

        if (!matriculaProvincialRaw && !cuitRaw) {
          resultado.errores.push(`Fila ${filaNum}: Debe tener al menos "Mat. provinc" o "CUIT"`)
          continue
        }

        if (!especialidadRaw || String(especialidadRaw).trim() === '') {
          resultado.errores.push(`Fila ${filaNum}: El campo "Especialidad" es requerido`)
          continue
        }

        // Procesar y validar valores
        const matriculaProvincial = matriculaProvincialRaw 
          ? String(matriculaProvincialRaw).trim().substring(0, 50) 
          : null
        const cuit = cuitRaw 
          ? String(cuitRaw).trim().replace(/[^0-9]/g, '').substring(0, 20) 
          : null
        const matricula = (matriculaProvincial || cuit || `TEMP-${Date.now()}-${i}`).substring(0, 50)
        
        // Truncar campos según límites de la BD
        const nombreFinal = String(nombre).trim().substring(0, 255)
        const especialidad = String(especialidadRaw).trim().substring(0, 200)
        const grupoPersona = grupoPersonaRaw 
          ? String(grupoPersonaRaw).trim().substring(0, 100) 
          : null
        const perfil = perfilRaw 
          ? String(perfilRaw).trim().substring(0, 100) 
          : null

        const medico: MedicoInsert = {
          nombre: nombreFinal,
          matricula: matricula,
          matricula_provincial: matriculaProvincial,
          cuit: cuit,
          grupo_persona: grupoPersona,
          perfil: perfil,
          es_residente: esResidente(perfil),
          especialidad: especialidad,
          activo: parseActivo(activoRaw)
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

