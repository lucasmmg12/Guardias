import { supabase } from './supabase/client'
import { ExcelData, ExcelRow } from './excel-reader'
import { Medico, DetalleGuardiaInsert, LiquidacionGuardiaInsert, ValorConsultaObraSocial, ConfiguracionAdicional } from './types'
import { calcularNumeroLiquidacion, esParticular } from './utils'

interface FilaExcluida {
  numeroFila: number
  razon: 'sin_fecha' | 'fecha_invalida' | 'sin_duracion' | 'duracion_cero' | 'no_pediatria' | 'duplicado'
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
 * Procesa un Excel de pediatría y lo guarda en la base de datos
 */
export async function procesarExcelPediatria(
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
    
    console.log(`[Pediatría] Médicos cargados: ${medicos.length}`)

    // 2. Cargar valores de consultas pediátricas
    const { data: valoresData } = await supabase
      .from('valores_consultas_obra_social')
      .select('*')
      .eq('tipo_consulta', 'CONSULTA PEDIATRICA Y NEONATAL')
      .eq('mes', mes)
      .eq('anio', anio) as { data: ValorConsultaObraSocial[] | null }

    const valoresConsultas = valoresData || []
    const valoresPorObraSocial = new Map<string, number>()
    valoresConsultas.forEach(v => {
      valoresPorObraSocial.set(v.obra_social, v.valor)
    })

    // 3. Cargar configuraciones de adicionales para pediatría
    const { data: adicionalesData } = await supabase
      .from('configuracion_adicionales')
      .select('*')
      .eq('especialidad', 'Pediatría')
      .eq('mes', mes)
      .eq('anio', anio) as { data: ConfiguracionAdicional[] | null }

    const adicionales = adicionalesData || []
    const adicionalesPorObraSocial = new Map<string, ConfiguracionAdicional>()
    adicionales.forEach(a => {
      if (a.aplica_adicional && a.monto_base_adicional && a.porcentaje_pago_medico) {
        // Calcular el monto que recibe el médico
        const montoCalculado = a.monto_base_adicional * (a.porcentaje_pago_medico / 100)
        adicionalesPorObraSocial.set(a.obra_social, {
          ...a,
          monto_adicional: montoCalculado
        })
      }
    })

    // 4. Crear o obtener liquidación
    const numeroLiquidacion = calcularNumeroLiquidacion(mes, anio)
    
    // Verificar si ya existe
    const { data: liquidacionExistente } = await supabase
      .from('liquidaciones_guardia')
      .select('id')
      .eq('especialidad', 'Pediatría')
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
        especialidad: 'Pediatría',
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

    // 5. Extraer todos los nombres únicos de "Responsable" del Excel
    const nombresUnicos = new Set<string>()
    const nombresOriginales = new Map<string, string>()
    
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
          if (!nombresOriginales.has(nombreNormalizado)) {
            nombresOriginales.set(nombreNormalizado, medicoNombre.trim())
          }
        }
      }
    }
    
    console.log(`[Mapeo] Nombres únicos encontrados en Excel: ${nombresUnicos.size}`)
    
    // 6. Buscar cada nombre único en la BD y crear mapa
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
    
    // 7. Procesar cada fila del Excel
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
    let filasSinDuracion = 0
    let filasDuracionCero = 0
    let filasNoPediatria = 0
    let filasDuplicadas = 0
    let filasProcesadas = 0

    // Set para detectar duplicados (mismo Paciente + Fecha/Hora + Médico)
    const duplicados = new Set<string>()

    for (let i = 0; i < excelData.rows.length; i++) {
      const row = excelData.rows[i]
      
      try {
        // Extraer datos de la fila
        const fechaStr = buscarValor(row, [
          'Fecha', 'fecha', 'FECHA', 
          'Fecha visita', 'Fecha Visita', 'Fecha de visita',
          'Fecha de Visita', 'Fecha De Visita',
          'Fecha Visit', 'Fecha visit',
          'Fecha de atención', 'Fecha Atención', 'Fecha de Atención',
          'Fecha de la consulta', 'Fecha Consulta', 'Fecha de Consulta',
          'FECHA VISITA', 'FECHA DE VISITA'
        ])
        const hora = buscarValor(row, [
          'Hora', 'hora', 'HORA', 
          'Horario', 'horario', 'HORARIO',
          'Hora inicio', 'Hora Inicio', 'Hora de inicio',
          'Hora de Inicio', 'HORA INICIO',
          'ora inicio', 'ora Inicio'
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
        const grupoAgenda = buscarValor(row, [
          'Grupo agenda', 'Grupo Agenda', 'grupo agenda',
          'GRUPO AGENDA', 'Grupo', 'grupo'
        ])
        const duracion = buscarValor(row, [
          'Duración', 'duración', 'DURACIÓN',
          'Duracion', 'duracion', 'DURACION',
          'Duración visita', 'Duración Visita'
        ])
        
        // FILTRO 1: Verificar que sea PEDIATRÍA
        if (!grupoAgenda || typeof grupoAgenda !== 'string' || !grupoAgenda.toLowerCase().includes('pediatría') && !grupoAgenda.toLowerCase().includes('pediatria')) {
          filasNoPediatria++
          resultado.filasExcluidas.push({
            numeroFila: i + 1,
            razon: 'no_pediatria',
            datos: row
          })
          continue
        }

        // FILTRO 2: Verificar duración
        let duracionNumero: number | null = null
        if (duracion === null || duracion === undefined || duracion === '') {
          filasSinDuracion++
          resultado.filasExcluidas.push({
            numeroFila: i + 1,
            razon: 'sin_duracion',
            datos: row
          })
          continue
        }
        
        if (typeof duracion === 'number') {
          duracionNumero = duracion
        } else if (typeof duracion === 'string') {
          const duracionParsed = parseFloat(duracion.trim())
          if (isNaN(duracionParsed)) {
            filasSinDuracion++
            resultado.filasExcluidas.push({
              numeroFila: i + 1,
              razon: 'sin_duracion',
              datos: row
            })
            continue
          }
          duracionNumero = duracionParsed
        }
        
        if (duracionNumero === 0 || duracionNumero === null) {
          filasDuracionCero++
          resultado.filasExcluidas.push({
            numeroFila: i + 1,
            razon: 'duracion_cero',
            datos: row
          })
          continue
        }
        
        // Convertir fecha
        let fecha: string | null = null
        
        if (fechaStr) {
          fecha = convertirFechaISO(fechaStr)
        }
        
        // Validar datos mínimos
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

        // FILTRO 3: Detectar duplicados (mismo Paciente + Fecha/Hora + Médico)
        const horaFormato = convertirHora(hora)
        const firmaDuplicado = `${paciente || ''}|${fecha}|${horaFormato || ''}|${medicoNombre || ''}`
        if (duplicados.has(firmaDuplicado)) {
          filasDuplicadas++
          resultado.filasExcluidas.push({
            numeroFila: i + 1,
            razon: 'duplicado',
            datos: row
          })
          continue
        }
        duplicados.add(firmaDuplicado)

        // Buscar médico en el mapa
        let medico: Medico | null = null
        if (medicoNombre && typeof medicoNombre === 'string' && medicoNombre.trim() !== '') {
          const nombreNormalizado = normalizarNombre(medicoNombre.trim())
          medico = mapaNombresMedicos.get(nombreNormalizado) || null
        }
        
        const esResidente = medico ? (medico.matricula_provincial === null) : false

        // Obtener valor de consulta
        // Si está vacío o es un nombre de persona, asignar '042 - PARTICULARES'
        let obraSocialFinal: string
        if (!obraSocial || obraSocial.trim() === '') {
          obraSocialFinal = '042 - PARTICULARES'
        } else if (esParticular(obraSocial)) {
          // Si es un nombre de persona, también asignar '042 - PARTICULARES'
          obraSocialFinal = '042 - PARTICULARES'
        } else {
          obraSocialFinal = obraSocial.trim()
        }
        
        // Buscar valor en el Map
        let valorUnitario = valoresPorObraSocial.get(obraSocialFinal) || 0
        
        // Si es PARTICULARES (o 042 - PARTICULARES) y no se encontró valor, buscar en la BD
        if (valorUnitario === 0 && (obraSocialFinal === 'PARTICULARES' || obraSocialFinal === '042 - PARTICULARES')) {
          // Buscar valor para PARTICULARES en la BD
          const { data: valorParticular } = await supabase
            .from('valores_consultas_obra_social')
            .select('valor')
            .eq('obra_social', 'PARTICULARES')
            .eq('tipo_consulta', 'CONSULTA PEDIATRICA Y NEONATAL')
            .eq('mes', mes)
            .eq('anio', anio)
            .single()
          
          if (valorParticular && (valorParticular as any).valor) {
            valorUnitario = (valorParticular as any).valor
            valoresPorObraSocial.set('PARTICULARES', valorUnitario)
            valoresPorObraSocial.set('042 - PARTICULARES', valorUnitario)
          } else {
            // Intentar también con "042 - PARTICULARES"
            const { data: valorParticular042 } = await supabase
              .from('valores_consultas_obra_social')
              .select('valor')
              .eq('obra_social', '042 - PARTICULARES')
              .eq('tipo_consulta', 'CONSULTA PEDIATRICA Y NEONATAL')
              .eq('mes', mes)
              .eq('anio', anio)
              .single()
            
            if (valorParticular042 && (valorParticular042 as any).valor) {
              valorUnitario = (valorParticular042 as any).valor
              valoresPorObraSocial.set('PARTICULARES', valorUnitario)
              valoresPorObraSocial.set('042 - PARTICULARES', valorUnitario)
            }
          }
        }
        
        // Solo registrar advertencia si NO es PARTICULARES y no tiene valor
        if (valorUnitario === 0 && obraSocialFinal !== 'PARTICULARES' && obraSocialFinal !== '042 - PARTICULARES') {
          resultado.advertencias.push(`Fila ${i + 1}: No hay valor configurado para obra social: ${obraSocialFinal}`)
        }

        // Calcular montos
        const montoFacturado = valorUnitario
        
        // Aplicar retención del 30%
        const porcentajeRetencion = 30
        const montoRetencion = montoFacturado * (porcentajeRetencion / 100)
        const montoNeto = montoFacturado - montoRetencion

        // Buscar adicional para esta obra social
        let montoAdicional = 0
        let aplicaAdicional = false
        
        // Buscar en el mapa de adicionales (usar búsqueda flexible por nombre de obra social)
        for (const [obraSocialKey, adicional] of adicionalesPorObraSocial.entries()) {
          // Verificar si la obra social del Excel contiene el nombre de la obra social del adicional
          if (obraSocialFinal.toLowerCase().includes(obraSocialKey.toLowerCase()) || 
              obraSocialKey.toLowerCase().includes(obraSocialFinal.toLowerCase())) {
            montoAdicional = adicional.monto_adicional || 0
            aplicaAdicional = true
            break
          }
        }

        // Calcular importe final
        const importeCalculado = montoNeto + montoAdicional

        // Crear detalle
        const detalle: DetalleGuardiaInsert = {
          liquidacion_id: liquidacionId,
          medico_id: medico?.id || null,
          fecha,
          hora: horaFormato,
          paciente: paciente || null,
          obra_social: obraSocialFinal,
          medico_nombre: medicoNombre || medico?.nombre || 'Desconocido',
          medico_matricula: medico?.matricula_provincial || null,
          medico_es_residente: esResidente,
          monto_facturado: montoFacturado,
          porcentaje_retencion: porcentajeRetencion,
          monto_retencion: montoRetencion,
          monto_adicional: montoAdicional,
          importe_calculado: importeCalculado,
          aplica_adicional: aplicaAdicional,
          es_horario_formativo: false, // Pediatría no tiene horario formativo
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
    console.log(`Resumen: ${filasProcesadas} procesadas, ${filasSinFecha} sin fecha, ${filasFechaInvalida} fecha inválida, ${filasSinDuracion} sin duración, ${filasDuracionCero} duración cero, ${filasNoPediatria} no pediatría, ${filasDuplicadas} duplicadas`)
    if (filasSinFecha > 0 || filasFechaInvalida > 0 || filasSinDuracion > 0 || filasDuracionCero > 0 || filasNoPediatria > 0 || filasDuplicadas > 0) {
      resultado.advertencias.push(`Total omitidas: ${filasSinFecha + filasFechaInvalida + filasSinDuracion + filasDuracionCero + filasNoPediatria + filasDuplicadas} (${filasSinFecha} sin fecha, ${filasFechaInvalida} fecha inválida, ${filasSinDuracion} sin duración, ${filasDuracionCero} duración cero, ${filasNoPediatria} no pediatría, ${filasDuplicadas} duplicadas)`)
    }

    // 8. Guardar detalles en la base de datos
    if (detalles.length === 0) {
      resultado.errores.push('No se procesó ninguna fila válida. Verifique que el Excel tenga filas de pediatría con duración > 0.')
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

    // 9. Actualizar totales de la liquidación
    const totalConsultas = detalles.length
    const totalBruto = detalles.reduce((sum, d) => sum + (d.monto_facturado || 0), 0)
    const totalRetenciones = detalles.reduce((sum, d) => sum + (d.monto_retencion || 0), 0)
    const totalAdicionales = detalles.reduce((sum, d) => sum + (d.monto_adicional || 0), 0)
    const totalNeto = detalles.reduce((sum, d) => sum + (d.importe_calculado || 0), 0)

    const { error: errorUpdate } = await supabase
      .from('liquidaciones_guardia')
      // @ts-ignore - La tabla no está en los tipos generados de Supabase aún
      .update({
        total_consultas: totalConsultas,
        total_bruto: totalBruto,
        total_retenciones: totalRetenciones,
        total_adicionales: totalAdicionales,
        total_neto: totalNeto,
        estado: 'finalizada'
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

