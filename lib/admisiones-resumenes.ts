import { supabase } from './supabase/client'
import { DetalleGuardia } from './types'

export interface ResumenPorMedico {
  medico_id: string | null
  medico_nombre: string
  medico_matricula: string | null
  cantidad: number
  valor_unitario: number
  total: number
}

/**
 * Calcula el resumen por médico para Admisiones Clínicas
 * Agrupa por médico y cuenta las admisiones, con valor fijo de $10,000
 */
export async function calcularResumenPorMedico(
  mes: number,
  anio: number,
  liquidacionId?: string
): Promise<ResumenPorMedico[]> {
  try {
    // Construir query base
    let query = supabase
      .from('detalle_guardia')
      .select(`
        medico_id,
        medico_nombre,
        medico_matricula,
        monto_facturado,
        importe_calculado,
        liquidacion_id,
        liquidaciones_guardia!inner(mes, anio, especialidad)
      `)
      .eq('liquidaciones_guardia.mes', mes)
      .eq('liquidaciones_guardia.anio', anio)
      .eq('liquidaciones_guardia.especialidad', 'Admisiones Clínicas')

    // Si se especifica liquidacionId, filtrar por ella
    if (liquidacionId) {
      query = query.eq('liquidacion_id', liquidacionId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error calculando resumen por médico:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return []
    }

    // Agrupar por médico
    const resumenesMap = new Map<string, ResumenPorMedico>()

    for (const detalle of data as any[]) {
      const medicoId = detalle.medico_id || 'sin_medico'
      const medicoNombre = detalle.medico_nombre || 'Desconocido'
      const medicoMatricula = detalle.medico_matricula || null

      if (!resumenesMap.has(medicoId)) {
        resumenesMap.set(medicoId, {
          medico_id: detalle.medico_id,
          medico_nombre: medicoNombre,
          medico_matricula: medicoMatricula,
          cantidad: 0,
          valor_unitario: 10000, // Valor fijo por admisión
          total: 0
        })
      }

      const resumen = resumenesMap.get(medicoId)!
      resumen.cantidad += 1
      resumen.total += detalle.importe_calculado || detalle.monto_facturado || 10000
    }

    // Convertir a array y ordenar alfabéticamente por nombre
    const resumenes = Array.from(resumenesMap.values())
    resumenes.sort((a, b) => {
      const nombreA = a.medico_nombre.toLowerCase()
      const nombreB = b.medico_nombre.toLowerCase()
      return nombreA.localeCompare(nombreB)
    })

    return resumenes
  } catch (error) {
    console.error('Error en calcularResumenPorMedico:', error)
    throw error
  }
}

/**
 * Calcula el total general de admisiones
 */
export function calcularTotalGeneral(resumenes: ResumenPorMedico[]): {
  totalCantidad: number
  totalMonto: number
} {
  const totalCantidad = resumenes.reduce((sum, r) => sum + r.cantidad, 0)
  const totalMonto = resumenes.reduce((sum, r) => sum + r.total, 0)

  return {
    totalCantidad,
    totalMonto
  }
}

export interface ResumenPorPrestador {
  medico_id: string | null
  medico_nombre: string
  cantidad: number
  valor_unitario: number
  total: number
}

/**
 * Calcula el resumen por prestador (agrupado por médico)
 * Para Admisiones Clínicas: valor fijo de $10,000 por admisión, sin retenciones
 */
export async function calcularResumenPorPrestador(
  mes: number,
  anio: number,
  liquidacionId?: string
): Promise<ResumenPorPrestador[]> {
  // Obtener resumen por médico pasando liquidacionId
  const resumenPorMedico = await calcularResumenPorMedico(mes, anio, liquidacionId)

  // Agrupar por médico - USAR CLAVE ÚNICA (ID o nombre normalizado)
  const resumenMap = new Map<string, ResumenPorPrestador>()

  resumenPorMedico.forEach(resumen => {
    // Usar ID si existe, sino usar nombre normalizado para evitar agrupar médicos diferentes
    const nombreNormalizado = resumen.medico_nombre.toLowerCase().trim().replace(/\s+/g, ' ')
    const clave = resumen.medico_id || `nombre-${nombreNormalizado}`
    const medicoNombre = resumen.medico_nombre

    if (resumenMap.has(clave)) {
      const prestador = resumenMap.get(clave)!
      prestador.cantidad += resumen.cantidad
      prestador.total += resumen.total
    } else {
      resumenMap.set(clave, {
        medico_id: resumen.medico_id,
        medico_nombre: medicoNombre,
        cantidad: resumen.cantidad,
        valor_unitario: resumen.valor_unitario,
        total: resumen.total
      })
    }
  })

  // Convertir a array y ordenar por nombre
  return Array.from(resumenMap.values()).sort((a, b) =>
    a.medico_nombre.localeCompare(b.medico_nombre)
  )
}

/**
 * Obtiene el detalle de pacientes por prestador (médico)
 */
export async function obtenerDetallePacientesPorPrestador(
  medicoId: string | null,
  medicoNombre: string,
  mes: number,
  anio: number,
  liquidacionId?: string
): Promise<DetalleGuardia[]> {
  try {
    let query = supabase
      .from('detalle_guardia')
      .select(`
        *,
        liquidaciones_guardia!inner(mes, anio, especialidad)
      `)
      .eq('liquidaciones_guardia.mes', mes)
      .eq('liquidaciones_guardia.anio', anio)
      .eq('liquidaciones_guardia.especialidad', 'Admisiones Clínicas')

    // Si se especifica liquidacionId, filtrar por ella
    if (liquidacionId) {
      query = query.eq('liquidacion_id', liquidacionId)
    }

    // Filtrar por médico
    if (medicoId) {
      query = query.eq('medico_id', medicoId)
    } else {
      // Si no hay ID, filtrar por nombre (normalizado)
      const nombreNormalizado = medicoNombre.toLowerCase().trim()
      query = query.ilike('medico_nombre', `%${nombreNormalizado}%`)
    }

    const { data, error } = await query.order('fecha', { ascending: true })

    if (error) {
      console.error('Error obteniendo detalle de pacientes:', error)
      throw error
    }

    return (data as DetalleGuardia[]) || []
  } catch (error) {
    console.error('Error en obtenerDetallePacientesPorPrestador:', error)
    throw error
  }
}

