import { supabase } from './supabase/client'
import { DetalleGuardia, DetalleHorasGuardia, Medico, ClinicalGroupsConfig, ClinicalValuesConfig } from './types'

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
  total_neto_consultas: number
  total_horas: number
  total_final: number
}

/**
 * Calcula el resumen por médico y obra social (consultas)
 * Busca la liquidación por mes y año o usa liquidacionId si se proporciona
 */
export async function calcularResumenPorMedico(
  mes: number,
  anio: number,
  liquidacionId?: string
): Promise<ResumenPorMedico[]> {
  let liquidacionIdFinal: string

  if (liquidacionId) {
    liquidacionIdFinal = liquidacionId
  } else {
    const { data: liquidacion } = await supabase
      .from('liquidaciones_guardia')
      .select('id')
      .eq('especialidad', 'Guardias Clínicas')
      .eq('mes', mes)
      .eq('anio', anio)
      .maybeSingle()

    if (!liquidacion || !(liquidacion as any).id) {
      return []
    }

    liquidacionIdFinal = (liquidacion as any).id
  }

  // Obtener todos los detalles de consultas usando paginación
  let todosLosDetalles: DetalleGuardia[] = []
  const pageSize = 1000
  let from = 0
  let hasMore = true

  while (hasMore) {
    const { data: detallesPagina, error } = await supabase
      .from('detalle_guardia')
      .select('*')
      .eq('liquidacion_id', liquidacionIdFinal)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      console.error('[Guardias Clínicas Resúmenes] Error obteniendo detalles:', error)
      break
    }

    if (!detallesPagina || detallesPagina.length === 0) {
      hasMore = false
      break
    }

    todosLosDetalles = [...todosLosDetalles, ...detallesPagina]

    if (detallesPagina.length < pageSize) {
      hasMore = false
    } else {
      from += pageSize
    }
  }

  if (todosLosDetalles.length === 0) {
    return []
  }

  // Agrupar por médico y obra social
  const resumenMap = new Map<string, ResumenPorMedico>()

  for (const detalle of todosLosDetalles) {
    const medicoNombre = detalle.medico_nombre || 'Sin médico'
    const obraSocial = detalle.obra_social || 'Sin obra social'
    const clave = `${detalle.medico_id || 'sin-id'}|${obraSocial}`

    const resumen = resumenMap.get(clave) || {
      medico_id: detalle.medico_id,
      medico_nombre: medicoNombre,
      obra_social: obraSocial,
      cantidad: 0,
      valor_unitario: 0,
      total: 0
    }

    resumen.cantidad++
    const monto = detalle.monto_facturado || 0
    resumen.total += monto

    resumenMap.set(clave, resumen)
  }

  // Calcular valor unitario promedio
  const resumenes = Array.from(resumenMap.values())
  for (const resumen of resumenes) {
    resumen.valor_unitario = resumen.cantidad > 0 ? resumen.total / resumen.cantidad : 0
  }

  return resumenes.sort((a, b) => {
    if (a.medico_nombre !== b.medico_nombre) {
      return a.medico_nombre.localeCompare(b.medico_nombre)
    }
    return a.obra_social.localeCompare(b.obra_social)
  })
}

/**
 * Calcula el resumen por prestador (médico) incluyendo consultas y horas
 */
export async function calcularResumenPorPrestador(
  mes: number,
  anio: number,
  liquidacionId?: string
): Promise<ResumenPorPrestador[]> {
  let liquidacionIdFinal: string

  if (liquidacionId) {
    liquidacionIdFinal = liquidacionId
  } else {
    const { data: liquidacion } = await supabase
      .from('liquidaciones_guardia')
      .select('id')
      .eq('especialidad', 'Guardias Clínicas')
      .eq('mes', mes)
      .eq('anio', anio)
      .maybeSingle()

    if (!liquidacion || !(liquidacion as any).id) {
      return []
    }

    liquidacionIdFinal = (liquidacion as any).id
  }

  // Obtener detalles de consultas
  let todosLosDetalles: DetalleGuardia[] = []
  const pageSize = 1000
  let from = 0
  let hasMore = true

  while (hasMore) {
    const { data: detallesPagina, error } = await supabase
      .from('detalle_guardia')
      .select('*')
      .eq('liquidacion_id', liquidacionIdFinal)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      console.error('[Guardias Clínicas Resúmenes] Error obteniendo detalles:', error)
      break
    }

    if (!detallesPagina || detallesPagina.length === 0) {
      hasMore = false
      break
    }

    todosLosDetalles = [...todosLosDetalles, ...detallesPagina]

    if (detallesPagina.length < pageSize) {
      hasMore = false
    } else {
      from += pageSize
    }
  }

  // Obtener detalles de horas
  let todosLosDetallesHoras: DetalleHorasGuardia[] = []
  from = 0
  hasMore = true

  while (hasMore) {
    const { data: detallesHorasPagina, error } = await supabase
      .from('detalle_horas_guardia')
      .select('*')
      .eq('liquidacion_id', liquidacionIdFinal)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      console.error('[Guardias Clínicas Resúmenes] Error obteniendo detalles de horas:', error)
      break
    }

    if (!detallesHorasPagina || detallesHorasPagina.length === 0) {
      hasMore = false
      break
    }

    todosLosDetallesHoras = [...todosLosDetallesHoras, ...detallesHorasPagina]

    if (detallesHorasPagina.length < pageSize) {
      hasMore = false
    } else {
      from += pageSize
    }
  }

  // Obtener configuración de grupos para calcular neto de consultas usando paginación
  let todosLosGrupos: ClinicalGroupsConfig[] = []
  from = 0
  hasMore = true

  while (hasMore) {
    const { data: gruposPagina, error: errorGrupos } = await supabase
      .from('clinical_groups_config')
      .select('*')
      .eq('mes', mes)
      .eq('anio', anio)
      .order('doctor_id', { ascending: true })
      .range(from, from + pageSize - 1)

    if (errorGrupos) {
      console.error('[Guardias Clínicas Resúmenes] Error obteniendo grupos:', errorGrupos)
      break
    }

    if (!gruposPagina || gruposPagina.length === 0) {
      hasMore = false
      break
    }

    todosLosGrupos = [...todosLosGrupos, ...gruposPagina]

    if (gruposPagina.length < pageSize) {
      hasMore = false
    } else {
      from += pageSize
    }
  }

  const gruposPorMedico = new Map<string, 'GRUPO_70' | 'GRUPO_40'>()
  const gruposConfig = todosLosGrupos as ClinicalGroupsConfig[]
  for (const grupo of gruposConfig) {
    gruposPorMedico.set(grupo.doctor_id, grupo.group_type as 'GRUPO_70' | 'GRUPO_40')
  }

  // Obtener configuración de valores (horas) para recalcular total_horas correctamente
  const { data: valoresData } = await supabase
    .from('clinical_values_config')
    .select('*')
    .eq('mes', mes)
    .eq('anio', anio)
    .single() as { data: ClinicalValuesConfig | null }

  if (!valoresData) {
    console.error('[Guardias Clínicas Resúmenes] No se encontró configuración de valores para recalcular horas')
  }

  // Agrupar por médico
  const resumenMap = new Map<string, ResumenPorPrestador>()

  // Procesar consultas
  for (const detalle of todosLosDetalles) {
    if (!detalle.medico_id) continue

    const medicoNombre = detalle.medico_nombre || 'Sin médico'
    const clave = detalle.medico_id

    const resumen = resumenMap.get(clave) || {
      medico_id: detalle.medico_id,
      medico_nombre: medicoNombre,
      cantidad: 0,
      total_bruto: 0,
      total_neto_consultas: 0,
      total_horas: 0,
      total_final: 0
    }

    resumen.cantidad++
    resumen.total_bruto += detalle.monto_facturado || 0

    resumenMap.set(clave, resumen)
  }

  // Calcular neto de consultas por grupo
  for (const [medicoId, resumen] of resumenMap.entries()) {
    const grupo = gruposPorMedico.get(medicoId)
    if (grupo === 'GRUPO_70') {
      resumen.total_neto_consultas = resumen.total_bruto * 0.70
    } else if (grupo === 'GRUPO_40') {
      resumen.total_neto_consultas = resumen.total_bruto * 0.40
    }
  }

  // Procesar horas - RECALCULAR total_horas usando valores de configuración actuales
  // Esto asegura que el cálculo sea correcto incluso si los valores guardados en BD están mal
  for (const detalleHora of todosLosDetallesHoras) {
    if (!detalleHora.medico_id) continue

    const clave = detalleHora.medico_id

    // Recalcular total_horas usando valores de configuración actuales
    let totalHorasRecalculado = 0
    if (valoresData) {
      // Todas son horas trabajadas, se multiplican por valor por hora
      const valorHoras816 = (detalleHora.franjas_8_16 || 0) * valoresData.value_hour_weekly_8_16
      const valorHoras168 = (detalleHora.franjas_16_8 || 0) * valoresData.value_hour_weekly_16_8
      const valorHorasWeekend = (detalleHora.horas_weekend || 0) * valoresData.value_hour_weekend
      const valorHorasWeekendNight = (detalleHora.horas_weekend_night || 0) * valoresData.value_hour_weekend_night
      totalHorasRecalculado = valorHoras816 + valorHoras168 + valorHorasWeekend + valorHorasWeekendNight
    } else {
      // Si no hay configuración, usar el valor guardado como fallback
      totalHorasRecalculado = detalleHora.total_horas || 0
    }

    const resumen = resumenMap.get(clave) || {
      medico_id: detalleHora.medico_id,
      medico_nombre: detalleHora.medico_nombre,
      cantidad: 0,
      total_bruto: 0,
      total_neto_consultas: 0,
      total_horas: 0,
      total_final: 0
    }

    resumen.total_horas += totalHorasRecalculado
    resumenMap.set(clave, resumen)
  }

  // Calcular total final
  for (const resumen of resumenMap.values()) {
    resumen.total_final = resumen.total_neto_consultas + resumen.total_horas
  }

  return Array.from(resumenMap.values()).sort((a, b) => 
    a.medico_nombre.localeCompare(b.medico_nombre)
  )
}

/**
 * Calcula el total general de la liquidación
 */
export async function calcularTotalGeneral(
  mes: number,
  anio: number,
  liquidacionId?: string
): Promise<{
  totalConsultas: number
  totalBruto: number
  totalNetoConsultas: number
  totalHoras: number
  totalFinal: number
}> {
  const resumenes = await calcularResumenPorPrestador(mes, anio, liquidacionId)

  return {
    totalConsultas: resumenes.reduce((sum, r) => sum + r.cantidad, 0),
    totalBruto: resumenes.reduce((sum, r) => sum + r.total_bruto, 0),
    totalNetoConsultas: resumenes.reduce((sum, r) => sum + r.total_neto_consultas, 0),
    totalHoras: resumenes.reduce((sum, r) => sum + r.total_horas, 0),
    totalFinal: resumenes.reduce((sum, r) => sum + r.total_final, 0)
  }
}

