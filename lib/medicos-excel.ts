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
 * Normaliza un nombre de columna para comparación (elimina espacios extra, puntos, etc.)
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\./g, ' ') // Reemplazar puntos con espacios
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples
    .replace(/[^\w\s]/g, '') // Eliminar caracteres especiales excepto letras, números y espacios
    .trim()
}

/**
 * Busca un valor en un objeto row por diferentes variaciones del nombre de columna
 */
function getValueByVariations(row: any, variations: string[], debugHeaders?: string[]): any {
  const keys = Object.keys(row)
  
  // Primero intentar coincidencia exacta
  for (const variation of variations) {
    if (row[variation] !== undefined && row[variation] !== null && String(row[variation]).trim() !== '') {
      return row[variation]
    }
  }
  
  // Buscar coincidencia normalizada (sin puntos, espacios normalizados, case-insensitive)
  for (const variation of variations) {
    const normalizedVariation = normalizeColumnName(variation)
    const foundKey = keys.find(key => {
      const normalizedKey = normalizeColumnName(key)
      return normalizedKey === normalizedVariation
    })
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
      return row[foundKey]
    }
  }
  
  // Buscar coincidencia parcial (contiene las palabras clave importantes)
  for (const variation of variations) {
    const keywords = normalizeColumnName(variation)
      .split(/\s+/)
      .filter(k => k.length > 2 && k !== 'mat' && k !== 'prov') // Filtrar palabras muy cortas o comunes
    
    // Buscar una clave que contenga todas las palabras importantes
    const foundKey = keys.find(key => {
      const normalizedKey = normalizeColumnName(key)
      // Verificar que contenga todas las palabras clave importantes
      const hasAllKeywords = keywords.length === 0 || keywords.every(kw => normalizedKey.includes(kw))
      return hasAllKeywords
    })
    
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
      return row[foundKey]
    }
  }
  
  // Último intento: buscar cualquier clave que contenga "mat" y "prov" o "provincial"
  const matProvKeys = keys.filter(key => {
    const normalizedKey = normalizeColumnName(key)
    return (normalizedKey.includes('mat') || normalizedKey.includes('matricula')) && 
           (normalizedKey.includes('prov') || normalizedKey.includes('provincial'))
  })
  
  if (matProvKeys.length > 0) {
    const foundKey = matProvKeys[0]
    if (row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
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

    // Obtener los headers reales del Excel para debugging
    const realHeaders = jsonData.length > 0 ? Object.keys(jsonData[0]) : []
    
    // Si no hay datos pero hay headers, intentar leer la primera fila manualmente
    if (realHeaders.length === 0) {
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
      for (let col = 0; col <= Math.min(range.e.c, 20); col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
        const cell = worksheet[cellAddress]
        if (cell && cell.v) {
          realHeaders.push(String(cell.v))
        }
      }
    }

    // Log de headers encontrados para debugging (solo en desarrollo)
    if (typeof console !== 'undefined' && console.log) {
      console.log('Headers detectados en Excel:', realHeaders)
    }

    // Procesar cada fila
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i]
      const filaNum = i + 2 // +2 porque empieza en 0 y la fila 1 es el header

      try {
        // Obtener valores con mapeo flexible de columnas
        const nombre = getValueByVariations(row, ['Nombre', 'nombre', 'NOMBRE'], realHeaders)
        const matriculaProvincialRaw = getValueByVariations(row, [
          'Mat. Provincial',  // Prioridad: formato exacto del Excel
          'Mat Provincial',
          'Mat.Provincial',
          'MatProvincial',
          'Mat. provinc',
          'Mat provinc',
          'Mat. Provinc',
          'Mat Provinc',
          'Matricula Provincial',
          'Matrícula Provincial',
          'Matricula Prov',
          'Matrícula Prov',
          'Mat Prov',
          'Mat. Prov',
          'Matricula',
          'Matrícula',
          'Provincial'
        ], realHeaders)
        const cuitRaw = getValueByVariations(row, ['CUIT', 'cuit', 'Cuit'], realHeaders)
        const especialidadRaw = getValueByVariations(row, ['Especialidad', 'especialidad', 'ESPECIALIDAD'], realHeaders)
        const grupoPersonaRaw = getValueByVariations(row, [
          'Grupo persona',
          'Grupo Persona',
          'Grupo de Persona',
          'Grupo',
          'grupo persona',
          'GrupoPersona'
        ], realHeaders)
        const perfilRaw = getValueByVariations(row, ['Perfil', 'perfil', 'PERFIL'], realHeaders)
        const activoRaw = getValueByVariations(row, ['Activo', 'activo', 'ACTIVO', 'Estado', 'estado'], realHeaders)

        // Debug: Log detallado para la primera fila
        if (filaNum === 2) {
          if (typeof console !== 'undefined' && console.log) {
            console.log('=== DEBUG IMPORTACIÓN MÉDICOS ===')
            console.log('Headers encontrados en Excel:', realHeaders)
            console.log('Valor encontrado para matrícula provincial:', matriculaProvincialRaw)
            const possibleMatHeaders = realHeaders.filter(h => {
              const hNormalized = normalizeColumnName(h)
              return hNormalized.includes('mat') || hNormalized.includes('prov')
            })
            console.log('Headers normalizados que podrían ser matrícula:', possibleMatHeaders)
            if (possibleMatHeaders.length > 0) {
              console.log('Valores de esas columnas:', possibleMatHeaders.map(h => ({ header: h, value: row[h] })))
            }
            console.log('===================================')
          }
        }

        // Validar campos requeridos
        if (!nombre || String(nombre).trim() === '') {
          resultado.errores.push(`Fila ${filaNum}: El campo "Nombre" es requerido`)
          continue
        }

        if (!matriculaProvincialRaw && !cuitRaw) {
          // Si es la primera fila con error, incluir información de headers disponibles
          const headerInfo = filaNum === 2 
            ? ` (Headers encontrados: ${realHeaders.join(', ')})`
            : ''
          resultado.errores.push(`Fila ${filaNum}: Debe tener al menos "Mat. provinc" o "CUIT"${headerInfo}`)
          continue
        }
        
        // Si no encontramos matrícula provincial pero sí CUIT, usar CUIT como matrícula
        if (!matriculaProvincialRaw && cuitRaw) {
          // Esto está bien, usaremos el CUIT como matrícula
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

