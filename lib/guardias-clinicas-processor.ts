import { supabase } from './supabase/client'
import { ExcelData, ExcelRow } from './excel-reader'
import { Medico, DetalleGuardiaInsert, LiquidacionGuardiaInsert, DetalleHorasGuardiaInsert } from './types'
import { calcularNumeroLiquidacion, esParticular } from './utils'

interface FilaExcluida {
  numeroFila: number
  razon: 'sin_fecha' | 'fecha_invalida' | 'duracion_cero' | 'sin_hora' | 'particular' | 'duplicado'
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

interface ConfiguracionGrupo {
  doctor_id: string
  group_type: 'GRUPO_70' | 'GRUPO_40'
}

interface ConfiguracionValores {
  value_hour_weekly_8_16: number      // Valor fijo por franja 8-16 días semana
  value_hour_weekly_16_8: number      // Valor fijo por franja 16-8 días semana
  value_hour_weekend: number          // Valor por hora fines de semana/feriados
  value_hour_weekend_night: number    // Valor por hora nocturna fines de semana/feriados
  value_guaranteed_min: number       // Valor mínimo POR HORA trabajada
}

interface HorasMedico {
  medico_id: string
  franjas_8_16: number                // Cantidad de franjas 8-16
  franjas_16_8: number                // Cantidad de franjas 16-8
  horas_weekend: number               // Horas fines de semana/feriados
  horas_weekend_night: number         // Horas nocturnas fines de semana/feriados
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
    const match = hora.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
    if (match) {
      const h = match[1].padStart(2, '0')
      const m = match[2].padStart(2, '0')
      const s = match[3] || '00'
      return `${h}:${m}:${s}`
    }
  } else if (typeof hora === 'number') {
    const totalSegundos = Math.round(hora * 86400)
    const horas = Math.floor(totalSegundos / 3600)
    const minutos = Math.floor((totalSegundos % 3600) / 60)
    const segundos = totalSegundos % 60
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
  }
  
  return null
}

/**
 * Procesa los archivos de Guardias Clínicas (consultas + horas) y los guarda en la base de datos
 */
export async function procesarExcelGuardiasClinicas(
  excelDataConsultas: ExcelData,
  excelDataHoras: ExcelData,
  mes: number,
  anio: number,
  archivoNombreConsultas: string,
  archivoNombreHoras: string
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
    console.log(`[Guardias Clínicas] Médicos cargados: ${medicos.length}`)

    // 2. Cargar configuración de grupos (70% o 40%)
    const { data: gruposData } = await supabase
      .from('clinical_groups_config')
      .select('*')
      .eq('mes', mes)
      .eq('anio', anio) as { data: ConfiguracionGrupo[] | null }

    const gruposPorMedico = new Map<string, 'GRUPO_70' | 'GRUPO_40'>()
    if (gruposData) {
      gruposData.forEach(g => {
        gruposPorMedico.set(g.doctor_id, g.group_type)
      })
    }

    // 3. Cargar configuración de valores (horas)
    const { data: valoresData } = await supabase
      .from('clinical_values_config')
      .select('*')
      .eq('mes', mes)
      .eq('anio', anio)
      .single() as { data: ConfiguracionValores | null }

    if (!valoresData) {
      resultado.errores.push(`No se encontró configuración de valores para ${mes}/${anio}. Configure los valores antes de procesar.`)
      return resultado
    }

    const valores: ConfiguracionValores = valoresData

    // 4. Crear o obtener liquidación
    const numeroLiquidacion = calcularNumeroLiquidacion(mes, anio)
    
    const { data: liquidacionExistente } = await supabase
      .from('liquidaciones_guardia')
      .select('id')
      .eq('especialidad', 'Guardias Clínicas')
      .eq('mes', mes)
      .eq('anio', anio)
      .single()

    let liquidacionId: string

    if (liquidacionExistente && (liquidacionExistente as any).id) {
      liquidacionId = (liquidacionExistente as any).id
      await supabase
        .from('detalle_guardia')
        .delete()
        .eq('liquidacion_id', liquidacionId)
    } else {
      const nuevaLiquidacion: LiquidacionGuardiaInsert = {
        mes,
        anio,
        especialidad: 'Guardias Clínicas',
        estado: 'borrador',
        total_consultas: 0,
        total_bruto: 0,
        total_retenciones: 0,
        total_adicionales: 0,
        total_neto: 0,
        archivo_nombre: `${archivoNombreConsultas} + ${archivoNombreHoras}`,
        numero_liquidacion: numeroLiquidacion
      }

      const { data: liquidacionCreada, error: errorLiquidacion } = await supabase
        .from('liquidaciones_guardia')
        // @ts-ignore - La tabla no está en los tipos generados de Supabase aún
        .insert([nuevaLiquidacion])
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

    // 5. Procesar archivo de CONSULTAS (igual que ginecología)
    console.log(`Procesando ${excelDataConsultas.rows.length} filas de consultas`)
    
    // Mapeo de nombres de médicos (igual que ginecología)
    const nombresUnicos = new Set<string>()
    const nombresOriginales = new Map<string, string>()
    
    for (const row of excelDataConsultas.rows) {
      const medicoNombre = buscarValor(row, [
        'Responsable', 'Médico', 'Medico', 'Profesional',
        'Médico responsable', 'Médico Responsable'
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
    
    const mapaNombresMedicos = new Map<string, Medico>()
    for (const nombreNormalizado of nombresUnicos) {
      const medico = buscarMedico(nombresOriginales.get(nombreNormalizado) || nombreNormalizado, medicos)
      if (medico) {
        mapaNombresMedicos.set(nombreNormalizado, medico)
      }
    }

    // Procesar consultas
    const detallesConsultas: DetalleGuardiaInsert[] = []
    const totalBrutoPorMedico = new Map<string, number>()
    
    // Detectar duplicados (mismo paciente/médico/hora)
    const duplicados = new Set<string>()
    
    for (let i = 0; i < excelDataConsultas.rows.length; i++) {
      const row = excelDataConsultas.rows[i]
      
      try {
        const fechaStr = buscarValor(row, [
          'Fecha', 'Fecha Visita', 'Fecha de visita', 'Fecha de atención'
        ])
        const hora = buscarValor(row, [
          'Hora', 'Horario', 'Hora inicio'
        ])
        const paciente = buscarValor(row, [
          'Paciente', 'Nombre paciente', 'Nombre del paciente'
        ])
        const obraSocial = buscarValor(row, [
          'Obra Social', 'obra social', 'ObraSocial', 'Cliente'
        ])
        const totalBruto = buscarValor(row, [
          'Total Bruto', 'Total', 'Importe', 'Monto', 'Monto Facturado'
        ])
        const duracion = buscarValor(row, [
          'Duración', 'Duracion', 'Tiempo', 'Minutos'
        ])
        const medicoNombre = buscarValor(row, [
          'Responsable', 'Médico', 'Medico', 'Profesional'
        ])

        // Validaciones pre-liquidación
        let fecha: string | null = null
        if (fechaStr) {
          fecha = convertirFechaISO(fechaStr)
        }
        
        if (!fecha) {
          resultado.filasExcluidas.push({
            numeroFila: i + 1,
            razon: 'sin_fecha',
            datos: row
          })
          continue
        }

        const fechaAnio = parseInt(fecha.split('-')[0])
        if (fechaAnio < 2020 || fechaAnio > 2100) {
          resultado.filasExcluidas.push({
            numeroFila: i + 1,
            razon: 'fecha_invalida',
            datos: row
          })
          continue
        }

        // Validar duración = 0 o sin hora
        const duracionNum = duracion ? (typeof duracion === 'number' ? duracion : parseFloat(String(duracion))) : null
        const horaFormato = convertirHora(hora)
        
        if (duracionNum === 0 || !horaFormato) {
          resultado.filasExcluidas.push({
            numeroFila: i + 1,
            razon: duracionNum === 0 ? 'duracion_cero' : 'sin_hora',
            datos: row
          })
          continue
        }

        // Validar PARTICULARES o SIN COBERTURA
        let obraSocialFinal = obraSocial ? obraSocial.trim() : ''
        if (esParticular(obraSocialFinal) || obraSocialFinal.toUpperCase().includes('SIN COBERTURA')) {
          resultado.filasExcluidas.push({
            numeroFila: i + 1,
            razon: 'particular',
            datos: row
          })
          continue
        }

        // Buscar médico
        let medico: Medico | null = null
        if (medicoNombre && typeof medicoNombre === 'string' && medicoNombre.trim() !== '') {
          const nombreNormalizado = normalizarNombre(medicoNombre.trim())
          medico = mapaNombresMedicos.get(nombreNormalizado) || null
        }

        if (!medico) {
          resultado.advertencias.push(`Fila ${i + 1}: Médico no encontrado: ${medicoNombre}`)
          continue
        }

        // Detectar duplicados
        const claveDuplicado = `${medico.id}|${fecha}|${horaFormato}|${paciente || ''}`
        if (duplicados.has(claveDuplicado)) {
          resultado.filasExcluidas.push({
            numeroFila: i + 1,
            razon: 'duplicado',
            datos: row
          })
          continue
        }
        duplicados.add(claveDuplicado)

        // Obtener total bruto
        const montoBruto = totalBruto 
          ? (typeof totalBruto === 'number' ? totalBruto : parseFloat(String(totalBruto))) 
          : 0

        // Acumular total bruto por médico
        const brutoActual = totalBrutoPorMedico.get(medico.id) || 0
        totalBrutoPorMedico.set(medico.id, brutoActual + montoBruto)

        // Crear detalle (se calculará el neto después)
        const detalle: DetalleGuardiaInsert = {
          liquidacion_id: liquidacionId,
          medico_id: medico.id,
          fecha,
          hora: horaFormato,
          paciente: paciente || null,
          obra_social: obraSocialFinal || null,
          medico_nombre: medico.nombre,
          medico_matricula: medico.matricula_provincial || null,
          medico_es_residente: medico.es_residente,
          monto_facturado: montoBruto,
          porcentaje_retencion: null,
          monto_retencion: null,
          monto_adicional: 0,
          importe_calculado: null,
          aplica_adicional: false,
          es_horario_formativo: false,
          estado_revision: 'pendiente',
          fila_excel: i + 1
        }

        detallesConsultas.push(detalle)
        resultado.procesadas++

      } catch (error: any) {
        resultado.errores.push(`Fila ${i + 1} (consultas): ${error.message}`)
      }
    }

    // 6. Procesar archivo de HORAS y guardar en BD
    console.log(`Procesando ${excelDataHoras.rows.length} filas de horas`)
    
    const detallesHoras: DetalleHorasGuardiaInsert[] = []
    const horasPorMedico = new Map<string, HorasMedico>()
    
    for (let i = 0; i < excelDataHoras.rows.length; i++) {
      const row = excelDataHoras.rows[i]
      
      try {
        const medicoNombre = buscarValor(row, [
          'Médico', 'Medico', 'Responsable', 'Profesional'
        ])
        
        // Buscar columnas de horas con variaciones: incluir nombres exactos del archivo
        const franjas816 = buscarValor(row, [
          'Horas semanales de 8 a 16 hs', 'Horas semanales de 8 a 16',
          '8 a 16', '8-16', '8a16', '8 a 12', '8-12',
          'Semanal 8 a 16', 'Semanal 8-16', 'Horas Semanal 8-16',
          '8a12/16a8', '8a12', '16a8'
        ])
        const franjas168 = buscarValor(row, [
          'Horas semanales de 16 a 8 hs', 'Horas semanales de 16 a 8',
          '16 a 8', '16-8', '16a8', '16 a 8',
          'Semanal 16 a 8', 'Semanal 16-8', 'Horas Semanal 16-8'
        ])
        const horasWeekend = buscarValor(row, [
          'Horas fin de semana / feriados', 'Horas fin de semana /',
          'Horas fin de semana', 'Fin de semana', 'Fin de Semana', 
          'Weekend', 'Finde', 'Horas Weekend'
        ])
        const horasWeekendNight = buscarValor(row, [
          'Horas nocturnas fin de semana /', 'Horas nocturnas fin de semana',
          'Noche finde', 'Noche Finde', 'Weekend Night', 'Finde Noche',
          'Horas noche finde', 'Horas nocturnas finde'
        ])

        if (!medicoNombre) continue

        // Buscar médico
        const medico = buscarMedico(medicoNombre, medicos)
        if (!medico) {
          resultado.advertencias.push(`Fila ${i + 1} (horas): Médico no encontrado: ${medicoNombre}`)
          continue
        }

        // Obtener valores (convertir a número)
        const f816 = franjas816 ? (typeof franjas816 === 'number' ? franjas816 : parseFloat(String(franjas816))) : 0
        const f168 = franjas168 ? (typeof franjas168 === 'number' ? franjas168 : parseFloat(String(franjas168))) : 0
        const hWeekend = horasWeekend ? (typeof horasWeekend === 'number' ? horasWeekend : parseFloat(String(horasWeekend))) : 0
        const hWeekendNight = horasWeekendNight ? (typeof horasWeekendNight === 'number' ? horasWeekendNight : parseFloat(String(horasWeekendNight))) : 0

        // Calcular valores (se actualizarán después con la configuración)
        const valorFranjas816 = f816 * valores.value_hour_weekly_8_16
        const valorFranjas168 = f168 * valores.value_hour_weekly_16_8
        const valorHorasWeekend = hWeekend * valores.value_hour_weekend
        const valorHorasWeekendNight = hWeekendNight * valores.value_hour_weekend_night
        
        // Total de horas trabajadas (para aplicar garantía mínima)
        const totalHorasTrabajadas = hWeekend + hWeekendNight
        let totalHoras = valorFranjas816 + valorFranjas168 + valorHorasWeekend + valorHorasWeekendNight
        
        // Aplicar garantía mínima POR HORA trabajada
        if (totalHorasTrabajadas > 0) {
          const valorPorHora = totalHoras / totalHorasTrabajadas
          if (valorPorHora < valores.value_guaranteed_min) {
            totalHoras = totalHorasTrabajadas * valores.value_guaranteed_min
          }
        }

        // Crear detalle de horas
        const detalleHora: DetalleHorasGuardiaInsert = {
          liquidacion_id: liquidacionId,
          medico_id: medico.id,
          medico_nombre: medico.nombre,
          medico_matricula: medico.matricula_provincial || null,
          medico_es_residente: medico.es_residente,
          franjas_8_16: f816,
          franjas_16_8: f168,
          horas_weekend: hWeekend,
          horas_weekend_night: hWeekendNight,
          valor_franjas_8_16: valorFranjas816,
          valor_franjas_16_8: valorFranjas168,
          valor_horas_weekend: valorHorasWeekend,
          valor_horas_weekend_night: valorHorasWeekendNight,
          total_horas: totalHoras,
          fila_excel: i + 1,
          estado_revision: 'pendiente'
        }

        detallesHoras.push(detalleHora)

        // Acumular horas por médico (para cálculo de totales)
        const horasActuales = horasPorMedico.get(medico.id) || {
          medico_id: medico.id,
          franjas_8_16: 0,
          franjas_16_8: 0,
          horas_weekend: 0,
          horas_weekend_night: 0
        }

        horasPorMedico.set(medico.id, {
          medico_id: medico.id,
          franjas_8_16: horasActuales.franjas_8_16 + f816,
          franjas_16_8: horasActuales.franjas_16_8 + f168,
          horas_weekend: horasActuales.horas_weekend + hWeekend,
          horas_weekend_night: horasActuales.horas_weekend_night + hWeekendNight
        })

        resultado.procesadas++

      } catch (error: any) {
        resultado.errores.push(`Fila ${i + 1} (horas): ${error.message}`)
      }
    }

    // Guardar detalles de horas en BD (batch insert)
    if (detallesHoras.length > 0) {
      const batchSize = 500
      for (let i = 0; i < detallesHoras.length; i += batchSize) {
        const batch = detallesHoras.slice(i, i + batchSize)
        const { error: errorHoras } = await supabase
          .from('detalle_horas_guardia')
          // @ts-ignore
          .insert(batch)
        
        if (errorHoras) {
          resultado.errores.push(`Error guardando horas (batch ${Math.floor(i / batchSize) + 1}): ${errorHoras.message}`)
        }
      }
    }

    // 7. Calcular importes finales por médico
    const totalesPorMedico = new Map<string, {
      netoConsultas: number
      totalHoras: number
      totalFinal: number
    }>()

    // Calcular neto de consultas por médico
    for (const [medicoId, totalBruto] of totalBrutoPorMedico.entries()) {
      const grupo = gruposPorMedico.get(medicoId)
      let netoConsultas = 0

      if (grupo === 'GRUPO_70') {
        netoConsultas = totalBruto * 0.70
      } else if (grupo === 'GRUPO_40') {
        netoConsultas = totalBruto * 0.40
      } else {
        resultado.advertencias.push(`Médico ${medicoId} no tiene grupo asignado, se asume 0%`)
      }

      totalesPorMedico.set(medicoId, {
        netoConsultas,
        totalHoras: 0,
        totalFinal: netoConsultas
      })
    }

    // Calcular total de horas por médico
    for (const [medicoId, horas] of horasPorMedico.entries()) {
      // Calcular valor de franjas (valores fijos)
      const valorFranjas816 = horas.franjas_8_16 * valores.value_hour_weekly_8_16
      const valorFranjas168 = horas.franjas_16_8 * valores.value_hour_weekly_16_8
      
      // Calcular valor de horas (valores por hora)
      const valorHorasWeekend = horas.horas_weekend * valores.value_hour_weekend
      const valorHorasWeekendNight = horas.horas_weekend_night * valores.value_hour_weekend_night
      
      // Total de horas trabajadas (para aplicar garantía mínima)
      const totalHorasTrabajadas = horas.horas_weekend + horas.horas_weekend_night
      
      // Valor base de horas
      let totalHoras = valorFranjas816 + valorFranjas168 + valorHorasWeekend + valorHorasWeekendNight
      
      // Aplicar garantía mínima POR HORA trabajada
      // Si el valor por hora es menor que el mínimo, ajustar
      if (totalHorasTrabajadas > 0) {
        const valorPorHora = totalHoras / totalHorasTrabajadas
        if (valorPorHora < valores.value_guaranteed_min) {
          // Recalcular con garantía mínima
          totalHoras = totalHorasTrabajadas * valores.value_guaranteed_min
        }
      }

      const totales = totalesPorMedico.get(medicoId) || {
        netoConsultas: 0,
        totalHoras: 0,
        totalFinal: 0
      }

      totales.totalHoras = totalHoras
      totales.totalFinal = totales.netoConsultas + totalHoras

      totalesPorMedico.set(medicoId, totales)
    }

    // 8. Actualizar detalles de consultas con importes calculados
    for (const detalle of detallesConsultas) {
      if (!detalle.medico_id) continue

      const grupo = gruposPorMedico.get(detalle.medico_id)
      const totalBruto = totalBrutoPorMedico.get(detalle.medico_id) || 0
      const totales = totalesPorMedico.get(detalle.medico_id)

      if (!totales) continue

      // Calcular porcentaje y monto según grupo
      if (grupo === 'GRUPO_70') {
        detalle.porcentaje_retencion = 30
        detalle.monto_retencion = detalle.monto_facturado ? detalle.monto_facturado * 0.30 : 0
        const proporcion = detalle.monto_facturado && totalBruto > 0 
          ? detalle.monto_facturado / totalBruto 
          : 0
        detalle.importe_calculado = totales.netoConsultas * proporcion
      } else if (grupo === 'GRUPO_40') {
        detalle.porcentaje_retencion = 60
        detalle.monto_retencion = detalle.monto_facturado ? detalle.monto_facturado * 0.60 : 0
        const proporcion = detalle.monto_facturado && totalBruto > 0 
          ? detalle.monto_facturado / totalBruto 
          : 0
        detalle.importe_calculado = totales.netoConsultas * proporcion
      }
    }

    // 9. Guardar detalles en la base de datos
    if (detallesConsultas.length === 0) {
      resultado.errores.push('No se procesó ninguna fila válida de consultas.')
      return resultado
    }

    console.log(`Guardando ${detallesConsultas.length} detalles en la base de datos`)
    
    const batchSize = 100
    for (let i = 0; i < detallesConsultas.length; i += batchSize) {
      const batch = detallesConsultas.slice(i, i + batchSize)
      const { error: errorDetalles } = await supabase
        .from('detalle_guardia')
        // @ts-ignore - La tabla no está en los tipos generados de Supabase aún
        .insert(batch)

      if (errorDetalles) {
        resultado.errores.push(`Error guardando detalles (lote ${Math.floor(i / batchSize) + 1}): ${errorDetalles.message}`)
        return resultado
      }
    }

    // 10. Actualizar totales de la liquidación
    const totalConsultas = detallesConsultas.length
    const totalBruto = Array.from(totalBrutoPorMedico.values()).reduce((sum, v) => sum + v, 0)
    const totalNeto = Array.from(totalesPorMedico.values()).reduce((sum, v) => sum + v.totalFinal, 0)
    const totalRetenciones = totalBruto - Array.from(totalesPorMedico.values()).reduce((sum, v) => sum + v.netoConsultas, 0)

    const { error: errorUpdate } = await supabase
      .from('liquidaciones_guardia')
      // @ts-ignore - La tabla no está en los tipos generados de Supabase aún
      .update({
        total_consultas: totalConsultas,
        total_bruto: totalBruto,
        total_retenciones: totalRetenciones,
        total_neto: totalNeto,
        estado: 'finalizada'
      })
      .eq('id', liquidacionId)

    if (errorUpdate) {
      resultado.errores.push(`Error actualizando totales: ${errorUpdate.message}`)
    }

    resultado.totalFilas = excelDataConsultas.rows.length + excelDataHoras.rows.length

  } catch (error: any) {
    resultado.errores.push(`Error general: ${error.message || 'Error desconocido'}`)
  }

  return resultado
}

