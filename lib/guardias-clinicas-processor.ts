import { supabase } from './supabase/client'
import { ExcelData, ExcelRow } from './excel-reader'
import { Medico, DetalleGuardiaInsert, LiquidacionGuardiaInsert, ValorConsultaObraSocial } from './types'
import { calcularNumeroLiquidacion, esParticular, extraerCodigoObraSocial, coincidenObrasSociales } from './utils'

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
  group_type: 'GRUPO_70' | 'GRUPO_50'
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

  // Crear mapa de claves normalizadas
  const keyMap = new Map<string, string>()
  for (const key of keys) {
    keyMap.set(normalizarColumna(key), key)
  }

  // Buscar por variaciones normalizadas
  for (const variacion of variaciones) {
    const variacionNorm = normalizarColumna(variacion)

    // Coincidencia exacta normalizada
    if (keyMap.has(variacionNorm)) {
      return row[keyMap.get(variacionNorm)!]
    }
  }

  // Buscar por coincidencia parcial (contiene)
  for (const variacion of variaciones) {
    const variacionNorm = normalizarColumna(variacion)

    for (const [keyNorm, originalKey] of keyMap.entries()) {
      if (keyNorm.includes(variacionNorm) || variacionNorm.includes(keyNorm)) {
        return row[originalKey]
      }
    }
  }

  // Buscar por palabras clave principales
  for (const variacion of variaciones) {
    const palabrasClave = normalizarColumna(variacion).split(/\s+/)

    for (const [keyNorm, originalKey] of keyMap.entries()) {
      // Si todas las palabras de la variación están en la key
      const todasPresentes = palabrasClave
        .filter(p => p.length > 2) // Solo palabras de más de 2 caracteres
        .every(palabra => keyNorm.includes(palabra))

      if (todasPresentes && palabrasClave.filter(p => p.length > 2).length > 0) {
        return row[originalKey]
      }
    }
  }

  // Último recurso: coincidencia por posición (para columnas sin nombre)
  // Buscar por índice numérico si las columnas son numéricas
  for (const key of keys) {
    const keyNorm = normalizarColumna(key)
    for (const variacion of variaciones) {
      const variacionNorm = normalizarColumna(variacion)
      // Si la key es un número y la variación contiene ese número
      if (/^\d+$/.test(key) && variacionNorm.includes(key)) {
        return row[key]
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
  if (!nombre || nombre.trim() === '') return null

  const nombreBusqueda = normalizarNombre(nombre)

  // 1. Coincidencia exacta
  const exacto = medicos.find(m => normalizarNombre(m.nombre) === nombreBusqueda)
  if (exacto) return exacto

  // 2. Coincidencia parcial fuerte (contiene en ambas direcciones)
  const parcial = medicos.find(m => {
    const mNorm = normalizarNombre(m.nombre)
    return mNorm.includes(nombreBusqueda) || nombreBusqueda.includes(mNorm)
  })
  if (parcial) return parcial

  // 3. Buscar por "Apellido, Nombre" → "Nombre Apellido"
  if (nombre.includes(',')) {
    const partes = nombre.split(',').map(p => p.trim())
    const invertido = `${partes[1]} ${partes[0]}`
    const invertidoNorm = normalizarNombre(invertido)
    const porInversion = medicos.find(m => {
      const mNorm = normalizarNombre(m.nombre)
      return mNorm.includes(invertidoNorm) || invertidoNorm.includes(mNorm)
    })
    if (porInversion) return porInversion
  }

  // 4. Buscar por apellido (primera parte antes de la coma o espacio)
  const partes = nombreBusqueda.split(/[,\s]+/).filter(p => p.length > 2)

  if (partes.length > 0) {
    const apellido = partes[0]

    // Buscar médicos que tengan el mismo apellido
    const candidatos = medicos.filter(m => {
      const partesM = normalizarNombre(m.nombre).split(/[,\s]+/).filter(p => p.length > 2)
      return partesM.some(pm => pm === apellido)
    })

    if (candidatos.length === 1) {
      return candidatos[0]
    }

    // Si hay múltiples con el mismo apellido, buscar por segunda palabra
    if (candidatos.length > 1 && partes.length > 1) {
      const segundaPalabra = partes[1]
      const mejorCandidato = candidatos.find(m => {
        const partesM = normalizarNombre(m.nombre).split(/[,\s]+/).filter(p => p.length > 2)
        return partesM.some(pm => pm === segundaPalabra || pm.includes(segundaPalabra) || segundaPalabra.includes(pm))
      })
      if (mejorCandidato) return mejorCandidato
    }
  }

  // 5. Coincidencia por todas las palabras significativas presentes
  if (partes.length >= 2) {
    const candidatosPalabras = medicos.find(m => {
      const partesM = normalizarNombre(m.nombre).split(/[,\s]+/).filter(p => p.length > 2)
      const coincidencias = partes.filter(pb =>
        partesM.some(pm => pm === pb || pm.includes(pb) || pb.includes(pm))
      )
      return coincidencias.length >= 2
    })
    if (candidatosPalabras) return candidatosPalabras
  }

  return null
}

/**
 * Convierte una fecha en múltiples formatos a ISO (YYYY-MM-DD)
 */
function convertirFechaISO(fecha: string | null | undefined): string | null {
  if (!fecha) return null

  // Si ya es formato ISO (YYYY-MM-DD)
  const isoMatch = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  // DD/MM/YYYY
  const dmy = String(fecha).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (dmy) {
    return `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`
  }

  // Intentar fecha tipo Excel (número de serie)
  const num = Number(fecha)
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const date = new Date((num - 25569) * 86400 * 1000)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  return null
}

/**
 * Convierte una hora a formato HH:MM:SS
 */
function convertirHora(hora: any): string | null {
  if (!hora) return null

  const horaStr = String(hora).trim()

  // HH:MM o HH:MM:SS
  const match = horaStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (match) {
    return `${String(match[1]).padStart(2, '0')}:${match[2]}:${match[3] || '00'}`
  }

  // Hora decimal (fracción del día, tipo Excel: 0.5 = 12:00)
  const num = parseFloat(horaStr)
  if (!isNaN(num) && num >= 0 && num < 1) {
    const totalMinutos = Math.round(num * 24 * 60)
    const h = Math.floor(totalMinutos / 60)
    const m = totalMinutos % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
  }

  return null
}

/**
 * Procesa el archivo de Guardias Clínicas (solo consultas) y lo guarda en la base de datos
 */
export async function procesarExcelGuardiasClinicas(
  excelDataConsultas: ExcelData,
  mes: number,
  anio: number,
  archivoNombreConsultas: string
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
    // 1. Cargar TODOS los médicos usando paginación
    let todosLosMedicos: Medico[] = []
    const pageSize = 1000
    let from = 0
    let hasMore = true

    while (hasMore) {
      const { data: medicosPagina, error: errorMedicos } = await supabase
        .from('medicos')
        .select('*')
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1) as { data: Medico[] | null; error: any }

      if (errorMedicos) {
        resultado.errores.push(`Error cargando médicos: ${errorMedicos.message}`)
        return resultado
      }

      if (!medicosPagina || medicosPagina.length === 0) {
        hasMore = false
        break
      }

      todosLosMedicos = [...todosLosMedicos, ...medicosPagina]

      if (medicosPagina.length < pageSize) {
        hasMore = false
      } else {
        from += pageSize
      }
    }

    const medicos = todosLosMedicos
    console.log(`[Guardias Clínicas] Médicos cargados: ${medicos.length}`)

    // 2. Cargar configuración de grupos (70% o 50%)
    const { data: gruposData } = await supabase
      .from('clinical_groups_config')
      .select('*')
      .eq('mes', mes)
      .eq('anio', anio) as { data: ConfiguracionGrupo[] | null }

    const gruposPorMedico = new Map<string, 'GRUPO_70' | 'GRUPO_50'>()
    if (gruposData) {
      gruposData.forEach(g => {
        gruposPorMedico.set(g.doctor_id, g.group_type)
      })
    }

    // 3. Cargar valores de consultas de guardia clínica usando paginación
    let todosLosValoresConsultas: ValorConsultaObraSocial[] = []
    from = 0
    hasMore = true

    while (hasMore) {
      const { data: valoresPagina, error: errorValores } = await supabase
        .from('valores_consultas_obra_social')
        .select('*')
        .eq('tipo_consulta', 'CONSULTA DE GUARDIA CLINICA')
        .eq('mes', mes)
        .eq('anio', anio)
        .order('obra_social', { ascending: true })
        .range(from, from + pageSize - 1) as { data: ValorConsultaObraSocial[] | null; error: any | null }

      if (errorValores) {
        console.error('[Guardias Clínicas] Error cargando valores de consultas:', errorValores)
        break
      }

      if (!valoresPagina || valoresPagina.length === 0) {
        hasMore = false
        break
      }

      todosLosValoresConsultas = [...todosLosValoresConsultas, ...valoresPagina]

      if (valoresPagina.length < pageSize) {
        hasMore = false
      } else {
        from += pageSize
      }
    }

    const valoresConsultas = todosLosValoresConsultas
    const valoresPorObraSocial = new Map<string, number>()

    // Almacenamos los valores en el mapa
    valoresConsultas.forEach(v => {
      valoresPorObraSocial.set(v.obra_social, v.valor)
    })

    // Cargar valores de PARTICULARES al inicio (buscar por múltiples variantes)
    // 1. Buscar por nombre exacto 'PARTICULARES'
    if (!valoresPorObraSocial.has('PARTICULARES')) {
      const { data: valorParticularData } = await supabase
        .from('valores_consultas_obra_social')
        .select('valor')
        .eq('obra_social', 'PARTICULARES')
        .eq('tipo_consulta', 'CONSULTA DE GUARDIA CLINICA')
        .eq('mes', mes)
        .eq('anio', anio)
        .maybeSingle()

      if (valorParticularData) {
        valoresPorObraSocial.set('PARTICULARES', (valorParticularData as any).valor)
      }
    }

    // 2. Buscar por '042 - PARTICULARES'
    if (!valoresPorObraSocial.has('042 - PARTICULARES')) {
      const { data: valorParticular042Data } = await supabase
        .from('valores_consultas_obra_social')
        .select('valor')
        .eq('obra_social', '042 - PARTICULARES')
        .eq('tipo_consulta', 'CONSULTA DE GUARDIA CLINICA')
        .eq('mes', mes)
        .eq('anio', anio)
        .maybeSingle()

      if (valorParticular042Data) {
        valoresPorObraSocial.set('042 - PARTICULARES', (valorParticular042Data as any).valor)
      }
    }

    // 3. Buscar por código '042' en cualquier variante de nombre
    if (!valoresPorObraSocial.has('PARTICULARES') && !valoresPorObraSocial.has('042 - PARTICULARES')) {
      // Buscar por ilike para capturar cualquier variante
      const { data: valorParticular042Any } = await supabase
        .from('valores_consultas_obra_social')
        .select('valor, obra_social')
        .eq('tipo_consulta', 'CONSULTA DE GUARDIA CLINICA')
        .eq('mes', mes)
        .eq('anio', anio)
        .ilike('obra_social', '%042%PARTICULAR%')
        .maybeSingle()

      if (valorParticular042Any) {
        valoresPorObraSocial.set((valorParticular042Any as any).obra_social, (valorParticular042Any as any).valor)
        // También setear en las variantes comunes para facilitar búsquedas
        valoresPorObraSocial.set('PARTICULARES', (valorParticular042Any as any).valor)
        valoresPorObraSocial.set('042 - PARTICULARES', (valorParticular042Any as any).valor)
      }
    }

    // 4. Sincronizar ambas claves si solo una existe
    if (valoresPorObraSocial.has('PARTICULARES') && !valoresPorObraSocial.has('042 - PARTICULARES')) {
      valoresPorObraSocial.set('042 - PARTICULARES', valoresPorObraSocial.get('PARTICULARES')!)
    }
    if (valoresPorObraSocial.has('042 - PARTICULARES') && !valoresPorObraSocial.has('PARTICULARES')) {
      valoresPorObraSocial.set('PARTICULARES', valoresPorObraSocial.get('042 - PARTICULARES')!)
    }

    console.log(`[Guardias Clínicas] Valor PARTICULARES cargado: $${valoresPorObraSocial.get('042 - PARTICULARES') || valoresPorObraSocial.get('PARTICULARES') || 'NO ENCONTRADO'}`)
    console.log(`[Guardias Clínicas] Total valores por obra social cargados: ${valoresPorObraSocial.size}`)

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
        archivo_nombre: archivoNombreConsultas,
        numero_liquidacion: numeroLiquidacion
      }

      const { data: liquidacionCreada, error: errorLiquidacion } = await supabase
        .from('liquidaciones_guardia')
        // @ts-ignore
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

    // 5. Mapeo de nombres de médicos
    console.log(`Extrayendo nombres únicos de consultas`)

    const nombresUnicos = new Set<string>()
    const nombresOriginales = new Map<string, string>()

    // Extraer nombres de CONSULTAS
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

    // Crear mapa de nombres normalizados -> médicos
    const mapaNombresMedicos = new Map<string, Medico>()
    for (const nombreNormalizado of nombresUnicos) {
      const medico = buscarMedico(nombresOriginales.get(nombreNormalizado) || nombreNormalizado, medicos)
      if (medico) {
        mapaNombresMedicos.set(nombreNormalizado, medico)
      }
    }

    console.log(`[Mapeo] Médicos encontrados: ${mapaNombresMedicos.size}/${nombresUnicos.size}`)
    const nombresNoEncontrados = Array.from(nombresUnicos).filter(n => !mapaNombresMedicos.has(n))
    if (nombresNoEncontrados.length > 0) {
      resultado.advertencias.push(`Médicos no encontrados en BD (${nombresNoEncontrados.length}): ${nombresNoEncontrados.slice(0, 5).map(n => nombresOriginales.get(n) || n).join(', ')}${nombresNoEncontrados.length > 5 ? '...' : ''}`)
    }

    // 6. Procesar archivo de CONSULTAS
    console.log(`Procesando ${excelDataConsultas.rows.length} filas de consultas`)

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
          'Responsable', 'Médico', 'Medico', 'Profesional',
          'Médico responsable', 'Médico Responsable'
        ])

        // --- Filtros de exclusión ---
        // Filtro: sin fecha
        if (!fechaStr) {
          resultado.filasExcluidas.push({
            numeroFila: i + 1,
            razon: 'sin_fecha',
            datos: row
          })
          continue
        }

        // Convertir fecha
        const fecha = convertirFechaISO(String(fechaStr))
        if (!fecha) {
          resultado.filasExcluidas.push({
            numeroFila: i + 1,
            razon: 'fecha_invalida',
            datos: row
          })
          continue
        }

        // Verificar que la fecha corresponde al mes/año
        const [anioFecha, mesFecha] = fecha.split('-').map(Number)
        if (mesFecha !== mes || anioFecha !== anio) {
          resultado.filasExcluidas.push({
            numeroFila: i + 1,
            razon: 'fecha_invalida',
            datos: row
          })
          continue
        }

        // Filtro: duración cero
        const duracionNum = duracion ? parseFloat(String(duracion).replace(',', '.')) : null
        if (duracionNum !== null && duracionNum <= 0) {
          resultado.filasExcluidas.push({
            numeroFila: i + 1,
            razon: 'duracion_cero',
            datos: row
          })
          continue
        }

        // Filtro: sin hora
        const horaFormato = convertirHora(hora)

        // Reclasificar particulares como '042 - PARTICULARES' en vez de excluirlos
        let obraSocialStr = obraSocial ? String(obraSocial).trim() : ''
        if (esParticular(obraSocialStr)) {
          obraSocialStr = '042 - PARTICULARES'
        }

        // Filtro: duplicado (con nombres normalizados para detección robusta)
        const pacienteNorm = paciente && typeof paciente === 'string' ? normalizarNombre(paciente) : (paciente || '')
        const medicoNorm = medicoNombre && typeof medicoNombre === 'string' ? normalizarNombre(medicoNombre) : (medicoNombre || '')
        const fingerprint = `${pacienteNorm}|${fecha}|${horaFormato || ''}|${medicoNorm}`
        if (duplicados.has(fingerprint)) {
          resultado.filasExcluidas.push({
            numeroFila: i + 1,
            razon: 'duplicado',
            datos: row
          })
          continue
        }
        duplicados.add(fingerprint)

        // --- Procesamiento ---
        // Buscar médico usando el mapa de nombres
        let medico: Medico | null = null
        if (medicoNombre && typeof medicoNombre === 'string' && medicoNombre.trim() !== '') {
          const nombreNormalizado = normalizarNombre(medicoNombre.trim())
          medico = mapaNombresMedicos.get(nombreNormalizado) || null

          if (!medico) {
            medico = buscarMedico(medicoNombre.trim(), medicos)
            if (medico) {
              mapaNombresMedicos.set(nombreNormalizado, medico)
            }
          }
        }

        // Calcular monto facturado
        let montoFacturado = 0

        // Determinar la obra social final para buscar el valor
        let obraSocialFinal = obraSocialStr

        // Buscar valor por obra social
        if (obraSocialStr) {
          const codigoOS = extraerCodigoObraSocial(obraSocialStr)

          // Estrategia de búsqueda progresiva
          let valorEncontrado = false

          // 1. Buscar coincidencia exacta por código
          if (codigoOS) {
            for (const [osKey, valor] of valoresPorObraSocial.entries()) {
              if (coincidenObrasSociales(codigoOS, osKey)) {
                montoFacturado = valor
                obraSocialFinal = osKey
                valorEncontrado = true
                break
              }
            }
          }

          // 2. Buscar por nombre normalizado
          if (!valorEncontrado) {
            const osNorm = normalizarNombre(obraSocialStr)
            for (const [osKey, valor] of valoresPorObraSocial.entries()) {
              if (normalizarNombre(osKey) === osNorm) {
                montoFacturado = valor
                obraSocialFinal = osKey
                valorEncontrado = true
                break
              }
            }
          }

          // 3. Buscar por coincidencia parcial
          if (!valorEncontrado) {
            const osNorm = normalizarNombre(obraSocialStr)
            for (const [osKey, valor] of valoresPorObraSocial.entries()) {
              const keyNorm = normalizarNombre(osKey)
              if (keyNorm.includes(osNorm) || osNorm.includes(keyNorm)) {
                montoFacturado = valor
                obraSocialFinal = osKey
                valorEncontrado = true
                break
              }
            }
          }

          // 4. Si todavía no encontró, intentar con el código extraído
          if (!valorEncontrado && codigoOS) {
            for (const [osKey, valor] of valoresPorObraSocial.entries()) {
              if (normalizarNombre(osKey).includes(normalizarNombre(codigoOS))) {
                montoFacturado = valor
                obraSocialFinal = osKey
                valorEncontrado = true
                break
              }
            }
          }

          // 5. Para PARTICULARES: buscar explícitamente el valor de 042
          if (!valorEncontrado && (obraSocialStr.includes('PARTICULAR') || obraSocialStr.includes('042'))) {
            const valorParticular = valoresPorObraSocial.get('042 - PARTICULARES') || valoresPorObraSocial.get('PARTICULARES') || 0
            if (valorParticular > 0) {
              montoFacturado = valorParticular
              obraSocialFinal = '042 - PARTICULARES'
              valorEncontrado = true
            }
          }

          // 6. Si no se encontró valor, usar el valor del Excel como fallback
          if (!valorEncontrado) {
            const totalBrutoNum = totalBruto ? parseFloat(String(totalBruto).replace(',', '.')) : 0
            montoFacturado = isNaN(totalBrutoNum) ? 0 : totalBrutoNum

            if (montoFacturado > 0) {
              resultado.advertencias.push(`Fila ${i + 1}: OS "${obraSocialStr}" sin valor configurado. Usando valor del Excel: $${montoFacturado}`)
            } else {
              resultado.advertencias.push(`Fila ${i + 1}: OS "${obraSocialStr}" sin valor configurado y sin valor en Excel.`)
            }
          }
        }

        // Si hay médico, acumular total bruto por médico (ahora usando montoFacturado)
        if (medico) {
          const brutoActual = totalBrutoPorMedico.get(medico.id) || 0
          totalBrutoPorMedico.set(medico.id, brutoActual + montoFacturado)
        }

        // Crear detalle
        const detalle: DetalleGuardiaInsert = {
          liquidacion_id: liquidacionId,
          medico_id: medico?.id || null,
          fecha: fecha || `${anio}-${String(mes).padStart(2, '0')}-01`,
          hora: horaFormato || null,
          paciente: paciente || null,
          obra_social: obraSocialFinal || null,
          medico_nombre: medico?.nombre || medicoNombre || 'Sin médico asignado',
          medico_matricula: medico?.matricula_provincial || null,
          medico_es_residente: medico?.es_residente || false,
          monto_facturado: montoFacturado,
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

    // 7. Calcular importes finales por médico (solo consultas)
    const totalesPorMedico = new Map<string, {
      netoConsultas: number
      totalFinal: number
    }>()

    // Calcular neto de consultas por médico
    for (const [medicoId, totalBruto] of totalBrutoPorMedico.entries()) {
      const grupo = gruposPorMedico.get(medicoId)
      let netoConsultas = 0

      if (grupo === 'GRUPO_50') {
        netoConsultas = totalBruto * 0.50
      } else {
        // Por defecto todos son 70% (menos los del grupo 50%)
        netoConsultas = totalBruto * 0.70
      }

      totalesPorMedico.set(medicoId, {
        netoConsultas,
        totalFinal: netoConsultas
      })
    }

    // 8. Actualizar detalles de consultas con importes calculados
    for (const detalle of detallesConsultas) {
      if (!detalle.medico_id) {
        detalle.importe_calculado = null
        continue
      }

      const grupo = gruposPorMedico.get(detalle.medico_id)
      const totalBruto = totalBrutoPorMedico.get(detalle.medico_id) || 0
      const totales = totalesPorMedico.get(detalle.medico_id)

      if (!totales) {
        detalle.importe_calculado = null
        continue
      }

      // Calcular porcentaje y monto según grupo
      if (grupo === 'GRUPO_50') {
        detalle.porcentaje_retencion = 50
        detalle.monto_retencion = detalle.monto_facturado ? detalle.monto_facturado * 0.50 : 0
        const proporcion = detalle.monto_facturado && totalBruto > 0
          ? detalle.monto_facturado / totalBruto
          : 0
        detalle.importe_calculado = totales.netoConsultas * proporcion
      } else {
        // Default 70%
        detalle.porcentaje_retencion = 30
        detalle.monto_retencion = detalle.monto_facturado ? detalle.monto_facturado * 0.30 : 0
        const proporcion = detalle.monto_facturado && totalBruto > 0
          ? detalle.monto_facturado / totalBruto
          : 0
        detalle.importe_calculado = totales.netoConsultas * proporcion
      }
    }

    // 9. Guardar detalles en la base de datos
    if (detallesConsultas.length === 0) {
      resultado.errores.push('No se procesó ninguna fila de consultas.')
      return resultado
    }

    console.log(`Guardando ${detallesConsultas.length} detalles en la base de datos`)

    const batchSize = 100
    for (let i = 0; i < detallesConsultas.length; i += batchSize) {
      const batch = detallesConsultas.slice(i, i + batchSize)
      const { error: errorDetalles } = await supabase
        .from('detalle_guardia')
        // @ts-ignore
        .insert(batch)

      if (errorDetalles) {
        resultado.errores.push(`Error guardando detalles (lote ${Math.floor(i / batchSize) + 1}): ${errorDetalles.message}`)
        return resultado
      }
    }

    // 10. Actualizar totales de la liquidación
    const totalConsultas = detallesConsultas.length
    const totalBrutoFinal = Array.from(totalBrutoPorMedico.values()).reduce((sum, v) => sum + v, 0)
    const totalNeto = Array.from(totalesPorMedico.values()).reduce((sum, v) => sum + v.totalFinal, 0)
    const totalRetenciones = totalBrutoFinal - Array.from(totalesPorMedico.values()).reduce((sum, v) => sum + v.netoConsultas, 0)

    const { error: errorUpdate } = await supabase
      .from('liquidaciones_guardia')
      // @ts-ignore
      .update({
        total_consultas: totalConsultas,
        total_bruto: totalBrutoFinal,
        total_retenciones: totalRetenciones,
        total_neto: totalNeto,
        estado: 'finalizada'
      })
      .eq('id', liquidacionId)

    if (errorUpdate) {
      resultado.errores.push(`Error actualizando totales: ${errorUpdate.message}`)
    }

    resultado.totalFilas = excelDataConsultas.rows.length

  } catch (error: any) {
    resultado.errores.push(`Error general: ${error.message || 'Error desconocido'}`)
  }

  return resultado
}
