import { supabase } from './supabase/client'
import { ExcelData, ExcelRow } from './excel-reader'
import { Medico, DetalleGuardiaInsert, LiquidacionGuardiaInsert, ValorConsultaObraSocial } from './types'
import { esResidenteHorarioFormativo, horaAMinutos } from './utils'
import { calcularNumeroLiquidacion } from './utils'

interface FilaExcluida {
  numeroFila: number
  razon: 'sin_fecha' | 'fecha_invalida'
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
  
  // Si no hay keys, retornar null
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
      // Verificar que todas las palabras importantes estén presentes
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
 * Busca un médico por nombre en la lista de médicos
 */
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
  // Si están escritos exactamente igual, encontrarlos inmediatamente
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
  
  // Estrategia 2: Coincidencia exacta sin considerar orden (si uno tiene coma y otro no)
  // Ejemplo: "García, Juan" vs "Juan García"
  const partesNombre = nombreNormalizado.split(',').map(p => p.trim())
  const palabrasNombre = nombreNormalizado.split(/\s+/).filter(p => p.length > 2)
  
  for (const medico of medicos) {
    const medicoNombreNormalizado = normalizarNombre(medico.nombre)
    const partesMedico = medicoNombreNormalizado.split(',').map(p => p.trim())
    const palabrasMedico = medicoNombreNormalizado.split(/\s+/).filter(p => p.length > 2)
    
    // Si ambos tienen las mismas palabras (sin importar orden)
    if (palabrasNombre.length > 0 && palabrasMedico.length > 0) {
      const palabrasNombreSet = new Set(palabrasNombre)
      const palabrasMedicoSet = new Set(palabrasMedico)
      
      if (palabrasNombreSet.size === palabrasMedicoSet.size &&
          Array.from(palabrasNombreSet).every(p => palabrasMedicoSet.has(p))) {
        return medico
      }
    }
  }
  
  // Estrategia 3: Buscar por apellido (primera parte antes de la coma o primera palabra)
  const apellidoNombre = partesNombre.length > 1 
    ? partesNombre[0].trim()
    : (palabrasNombre.length > 0 ? palabrasNombre[0] : nombreNormalizado)
  
  // Primero buscar coincidencia exacta de apellido
  let mejorCoincidenciaApellido: Medico | null = null
  let mejorPuntuacionApellido = 0
  
  for (const medico of medicos) {
    const medicoNombreNormalizado = normalizarNombre(medico.nombre)
    const partesMedico = medicoNombreNormalizado.split(',').map(p => p.trim())
    const palabrasMedico = medicoNombreNormalizado.split(/\s+/).filter(p => p.length > 2)
    
    const apellidoMedico = partesMedico.length > 1
      ? partesMedico[0].trim()
      : (palabrasMedico.length > 0 ? palabrasMedico[0] : medicoNombreNormalizado)
    
    // Coincidencia exacta de apellido (prioridad máxima)
    if (apellidoNombre === apellidoMedico && apellidoNombre.length > 2) {
      // Si hay coincidencia exacta, verificar si también coinciden más palabras
      const palabrasCoincidentes = palabrasNombre.filter(p => 
        palabrasMedico.some(m => m === p || m.includes(p) || p.includes(m))
      ).length
      
      if (palabrasCoincidentes > mejorPuntuacionApellido) {
        mejorPuntuacionApellido = palabrasCoincidentes
        mejorCoincidenciaApellido = medico
      }
    }
  }
  
  // Si encontramos coincidencia exacta de apellido con buena puntuación, retornarla
  if (mejorCoincidenciaApellido && mejorPuntuacionApellido > 0) {
    return mejorCoincidenciaApellido
  }
  
  // Si no, buscar coincidencia parcial de apellido
  for (const medico of medicos) {
    const medicoNombreNormalizado = normalizarNombre(medico.nombre)
    const partesMedico = medicoNombreNormalizado.split(',').map(p => p.trim())
    const palabrasMedico = medicoNombreNormalizado.split(/\s+/).filter(p => p.length > 2)
    
    const apellidoMedico = partesMedico.length > 1
      ? partesMedico[0].trim()
      : (palabrasMedico.length > 0 ? palabrasMedico[0] : medicoNombreNormalizado)
    
    // Coincidencia parcial de apellido (uno contiene al otro)
    if (apellidoNombre.length > 2 && apellidoMedico.length > 2) {
      if (apellidoNombre.includes(apellidoMedico) || apellidoMedico.includes(apellidoNombre)) {
        // Verificar también cuántas palabras coinciden
        const palabrasCoincidentes = palabrasNombre.filter(p => 
          palabrasMedico.some(m => m === p || m.includes(p) || p.includes(m))
        ).length
        
        if (palabrasCoincidentes >= mejorPuntuacionApellido) {
          mejorPuntuacionApellido = palabrasCoincidentes
          mejorCoincidenciaApellido = medico
        }
      }
    }
  }
  
  if (mejorCoincidenciaApellido) {
    return mejorCoincidenciaApellido
  }
  
  // Estrategia 4: Buscar por todas las palabras importantes (todas deben estar presentes)
  if (palabrasNombre.length > 0) {
    for (const medico of medicos) {
      const medicoNombreNormalizado = normalizarNombre(medico.nombre)
      const palabrasMedico = medicoNombreNormalizado.split(/\s+/).filter(p => p.length > 2)
      
      // Si todas las palabras del nombre están en el nombre del médico
      if (palabrasNombre.every(p => medicoNombreNormalizado.includes(p))) {
        return medico
      }
      
      // Si todas las palabras del médico están en el nombre
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
      
      // Contar cuántas palabras coinciden
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
function convertirFechaISO(fecha: string | null | undefined): string | null {
  if (!fecha) return null
  
  const fechaStr = String(fecha).trim()
  if (fechaStr === '') return null
  
  // Intentar formato DD/MM/YYYY
  const matchDDMMYYYY = fechaStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (matchDDMMYYYY) {
    const dia = matchDDMMYYYY[1].padStart(2, '0')
    const mes = matchDDMMYYYY[2].padStart(2, '0')
    const anio = matchDDMMYYYY[3]
    return `${anio}-${mes}-${dia}`
  }
  
  // Intentar formato YYYY-MM-DD (ya está en ISO)
  const matchISO = fechaStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (matchISO) {
    const anio = matchISO[1]
    const mes = matchISO[2].padStart(2, '0')
    const dia = matchISO[3].padStart(2, '0')
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
 * Convierte una hora a formato HH:MM:SS
 */
function convertirHora(hora: any): string | null {
  if (!hora) return null
  
  if (typeof hora === 'string') {
    // Ya es string, verificar formato
    const match = hora.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
    if (match) {
      const h = match[1].padStart(2, '0')
      const m = match[2].padStart(2, '0')
      const s = match[3] || '00'
      return `${h}:${m}:${s}`
    }
  } else if (typeof hora === 'number') {
    // Es un número (serial de Excel), convertir a tiempo
    const totalSegundos = Math.round(hora * 86400) // Excel almacena días como fracción
    const horas = Math.floor(totalSegundos / 3600)
    const minutos = Math.floor((totalSegundos % 3600) / 60)
    const segundos = totalSegundos % 60
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
  }
  
  return null
}

/**
 * Procesa un Excel de ginecología y lo guarda en la base de datos
 */
export async function procesarExcelGinecologia(
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
    // 1. Cargar TODOS los médicos (sin filtrar por especialidad)
    const { data: medicosData, error: errorMedicos } = await supabase
      .from('medicos')
      .select('*') as { data: Medico[] | null; error: any }

    if (errorMedicos) {
      resultado.errores.push(`Error cargando médicos: ${errorMedicos.message}`)
      return resultado
    }

    const medicos = medicosData || []
    
    // Log para debugging: mostrar cantidad de médicos cargados
    console.log(`[Ginecología] Médicos cargados: ${medicos.length}`)
    console.log(`[Ginecología] Residentes: ${medicos.filter(m => m.matricula_provincial === null).length}`)
    console.log(`[Ginecología] No residentes: ${medicos.filter(m => m.matricula_provincial !== null).length}`)
    console.log(`[Ginecología] Nombres de médicos:`, medicos.map(m => `${m.nombre} (${m.matricula_provincial === null ? 'RESIDENTE' : 'NO RESIDENTE'})`).slice(0, 10))

    // 2. Cargar valores de consultas ginecológicas
    const { data: valoresData } = await supabase
      .from('valores_consultas_obra_social')
      .select('*')
      .eq('tipo_consulta', 'CONSULTA GINECOLOGICA')
      .eq('mes', mes)
      .eq('anio', anio) as { data: ValorConsultaObraSocial[] | null }

    const valoresConsultas = valoresData || []
    const valoresPorObraSocial = new Map<string, number>()
    valoresConsultas.forEach(v => {
      valoresPorObraSocial.set(v.obra_social, v.valor)
    })

    // 3. Crear o obtener liquidación
    const numeroLiquidacion = calcularNumeroLiquidacion(mes, anio)
    
    // Verificar si ya existe
    const { data: liquidacionExistente } = await supabase
      .from('liquidaciones_guardia')
      .select('id')
      .eq('especialidad', 'Ginecología')
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
        especialidad: 'Ginecología',
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
        // @ts-ignore - La tabla no está en los tipos generados de Supabase aún
        .insert(nuevaLiquidacion)
        .select('id')
        .single()

      if (errorLiquidacion) {
        resultado.errores.push(`Error creando liquidación: ${errorLiquidacion.message || 'Error desconocido'}. Detalles: ${JSON.stringify(errorLiquidacion)}`)
        console.error('Error creando liquidación:', errorLiquidacion)
        return resultado
      }

      if (!liquidacionCreada || !(liquidacionCreada as any).id) {
        resultado.errores.push(`Error: No se pudo crear la liquidación. Respuesta: ${JSON.stringify(liquidacionCreada)}`)
        console.error('Liquidación no creada:', liquidacionCreada)
        return resultado
      }

      liquidacionId = (liquidacionCreada as any).id
    }

    resultado.liquidacionId = liquidacionId

    // 4. Extraer todos los nombres únicos de "Responsable" del Excel
    const nombresUnicos = new Set<string>()
    const nombresOriginales = new Map<string, string>() // nombre normalizado -> nombre original
    
    console.log(`Extrayendo nombres únicos de ${excelData.rows.length} filas del Excel`)
    
    for (const row of excelData.rows) {
      const medicoNombre = buscarValor(row, [
        'Responsable', 'responsable', 'RESPONSABLE',
        'Médico', 'medico', 'MEDICO', 'Medico',
        'Profesional', 'profesional', 'PROFESIONAL',
        'Médico responsable', 'Médico Responsable', 'Medico Responsable',
        'MÉDICO RESPONSABLE'
      ])
      
      if (medicoNombre && typeof medicoNombre === 'string' && medicoNombre.trim() !== '') {
        const nombreNormalizado = normalizarNombre(medicoNombre.trim())
        if (nombreNormalizado !== '') {
          nombresUnicos.add(nombreNormalizado)
          // Guardar el nombre original (el primero que encontramos)
          if (!nombresOriginales.has(nombreNormalizado)) {
            nombresOriginales.set(nombreNormalizado, medicoNombre.trim())
          }
        }
      }
    }
    
    console.log(`[Mapeo] Nombres únicos encontrados en Excel: ${nombresUnicos.size}`)
    console.log(`[Mapeo] Nombres únicos:`, Array.from(nombresUnicos).slice(0, 10))
    
    // 5. Buscar cada nombre único en la BD y crear mapa
    const mapaNombresMedicos = new Map<string, Medico>() // nombre normalizado -> médico
    
    for (const nombreNormalizado of nombresUnicos) {
      const medico = buscarMedico(nombresOriginales.get(nombreNormalizado) || nombreNormalizado, medicos)
      if (medico) {
        mapaNombresMedicos.set(nombreNormalizado, medico)
      }
    }
    
    // Logging detallado del mapeo
    const nombresEncontrados = Array.from(mapaNombresMedicos.keys())
    const nombresNoEncontrados = Array.from(nombresUnicos).filter(n => !mapaNombresMedicos.has(n))
    
    console.log(`[Mapeo] Médicos encontrados: ${nombresEncontrados.length}/${nombresUnicos.size}`)
    console.log(`[Mapeo] Médicos NO encontrados: ${nombresNoEncontrados.length}`)
    
    if (nombresEncontrados.length > 0) {
      console.log(`[Mapeo] Médicos encontrados:`)
      nombresEncontrados.forEach(nombreNorm => {
        const medico = mapaNombresMedicos.get(nombreNorm)!
        const nombreOriginal = nombresOriginales.get(nombreNorm) || nombreNorm
        console.log(`  - "${nombreOriginal}" -> "${medico.nombre}" (${medico.matricula_provincial === null ? 'RESIDENTE' : 'NO RESIDENTE'})`)
      })
    }
    
    if (nombresNoEncontrados.length > 0) {
      console.log(`[Mapeo] Médicos NO encontrados:`)
      nombresNoEncontrados.forEach(nombreNorm => {
        const nombreOriginal = nombresOriginales.get(nombreNorm) || nombreNorm
        console.log(`  - "${nombreOriginal}" (normalizado: "${nombreNorm}")`)
      })
      resultado.advertencias.push(`Médicos no encontrados en BD (${nombresNoEncontrados.length}): ${nombresNoEncontrados.slice(0, 5).map(n => nombresOriginales.get(n) || n).join(', ')}${nombresNoEncontrados.length > 5 ? '...' : ''}`)
    }
    
    // 6. Procesar cada fila del Excel usando el mapa
    const detalles: DetalleGuardiaInsert[] = []
    resultado.totalFilas = excelData.rows.length

    if (excelData.rows.length === 0) {
      resultado.errores.push('El Excel no contiene filas de datos')
      return resultado
    }

    console.log(`Procesando ${excelData.rows.length} filas del Excel`)
    console.log('Headers disponibles:', excelData.headers)

    // Contadores para debugging
    let filasSinFecha = 0
    let filasFechaInvalida = 0
    let filasProcesadas = 0

    for (let i = 0; i < excelData.rows.length; i++) {
      const row = excelData.rows[i]
      
      try {
        // Extraer datos de la fila - AUMENTAR VARIACIONES DE BÚSQUEDA
        const fechaStr = buscarValor(row, [
          'Fecha', 'fecha', 'FECHA', 
          'Fecha visita', 'Fecha Visita', 'Fecha de visita',
          'Fecha de Visita', 'Fecha De Visita',
          'Fecha de atención', 'Fecha Atención', 'Fecha de Atención',
          'Fecha de la consulta', 'Fecha Consulta', 'Fecha de Consulta',
          'FECHA VISITA', 'FECHA DE VISITA',
          'Fecha Visita', 'Fecha visita'
        ])
        const hora = buscarValor(row, [
          'Hora', 'hora', 'HORA', 
          'Horario', 'horario', 'HORARIO',
          'Hora inicio', 'Hora Inicio', 'Hora de inicio',
          'Hora de Inicio', 'HORA INICIO'
        ])
        const paciente = buscarValor(row, [
          'Paciente', 'paciente', 'PACIENTE', 
          'Nombre paciente', 'Nombre Paciente', 'Nombre del paciente',
          'NOMBRE PACIENTE'
        ])
        const obraSocial = buscarValor(row, [
          'Obra Social', 'obra social', 'Obra social', 
          'ObraSocial', 'Cliente', 'Obra', 
          'Obra Social / Cliente', 'Obra Social/Cliente',
          'OBRA SOCIAL', 'CLIENTE'
        ])
        const medicoNombre = buscarValor(row, [
          'Responsable', 'responsable', 'RESPONSABLE',
          'Médico', 'medico', 'MEDICO', 'Medico',
          'Profesional', 'profesional', 'PROFESIONAL',
          'Médico responsable', 'Médico Responsable', 'Medico Responsable',
          'MÉDICO RESPONSABLE'
        ])
        
        // MEJORAR: Intentar múltiples formatos de fecha
        let fecha: string | null = null
        
        if (fechaStr) {
          // Intentar formato DD/MM/YYYY
          fecha = convertirFechaISO(fechaStr)
          
          // Si falla, intentar otros formatos
          if (!fecha) {
            // Intentar formato YYYY-MM-DD
            const matchISO = String(fechaStr).match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
            if (matchISO) {
              fecha = fechaStr // Ya está en formato ISO
            } else {
              // Intentar parsear como Date object
              try {
                const dateObj = new Date(fechaStr)
                if (!isNaN(dateObj.getTime())) {
                  const year = dateObj.getFullYear()
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
                  const day = String(dateObj.getDate()).padStart(2, '0')
                  fecha = `${year}-${month}-${day}`
                }
              } catch {
                // Ignorar error
              }
            }
          }
        }
        
        // Validar datos mínimos - OMITIR FILAS SIN FECHA SIN ADVERTENCIA
        if (!fecha) {
          filasSinFecha++
          resultado.filasExcluidas.push({
            numeroFila: i + 1,
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
            numeroFila: i + 1,
            razon: 'fecha_invalida',
            datos: row
          })
          resultado.advertencias.push(`Fila ${i + 1}: Fecha fuera de rango (${fecha}), se omite`)
          continue
        }

        // Buscar médico en el mapa (ya pre-calculado)
        let medico: Medico | null = null
        if (medicoNombre && typeof medicoNombre === 'string' && medicoNombre.trim() !== '') {
          const nombreNormalizado = normalizarNombre(medicoNombre.trim())
          medico = mapaNombresMedicos.get(nombreNormalizado) || null
        }
        
        // Determinar si es residente: matricula_provincial IS NULL = residente
        const esResidente = medico ? (medico.matricula_provincial === null) : false

        // Si no se encuentra el médico, registrar advertencia pero continuar (solo una vez por nombre único)
        if (!medico && medicoNombre) {
          // Solo registrar advertencia si es la primera vez que vemos este nombre
          const nombreNormalizado = normalizarNombre(medicoNombre.trim())
          if (!mapaNombresMedicos.has(nombreNormalizado)) {
            // Ya se registró en el mapeo inicial, no duplicar
          }
        }

        // Obtener valor de consulta
        const obraSocialFinal = obraSocial || 'PARTICULARES' // Asignar 'PARTICULARES' automáticamente si no hay obra social
        
        // Buscar valor en el Map
        let valorUnitario = valoresPorObraSocial.get(obraSocialFinal) || 0
        
        // Si es PARTICULARES y no se encontró valor, buscar específicamente "PARTICULARES" en la BD
        if (valorUnitario === 0 && obraSocialFinal === 'PARTICULARES') {
          // Buscar valor para PARTICULARES en la BD
          const { data: valorParticular } = await supabase
            .from('valores_consultas_obra_social')
            .select('valor')
            .eq('obra_social', 'PARTICULARES')
            .eq('tipo_consulta', 'CONSULTA GINECOLOGICA')
            .eq('mes', mes)
            .eq('anio', anio)
            .single()
          
          if (valorParticular && (valorParticular as any).valor) {
            valorUnitario = (valorParticular as any).valor
            // Agregar al Map para futuras consultas
            valoresPorObraSocial.set('PARTICULARES', valorUnitario)
          }
        }
        
        // Solo registrar advertencia si NO es PARTICULARES y no tiene valor
        if (valorUnitario === 0 && obraSocialFinal !== 'PARTICULARES') {
          resultado.advertencias.push(`Fila ${i + 1}: No hay valor configurado para obra social: ${obraSocialFinal}`)
        }

        // Aplicar regla de residentes
        const horaFormato = convertirHora(hora)
        const esHorarioFormativo = esResidenteHorarioFormativo(fecha, horaFormato, esResidente)
        
        let montoFacturado = valorUnitario
        let importeCalculado = valorUnitario

        if (esHorarioFormativo) {
          // Residente en horario formativo: no se paga
          montoFacturado = 0
          importeCalculado = 0
        }

        // Crear detalle
        const detalle: DetalleGuardiaInsert = {
          liquidacion_id: liquidacionId,
          medico_id: medico?.id || null,
          fecha,
          hora: horaFormato,
          paciente: paciente || null,
          obra_social: obraSocialFinal, // Puede ser null si no hay obra social
          medico_nombre: medicoNombre || medico?.nombre || 'Desconocido',
          medico_matricula: medico?.matricula_provincial || null,
          medico_es_residente: esResidente,
          monto_facturado: montoFacturado,
          porcentaje_retencion: null, // Ginecología no tiene retención del 30%
          monto_retencion: null,
          monto_adicional: 0,
          importe_calculado: importeCalculado,
          aplica_adicional: false,
          es_horario_formativo: esHorarioFormativo,
          estado_revision: 'pendiente',
          fila_excel: i + 1
        }

        detalles.push(detalle)
        filasProcesadas++
        resultado.procesadas++

      } catch (error: any) {
        const errorMsg = error.message || 'Error desconocido'
        resultado.errores.push(`Fila ${i + 1}: ${errorMsg}`)
        console.error(`Error procesando fila ${i + 1}:`, error)
        console.error('Datos de la fila:', row)
      }
    }

    // Agregar resumen de advertencias al final
    console.log(`Resumen: ${filasProcesadas} procesadas, ${filasSinFecha} sin fecha, ${filasFechaInvalida} fecha inválida`)
    if (filasSinFecha > 0 || filasFechaInvalida > 0) {
      resultado.advertencias.push(`Total omitidas: ${filasSinFecha + filasFechaInvalida} (${filasSinFecha} sin fecha, ${filasFechaInvalida} fecha inválida)`)
    }

    // 5. Guardar detalles en la base de datos
    if (detalles.length === 0) {
      resultado.errores.push('No se procesó ninguna fila válida. Verifique que el Excel tenga fechas válidas.')
      return resultado
    }

    console.log(`Guardando ${detalles.length} detalles en la base de datos`)
    
    // Insertar en lotes de 100 para evitar problemas de tamaño
    const batchSize = 100
    for (let i = 0; i < detalles.length; i += batchSize) {
      const batch = detalles.slice(i, i + batchSize)
      const { error: errorDetalles } = await supabase
        .from('detalle_guardia')
        // @ts-ignore - La tabla no está en los tipos generados de Supabase aún
        .insert(batch)

      if (errorDetalles) {
        resultado.errores.push(`Error guardando detalles (lote ${Math.floor(i / batchSize) + 1}): ${errorDetalles.message}. Detalles: ${JSON.stringify(errorDetalles)}`)
        console.error('Error guardando detalles:', errorDetalles)
        console.error('Primer detalle del lote:', batch[0])
        return resultado
      }
    }

    // 6. Actualizar totales de la liquidación
    const totalConsultas = detalles.length
    const totalBruto = detalles.reduce((sum, d) => sum + (d.monto_facturado || 0), 0)
    const totalNeto = detalles.reduce((sum, d) => sum + (d.importe_calculado || 0), 0)

    const { error: errorUpdate } = await supabase
      .from('liquidaciones_guardia')
      // @ts-ignore - La tabla no está en los tipos generados de Supabase aún
      .update({
        total_consultas: totalConsultas,
        total_bruto: totalBruto,
        total_neto: totalNeto,
        estado: 'finalizada' // Estado inicial: finalizada (como estaba antes)
      })
      .eq('id', liquidacionId)

    if (errorUpdate) {
      resultado.errores.push(`Error actualizando totales: ${errorUpdate.message}`)
    }

  } catch (error: any) {
    resultado.errores.push(`Error general: ${error.message || 'Error desconocido'}`)
  }

  return resultado
}

