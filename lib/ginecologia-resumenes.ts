import { supabase } from './supabase/client'
import { DetalleGuardia, ValorConsultaObraSocial, Medico } from './types'

export interface ResumenPorMedico {
  medico_id: string | null
  medico_nombre: string
  obra_social: string
  cantidad: number
  valor_unitario: number
  total: number
}

export interface ResumenPorPrestador {
  medico_id: string | null
  medico_nombre: string
  cantidad: number
  total_bruto: number
  retencion_20: number
  total_neto: number
}

/**
 * Calcula el resumen por médico y obra social (PRE-RETENCIÓN)
 * Aplica la regla de residentes: si es residente en horario formativo (lunes-sábado 07:00-15:00), no se cuenta
 */
export async function calcularResumenPorMedico(
  mes: number,
  anio: number
): Promise<ResumenPorMedico[]> {
  // Obtener liquidación de ginecología para el mes/año
  const { data: liquidacion } = await supabase
    .from('liquidaciones_guardia')
    .select('id')
    .eq('especialidad', 'Ginecología')
    .eq('mes', mes)
    .eq('anio', anio)
    .single()

  if (!liquidacion || !(liquidacion as any).id) {
    return []
  }

  const liquidacionId = (liquidacion as any).id

  // Obtener todos los detalles de guardia de esta liquidación
  const { data: detalles } = await supabase
    .from('detalle_guardia')
    .select('*')
    .eq('liquidacion_id', liquidacionId) as { data: DetalleGuardia[] | null }

  if (!detalles || detalles.length === 0) {
    return []
  }

  // Obtener valores de consultas ginecológicas
  const { data: valoresConsultas } = await supabase
    .from('valores_consultas_obra_social')
    .select('*')
    .eq('tipo_consulta', 'CONSULTA GINECOLOGICA')
    .eq('mes', mes)
    .eq('anio', anio) as { data: ValorConsultaObraSocial[] | null }

  if (!valoresConsultas || valoresConsultas.length === 0) {
    return []
  }

  // Crear mapa de valores por obra social
  const valoresPorObraSocial = new Map<string, number>()
  valoresConsultas.forEach(v => {
    valoresPorObraSocial.set(v.obra_social, v.valor)
  })
  
  // Normalizar PARTICULARES: si existe "042 - PARTICULARES", también agregarlo como "PARTICULARES"
  // y viceversa, para que funcione independientemente de cómo esté guardado
  if (valoresPorObraSocial.has('042 - PARTICULARES') && !valoresPorObraSocial.has('PARTICULARES')) {
    const valor042 = valoresPorObraSocial.get('042 - PARTICULARES')
    if (valor042) {
      valoresPorObraSocial.set('PARTICULARES', valor042)
    }
  }
  
  if (valoresPorObraSocial.has('PARTICULARES') && !valoresPorObraSocial.has('042 - PARTICULARES')) {
    const valorParticulares = valoresPorObraSocial.get('PARTICULARES')
    if (valorParticulares) {
      valoresPorObraSocial.set('042 - PARTICULARES', valorParticulares)
    }
  }
  
  // Si no se encontró ninguno, buscar en la BD
  if (!valoresPorObraSocial.has('PARTICULARES') && !valoresPorObraSocial.has('042 - PARTICULARES')) {
    // Buscar "PARTICULARES" primero
    const { data: valorParticular } = await supabase
      .from('valores_consultas_obra_social')
      .select('valor')
      .eq('obra_social', 'PARTICULARES')
      .eq('tipo_consulta', 'CONSULTA GINECOLOGICA')
      .eq('mes', mes)
      .eq('anio', anio)
      .single()
    
    if (valorParticular && (valorParticular as any).valor) {
      const valor = (valorParticular as any).valor
      valoresPorObraSocial.set('PARTICULARES', valor)
      valoresPorObraSocial.set('042 - PARTICULARES', valor)
    } else {
      // Intentar también con "042 - PARTICULARES"
      const { data: valorParticular042 } = await supabase
        .from('valores_consultas_obra_social')
        .select('valor')
        .eq('obra_social', '042 - PARTICULARES')
        .eq('tipo_consulta', 'CONSULTA GINECOLOGICA')
        .eq('mes', mes)
        .eq('anio', anio)
        .single()
      
      if (valorParticular042 && (valorParticular042 as any).valor) {
        const valor = (valorParticular042 as any).valor
        valoresPorObraSocial.set('PARTICULARES', valor)
        valoresPorObraSocial.set('042 - PARTICULARES', valor)
      }
    }
  }

  // Agrupar por médico y obra social, aplicando regla de residentes
  const resumenMap = new Map<string, ResumenPorMedico>()

  detalles.forEach(detalle => {
    // Excluir consultas de residentes en horario formativo del resumen por médico
    // Usar directamente el campo es_horario_formativo que ya está guardado en la BD
    const esHorarioFormativo = detalle.es_horario_formativo === true
    
    // También excluir si es residente y tiene valores en 0 (probablemente horario formativo)
    // Esto cubre casos donde el campo es_horario_formativo no está correctamente guardado
    const esResidenteConValorCero = detalle.medico_es_residente === true && 
                                     (detalle.importe_calculado ?? 0) === 0 && 
                                     (detalle.monto_facturado ?? 0) === 0

    // Si es horario formativo o residente con valor cero, no debe contarse en el resumen
    if (esHorarioFormativo || esResidenteConValorCero) {
      return
    }

    // Excluir también consultas con valor cero (importe_calculado = 0 o monto_facturado = 0)
    // Estas pueden ser consultas sin valor configurado o que no deben pagarse
    const tieneValor = (detalle.importe_calculado ?? 0) > 0 || (detalle.monto_facturado ?? 0) > 0
    if (!tieneValor) {
      return
    }

    const obraSocial = detalle.obra_social || 'PARTICULARES'
    const medicoNombre = detalle.medico_nombre || 'Desconocido'
    const medicoId = detalle.medico_id

    // Clave única: usar medico_id si existe, sino usar nombre normalizado
    // Esto evita que médicos diferentes se agrupen incorrectamente cuando no tienen ID
    // Normalizar el nombre para evitar duplicados por diferencias de formato
    const nombreNormalizado = medicoNombre.toLowerCase().trim().replace(/\s+/g, ' ')
    const clave = medicoId 
      ? `${medicoId}|${obraSocial}` 
      : `${nombreNormalizado}|${obraSocial}`

    // Obtener valor unitario de la obra social
    // Ya se normalizó el mapa para que "PARTICULARES" y "042 - PARTICULARES" apunten al mismo valor
    const valorUnitario = valoresPorObraSocial.get(obraSocial) || 0

    // Si el valor unitario es 0, también excluir (obra social sin valor configurado)
    if (valorUnitario === 0) {
      return
    }

    // Actualizar o crear resumen
    if (resumenMap.has(clave)) {
      const resumen = resumenMap.get(clave)!
      resumen.cantidad += 1
      resumen.total = resumen.cantidad * resumen.valor_unitario
    } else {
      resumenMap.set(clave, {
        medico_id: detalle.medico_id,
        medico_nombre: medicoNombre,
        obra_social: obraSocial,
        cantidad: 1,
        valor_unitario: valorUnitario,
        total: valorUnitario
      })
    }
  })

  // Convertir a array y ordenar por médico y obra social
  return Array.from(resumenMap.values()).sort((a, b) => {
    if (a.medico_nombre !== b.medico_nombre) {
      return a.medico_nombre.localeCompare(b.medico_nombre)
    }
    return a.obra_social.localeCompare(b.obra_social)
  })
}

/**
 * Calcula el resumen por prestador (POST-RETENCIÓN)
 * Agrupa por médico y calcula retención del 20%
 */
export async function calcularResumenPorPrestador(
  mes: number,
  anio: number
): Promise<ResumenPorPrestador[]> {
  // Obtener resumen por médico (ya aplica regla de residentes)
  const resumenPorMedico = await calcularResumenPorMedico(mes, anio)

  // Agrupar por médico - USAR CLAVE ÚNICA (ID o nombre normalizado)
  // Esto evita que médicos diferentes sin ID se agrupen incorrectamente
  const resumenMap = new Map<string, ResumenPorPrestador>()

  resumenPorMedico.forEach(resumen => {
    // Usar ID si existe, sino usar nombre normalizado para evitar agrupar médicos diferentes
    const nombreNormalizado = resumen.medico_nombre.toLowerCase().trim().replace(/\s+/g, ' ')
    const clave = resumen.medico_id || `nombre-${nombreNormalizado}`
    const medicoNombre = resumen.medico_nombre

    if (resumenMap.has(clave)) {
      const prestador = resumenMap.get(clave)!
      prestador.cantidad += resumen.cantidad
      prestador.total_bruto += resumen.total
      prestador.retencion_20 = prestador.total_bruto * 0.2
      prestador.total_neto = prestador.total_bruto - prestador.retencion_20
    } else {
      const totalBruto = resumen.total
      const retencion = totalBruto * 0.2
      const totalNeto = totalBruto - retencion

      resumenMap.set(clave, {
        medico_id: resumen.medico_id,
        medico_nombre: medicoNombre,
        cantidad: resumen.cantidad,
        total_bruto: totalBruto,
        retencion_20: retencion,
        total_neto: totalNeto
      })
    }
  })

  // Convertir a array y ordenar por nombre
  return Array.from(resumenMap.values()).sort((a, b) =>
    a.medico_nombre.localeCompare(b.medico_nombre)
  )
}

export interface ResumenResidenteFormativo {
  medico_id: string | null
  medico_nombre: string
  obra_social: string
  cantidad: number
  valor_unitario: number
  total: number
}

export interface TotalesResidentesFormativos {
  resumenes: ResumenResidenteFormativo[]
  totalConsultas: number
  totalValor: number
}

/**
 * Obtiene el resumen de consultas de residentes en horario formativo agrupado por médico y obra social
 * Estas consultas NO se muestran a los médicos pero SÍ se contabilizan para administración
 * Retorna totales agrupados, no consultas individuales
 */
export async function obtenerResidentesFormativos(
  mes: number,
  anio: number
): Promise<TotalesResidentesFormativos> {
  // Obtener liquidación de ginecología para el mes/año
  const { data: liquidacion } = await supabase
    .from('liquidaciones_guardia')
    .select('id')
    .eq('especialidad', 'Ginecología')
    .eq('mes', mes)
    .eq('anio', anio)
    .single()

  if (!liquidacion || !(liquidacion as any).id) {
    return {
      resumenes: [],
      totalConsultas: 0,
      totalValor: 0
    }
  }

  const liquidacionId = (liquidacion as any).id

  // Obtener todos los detalles de guardia de esta liquidación
  const { data: detalles } = await supabase
    .from('detalle_guardia')
    .select('*')
    .eq('liquidacion_id', liquidacionId) as { data: DetalleGuardia[] | null }

  if (!detalles || detalles.length === 0) {
    return {
      resumenes: [],
      totalConsultas: 0,
      totalValor: 0
    }
  }

  // Obtener valores de consultas ginecológicas
  const { data: valoresConsultas } = await supabase
    .from('valores_consultas_obra_social')
    .select('*')
    .eq('tipo_consulta', 'CONSULTA GINECOLOGICA')
    .eq('mes', mes)
    .eq('anio', anio) as { data: ValorConsultaObraSocial[] | null }

  if (!valoresConsultas || valoresConsultas.length === 0) {
    return {
      resumenes: [],
      totalConsultas: 0,
      totalValor: 0
    }
  }

  // Crear mapa de valores por obra social
  const valoresPorObraSocial = new Map<string, number>()
  valoresConsultas.forEach(v => {
    valoresPorObraSocial.set(v.obra_social, v.valor)
  })

  // Filtrar solo las consultas de residentes en horario formativo y agrupar
  const resumenMap = new Map<string, ResumenResidenteFormativo>()

  detalles.forEach(detalle => {
    // Usar directamente el campo es_horario_formativo que ya está guardado en la BD
    // Este campo se guarda durante el procesamiento del Excel
    // El campo es boolean según la interfaz, pero puede ser null/undefined en algunos casos
    const esHorarioFormativo = detalle.es_horario_formativo === true

    // Solo procesar si es residente en horario formativo
    if (!esHorarioFormativo) {
      return
    }

    const obraSocial = detalle.obra_social || 'PARTICULARES'
    const medicoNombre = detalle.medico_nombre || 'Desconocido'
    const medicoId = detalle.medico_id || 'sin-id'

    // Clave única: medico_id + obra_social
    const clave = `${medicoId}|${obraSocial}`

    // Obtener valor unitario de la obra social
    const valorUnitario = valoresPorObraSocial.get(obraSocial) || 0

    // Actualizar o crear resumen
    if (resumenMap.has(clave)) {
      const resumen = resumenMap.get(clave)!
      resumen.cantidad += 1
      resumen.total = resumen.cantidad * resumen.valor_unitario
    } else {
      resumenMap.set(clave, {
        medico_id: detalle.medico_id,
        medico_nombre: medicoNombre,
        obra_social: obraSocial,
        cantidad: 1,
        valor_unitario: valorUnitario,
        total: valorUnitario
      })
    }
  })

  // Convertir a array y ordenar por médico y obra social
  const resumenes = Array.from(resumenMap.values()).sort((a, b) => {
    if (a.medico_nombre !== b.medico_nombre) {
      return a.medico_nombre.localeCompare(b.medico_nombre)
    }
    return a.obra_social.localeCompare(b.obra_social)
  })

  // Calcular totales
  const totalConsultas = resumenes.reduce((sum, r) => sum + r.cantidad, 0)
  const totalValor = resumenes.reduce((sum, r) => sum + r.total, 0)

  return {
    resumenes,
    totalConsultas,
    totalValor
  }
}

