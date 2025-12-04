import { supabase } from './supabase/client'
import { ExcelData, ExcelRow } from './excel-reader'
import { Medico, DetalleGuardiaInsert, LiquidacionGuardiaInsert } from './types'
import { calcularNumeroLiquidacion } from './utils'

interface FilaExcluida {
  numeroFila: number
  razon: 'sin_fecha' | 'fecha_invalida' | 'duplicado'
  datos: ExcelRow
}

interface ProcesamientoResult {
  liquidacionId: string
  totalFilas: number
  procesadas: number
  errores: string[]
  advertencias: string[]
  filasExcluidas: FilaExcluida[]
}

// Valor fijo por admisión (según el prompt)
const ADMISSION_VALUE = 10000

/**
 * Normaliza el nombre de una columna para búsqueda flexible
 */
function normalizarColumna(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Busca un valor en una fila por variaciones del nombre de columna
 */
function buscarValor(row: ExcelRow, variaciones: string[]): any {
  const keys = Object.keys(row)
  
  if (keys.length === 0) return null
  
  // Buscar coincidencia exacta (case-insensitive)
  for (const variacion of variaciones) {
    for (const key of keys) {
      if (key.toLowerCase().trim() === variacion.toLowerCase().trim()) {
        const valor = row[key]
        if (valor !== undefined && valor !== null) {
          if (typeof valor === 'string' && valor.trim() !== '') return valor.trim()
          if (typeof valor !== 'string') return valor
        }
      }
    }
  }
  
  // Buscar coincidencia normalizada (sin acentos, espacios)
  const normalizadas = variaciones.map(normalizarColumna)
  for (const key of keys) {
    const keyNormalizada = normalizarColumna(key)
    if (normalizadas.includes(keyNormalizada)) {
      const valor = row[key]
      if (valor !== undefined && valor !== null) {
        if (typeof valor === 'string' && valor.trim() !== '') return valor.trim()
        if (typeof valor !== 'string') return valor
      }
    }
  }
  
  // Buscar coincidencia parcial (contiene palabras clave)
  for (const variacion of variaciones) {
    const palabras = normalizarColumna(variacion).split(/\s+/).filter(p => p.length > 2)
    if (palabras.length === 0) continue
    
    for (const key of keys) {
      const keyNormalizada = normalizarColumna(key)
      const todasPalabrasPresentes = palabras.every(p => keyNormalizada.includes(p))
      if (todasPalabrasPresentes) {
        const valor = row[key]
        if (valor !== undefined && valor !== null) {
          if (typeof valor === 'string' && valor.trim() !== '') return valor.trim()
          if (typeof valor !== 'string') return valor
        }
      }
    }
  }
  
  return null
}

/**
 * Normaliza un nombre para búsqueda (sin acentos, minúsculas, sin espacios extra)
 */
function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Busca un médico por nombre en la lista de médicos
 * Búsqueda muy flexible con múltiples estrategias
 */
function buscarMedico(nombre: string | null, medicos: Medico[]): Medico | null {
  if (!nombre || typeof nombre !== 'string') return null
  
  const nombreTrimmed = nombre.trim()
  if (nombreTrimmed === '') return null
  
  // ESTRATEGIA 0: Coincidencia exacta SIN normalizar (prioridad máxima)
  for (const medico of medicos) {
    if (medico.nombre.trim() === nombreTrimmed) {
      return medico
    }
  }
  
  const nombreNormalizado = normalizarNombre(nombre)
  if (nombreNormalizado === '') return null
  
  // Estrategia 1: Coincidencia exacta (después de normalizar)
  for (const medico of medicos) {
    const medicoNombreNormalizado = normalizarNombre(medico.nombre)
    if (medicoNombreNormalizado === nombreNormalizado) {
      return medico
    }
  }
  
  // Estrategia 2: Coincidencia exacta sin considerar orden
  const partesNombre = nombreNormalizado.split(',').map(p => p.trim())
  const palabrasNombre = nombreNormalizado.split(/\s+/).filter(p => p.length > 2)
  
  for (const medico of medicos) {
    const medicoNombreNormalizado = normalizarNombre(medico.nombre)
    const partesMedico = medicoNombreNormalizado.split(',').map(p => p.trim())
    const palabrasMedico = medicoNombreNormalizado.split(/\s+/).filter(p => p.length > 2)
    
    if (palabrasNombre.length > 0 && palabrasMedico.length > 0) {
      const palabrasNombreSet = new Set(palabrasNombre)
      const palabrasMedicoSet = new Set(palabrasMedico)
      
      if (palabrasNombreSet.size === palabrasMedicoSet.size &&
          Array.from(palabrasNombreSet).every(p => palabrasMedicoSet.has(p))) {
        return medico
      }
    }
  }
  
  // Estrategia 3: Buscar por apellido
  const apellidoNombre = partesNombre.length > 1 
    ? partesNombre[0].trim()
    : (palabrasNombre.length > 0 ? palabrasNombre[0] : nombreNormalizado)
  
  let mejorCoincidenciaApellido: Medico | null = null
  let mejorPuntuacionApellido = 0
  
  for (const medico of medicos) {
    const medicoNombreNormalizado = normalizarNombre(medico.nombre)
    const partesMedico = medicoNombreNormalizado.split(',').map(p => p.trim())
    const palabrasMedico = medicoNombreNormalizado.split(/\s+/).filter(p => p.length > 2)
    
    const apellidoMedico = partesMedico.length > 1
      ? partesMedico[0].trim()
      : (palabrasMedico.length > 0 ? palabrasMedico[0] : medicoNombreNormalizado)
    
    if (apellidoNombre === apellidoMedico && apellidoNombre.length > 2) {
      const palabrasCoincidentes = palabrasNombre.filter(p => 
        palabrasMedico.some(m => m === p || m.includes(p) || p.includes(m))
      ).length
      
      if (palabrasCoincidentes > mejorPuntuacionApellido) {
        mejorPuntuacionApellido = palabrasCoincidentes
        mejorCoincidenciaApellido = medico
      }
    }
  }
  
  if (mejorCoincidenciaApellido && mejorPuntuacionApellido > 0) {
    return mejorCoincidenciaApellido
  }
  
  // Estrategia 4: Buscar por todas las palabras importantes
  if (palabrasNombre.length > 0) {
    for (const medico of medicos) {
      const medicoNombreNormalizado = normalizarNombre(medico.nombre)
      const palabrasMedico = medicoNombreNormalizado.split(/\s+/).filter(p => p.length > 2)
      
      if (palabrasNombre.every(p => medicoNombreNormalizado.includes(p))) {
        return medico
      }
      
      if (palabrasMedico.length > 0 && palabrasMedico.every(p => nombreNormalizado.includes(p))) {
        return medico
      }
    }
  }
  
  // Estrategia 5: Búsqueda por similitud (al menos 2 palabras coinciden)
  if (palabrasNombre.length >= 2) {
    let mejorCoincidencia: Medico | null = null
    let mejorPuntuacion = 0
    
    for (const medico of medicos) {
      const medicoNombreNormalizado = normalizarNombre(medico.nombre)
      const palabrasMedico = medicoNombreNormalizado.split(/\s+/).filter(p => p.length > 2)
      
      const palabrasCoincidentes = palabrasNombre.filter(p => 
        palabrasMedico.some(m => m.includes(p) || p.includes(m))
      ).length
      
      if (palabrasCoincidentes >= 2 && palabrasCoincidentes > mejorPuntuacion) {
        mejorPuntuacion = palabrasCoincidentes
        mejorCoincidencia = medico
      }
    }
    
    if (mejorCoincidencia) {
      return mejorCoincidencia
    }
  }
  
  return null
}

/**
 * Convierte una fecha en múltiples formatos a ISO (YYYY-MM-DD)
 */
function convertirFechaISO(fecha: string | number | null | undefined): string | null {
  if (fecha === null || fecha === undefined) return null
  
  // Si es un número, puede ser un serial de Excel
  if (typeof fecha === 'number') {
    const excelEpoch = new Date(1899, 11, 30)
    const dateObj = new Date(excelEpoch.getTime() + fecha * 24 * 60 * 60 * 1000)
    
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    return null
  }
  
  const fechaStr = String(fecha).trim()
  if (fechaStr === '') return null
  
  // Intentar formato YYYY-MM-DD (ya está en ISO)
  const matchISO = fechaStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (matchISO) {
    const anio = matchISO[1]
    const mes = matchISO[2].padStart(2, '0')
    const dia = matchISO[3].padStart(2, '0')
    return `${anio}-${mes}-${dia}`
  }
  
  // Intentar formato DD/MM/YYYY
  const matchDDMMYYYY = fechaStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (matchDDMMYYYY) {
    const dia = matchDDMMYYYY[1].padStart(2, '0')
    const mes = matchDDMMYYYY[2].padStart(2, '0')
    const anio = matchDDMMYYYY[3]
    return `${anio}-${mes}-${dia}`
  }
  
  // Intentar parsear como Date object
  try {
    const dateObj = new Date(fechaStr)
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  } catch {
    // Ignorar error
  }
  
  return null
}

/**
 * Procesa un Excel de Admisiones Clínicas y lo guarda en la base de datos
 */
export async function procesarExcelAdmisiones(
  excelData: ExcelData,
  mes: number,
  anio: number,
  archivoNombre: string
): Promise<ProcesamientoResult> {
  const resultado: ProcesamientoResult = {
    liquidacionId: '',
    totalFilas: 0,
    procesadas: 0,
    errores: [],
    advertencias: [],
    filasExcluidas: []
  }

  try {
    // 1. Cargar TODOS los médicos
    const { data: medicosData, error: errorMedicos } = await supabase
      .from('medicos')
      .select('*') as { data: Medico[] | null; error: any }

    if (errorMedicos) {
      resultado.errores.push(`Error cargando médicos: ${errorMedicos.message}`)
      return resultado
    }

    const medicos = medicosData || []
    
    console.log(`[Admisiones] Médicos cargados: ${medicos.length}`)

    // 2. Crear o obtener liquidación
    const numeroLiquidacion = calcularNumeroLiquidacion(mes, anio)
    
    // Verificar si ya existe
    const { data: liquidacionExistente } = await supabase
      .from('liquidaciones_guardia')
      .select('id')
      .eq('especialidad', 'Admisiones Clínicas')
      .eq('mes', mes)
      .eq('anio', anio)
      .single()

    let liquidacionId: string

    if (liquidacionExistente && (liquidacionExistente as any).id) {
      // Ya existe, usar la existente
      liquidacionId = (liquidacionExistente as any).id
      
      // Eliminar detalles existentes
      await supabase
        .from('detalle_guardia')
        .delete()
        .eq('liquidacion_id', liquidacionId)
    } else {
      // Crear nueva liquidación
      const nuevaLiquidacion: LiquidacionGuardiaInsert = {
        mes,
        anio,
        especialidad: 'Admisiones Clínicas',
        estado: 'borrador',
        total_consultas: 0,
        total_bruto: 0,
        total_retenciones: 0,
        total_adicionales: 0,
        total_neto: 0,
        archivo_nombre: archivoNombre,
        numero_liquidacion: numeroLiquidacion
      }

      const { data: liquidacionCreada, error: errorLiquidacion } = await supabase
        .from('liquidaciones_guardia')
        // @ts-ignore
        .insert(nuevaLiquidacion)
        .select('id')
        .single()

      if (errorLiquidacion) {
        resultado.errores.push(`Error creando liquidación: ${errorLiquidacion.message}`)
        return resultado
      }

      if (!liquidacionCreada || !(liquidacionCreada as any).id) {
        resultado.errores.push(`Error: No se pudo crear la liquidación`)
        return resultado
      }

      liquidacionId = (liquidacionCreada as any).id
    }

    resultado.liquidacionId = liquidacionId

    // 3. Extraer todos los nombres únicos de "Responsable" del Excel
    const nombresUnicos = new Set<string>()
    const nombresOriginales = new Map<string, string>()
    
    console.log(`Extrayendo nombres únicos de ${excelData.rows.length} filas del Excel`)
    
    for (const row of excelData.rows) {
      const medicoNombre = buscarValor(row, [
        'Responsable', 'responsable', 'RESPONSABLE',
        'Responsable de admisión', 'Responsable de Admisión',
        'Médico', 'medico', 'MEDICO', 'Medico',
        'Profesional', 'profesional', 'PROFESIONAL',
        'Médico responsable', 'Médico Responsable', 'Medico Responsable',
        'MÉDICO RESPONSABLE'
      ])
      
      if (medicoNombre && typeof medicoNombre === 'string' && medicoNombre.trim() !== '') {
        const nombreNormalizado = normalizarNombre(medicoNombre.trim())
        if (nombreNormalizado !== '') {
          nombresUnicos.add(nombreNormalizado)
          if (!nombresOriginales.has(nombreNormalizado)) {
            nombresOriginales.set(nombreNormalizado, medicoNombre.trim())
          }
        }
      }
    }
    
    console.log(`[Mapeo] Nombres únicos encontrados en Excel: ${nombresUnicos.size}`)
    
    // 4. Buscar cada nombre único en la BD y crear mapa
    const mapaNombresMedicos = new Map<string, Medico>()
    
    for (const nombreNormalizado of nombresUnicos) {
      const medico = buscarMedico(nombresOriginales.get(nombreNormalizado) || nombreNormalizado, medicos)
      if (medico) {
        mapaNombresMedicos.set(nombreNormalizado, medico)
      }
    }
    
    const nombresEncontrados = Array.from(mapaNombresMedicos.keys())
    const nombresNoEncontrados = Array.from(nombresUnicos).filter(n => !mapaNombresMedicos.has(n))
    
    console.log(`[Mapeo] Médicos encontrados: ${nombresEncontrados.length}/${nombresUnicos.size}`)
    
    if (nombresNoEncontrados.length > 0) {
      resultado.advertencias.push(`Médicos no encontrados en BD (${nombresNoEncontrados.length}): ${nombresNoEncontrados.slice(0, 5).map(n => nombresOriginales.get(n) || n).join(', ')}${nombresNoEncontrados.length > 5 ? '...' : ''}`)
    }
    
    // 5. Procesar cada fila del Excel aplicando deduplicación
    const detalles: DetalleGuardiaInsert[] = []
    resultado.totalFilas = excelData.rows.length

    if (excelData.rows.length === 0) {
      resultado.errores.push('El Excel no contiene filas de datos')
      return resultado
    }

    console.log(`Procesando ${excelData.rows.length} filas del Excel`)

    // Contadores para debugging
    let filasSinFecha = 0
    let filasFechaInvalida = 0
    let filasProcesadas = 0

    // NOTA: Los duplicados NO se eliminan automáticamente
    // Se guardan todos los registros y se marcan visualmente en color celeste en la UI

    for (let i = 0; i < excelData.rows.length; i++) {
      const row = excelData.rows[i]
      
      try {
        // Extraer datos de la fila
        const fechaStr = buscarValor(row, [
          'Fecha Visita', 'Fecha visita', 'FECHA VISITA',
          'Fecha', 'fecha', 'FECHA', 
          'Fecha de visita', 'Fecha de Visita',
          'Fecha de atención', 'Fecha Atención',
          'Fecha de la consulta', 'Fecha Consulta'
        ])
        const paciente = buscarValor(row, [
          'Paciente', 'paciente', 'PACIENTE', 
          'Nombre paciente', 'Nombre Paciente', 'Nombre del paciente',
          'NOMBRE PACIENTE'
        ])
        const medicoNombre = buscarValor(row, [
          'Responsable', 'responsable', 'RESPONSABLE',
          'Responsable de admisión', 'Responsable de Admisión',
          'Médico', 'medico', 'MEDICO', 'Medico',
          'Profesional', 'profesional', 'PROFESIONAL',
          'Médico responsable', 'Médico Responsable', 'Medico Responsable',
          'MÉDICO RESPONSABLE'
        ])
        
        // Convertir fecha
        let fecha: string | null = null
        
        if (fechaStr) {
          fecha = convertirFechaISO(fechaStr)
        }
        
        // Validar datos mínimos
        if (!fecha) {
          filasSinFecha++
          resultado.filasExcluidas.push({
            numeroFila: 11 + i, // Fila 11 + índice (porque empezamos desde fila 11)
            razon: 'sin_fecha',
            datos: row
          })
          continue
        }

        // Validar que la fecha sea razonable (entre 2020 y 2100)
        const fechaAnio = parseInt(fecha.split('-')[0])
        if (fechaAnio < 2020 || fechaAnio > 2100) {
          filasFechaInvalida++
          resultado.filasExcluidas.push({
            numeroFila: 11 + i,
            razon: 'fecha_invalida',
            datos: row
          })
          resultado.advertencias.push(`Fila ${11 + i}: Fecha fuera de rango (${fecha}), se omite`)
          continue
        }

        // Normalizar valores
        const pacienteNormalizado = (paciente || '').trim().toLowerCase()
        const medicoNombreNormalizado = medicoNombre ? normalizarNombre(medicoNombre.trim()) : ''
        
        // NOTA: Los duplicados (mismo paciente + misma fecha) se guardan todos
        // Se marcan visualmente en color celeste en la UI para revisión manual
        
        // Buscar médico en el mapa
        let medico: Medico | null = null
        if (medicoNombre && typeof medicoNombre === 'string' && medicoNombre.trim() !== '') {
          const nombreNormalizado = normalizarNombre(medicoNombre.trim())
          medico = mapaNombresMedicos.get(nombreNormalizado) || null
        }
        
        const esResidente = medico ? (medico.matricula_provincial === null) : false

        // Valor fijo por admisión
        const montoFacturado = ADMISSION_VALUE
        const importeCalculado = ADMISSION_VALUE

        // Crear detalle
        const detalle: DetalleGuardiaInsert = {
          liquidacion_id: liquidacionId,
          medico_id: medico?.id || null,
          fecha,
          hora: null, // Admisiones no tienen hora
          paciente: paciente || null,
          obra_social: null, // Admisiones no tienen obra social
          medico_nombre: medicoNombre || medico?.nombre || 'Desconocido',
          medico_matricula: medico?.matricula_provincial || null,
          medico_es_residente: esResidente,
          monto_facturado: montoFacturado,
          porcentaje_retencion: null, // Admisiones no tienen retención
          monto_retencion: null,
          monto_adicional: 0,
          importe_calculado: importeCalculado,
          aplica_adicional: false,
          es_horario_formativo: false, // Admisiones no tienen horario formativo
          estado_revision: 'pendiente',
          fila_excel: 11 + i // Fila real en el Excel (fila 11 + índice)
        }

        detalles.push(detalle)
        filasProcesadas++
        resultado.procesadas++

      } catch (error: any) {
        const errorMsg = error.message || 'Error desconocido'
        resultado.errores.push(`Fila ${11 + i}: ${errorMsg}`)
        console.error(`Error procesando fila ${11 + i}:`, error)
      }
    }

    // Agregar resumen de advertencias al final
    console.log(`Resumen: ${filasProcesadas} procesadas, ${filasSinFecha} sin fecha, ${filasFechaInvalida} fecha inválida`)
    if (filasSinFecha > 0 || filasFechaInvalida > 0) {
      resultado.advertencias.push(`Total omitidas: ${filasSinFecha + filasFechaInvalida} (${filasSinFecha} sin fecha, ${filasFechaInvalida} fecha inválida)`)
    }

    // 6. Guardar detalles en la base de datos
    if (detalles.length === 0) {
      resultado.errores.push('No se procesó ninguna fila válida. Verifique que el Excel tenga fechas válidas.')
      return resultado
    }

    console.log(`Guardando ${detalles.length} detalles en la base de datos`)
    
    // Insertar en lotes de 100
    const batchSize = 100
    for (let i = 0; i < detalles.length; i += batchSize) {
      const batch = detalles.slice(i, i + batchSize)
      const { error: errorDetalles } = await supabase
        .from('detalle_guardia')
        // @ts-ignore
        .insert(batch)

      if (errorDetalles) {
        resultado.errores.push(`Error guardando detalles (lote ${Math.floor(i / batchSize) + 1}): ${errorDetalles.message}`)
        console.error('Error guardando detalles:', errorDetalles)
        return resultado
      }
    }

    // 7. Actualizar totales de la liquidación
    const totalConsultas = detalles.length
    const totalBruto = detalles.reduce((sum, d) => sum + (d.monto_facturado || 0), 0)
    const totalNeto = detalles.reduce((sum, d) => sum + (d.importe_calculado || 0), 0)

    const { error: errorUpdate } = await supabase
      .from('liquidaciones_guardia')
      // @ts-ignore
      .update({
        total_consultas: totalConsultas,
        total_bruto: totalBruto,
        total_neto: totalNeto,
        estado: 'finalizada'
      })
      .eq('id', liquidacionId)

    if (errorUpdate) {
      resultado.errores.push(`Error actualizando totales: ${errorUpdate.message}`)
    }

    // Guardar log simple de procesamiento
    const { guardarLogProcesamiento } = await import('./historial-logger')
    await guardarLogProcesamiento('Admisiones Clínicas', mes, anio, liquidacionId).catch(() => {})

  } catch (error: any) {
    resultado.errores.push(`Error general: ${error.message || 'Error desconocido'}`)
  }

  return resultado
}

