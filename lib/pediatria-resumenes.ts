import { supabase } from './supabase/client'
import { DetalleGuardia } from './types'

export interface ResumenPorMedico {
  medico_id: string | null
  medico_nombre: string
  obra_social: string
  cantidad: number
  valor_unitario: number
  total_bruto: number
  retencion_30: number
  total_neto: number
  adicionales: number
  total_final: number
}

export interface ResumenPorPrestador {
  medico_id: string | null
  medico_nombre: string
  cantidad: number
  total_bruto: number
  retencion_30: number
  total_neto: number
  adicionales: number
  total_final: number
}

/**
 * Calcula el resumen por médico y obra social para pediatría
 * Incluye retención del 30% y adicionales
 */
export async function calcularResumenPorMedico(
  mes: number,
  anio: number
): Promise<ResumenPorMedico[]> {
  // Obtener liquidación de pediatría para el mes/año
  const { data: liquidacion } = await supabase
    .from('liquidaciones_guardia')
    .select('id')
    .eq('especialidad', 'Pediatría')
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

  // Agrupar por médico y obra social
  const resumenMap = new Map<string, ResumenPorMedico>()

  detalles.forEach(detalle => {
    // Excluir consultas con valor cero
    const tieneValor = (detalle.monto_facturado ?? 0) > 0
    if (!tieneValor) {
      return
    }

    const obraSocial = detalle.obra_social || 'PARTICULARES'
    const medicoNombre = detalle.medico_nombre || 'Desconocido'
    const medicoId = detalle.medico_id

    // Clave única: usar medico_id si existe, sino usar nombre normalizado
    const nombreNormalizado = medicoNombre.toLowerCase().trim().replace(/\s+/g, ' ')
    const clave = medicoId 
      ? `${medicoId}|${obraSocial}` 
      : `${nombreNormalizado}|${obraSocial}`

    const montoFacturado = detalle.monto_facturado || 0
    const montoRetencion = detalle.monto_retencion || 0
    const montoNeto = detalle.importe_calculado || 0
    const montoAdicional = detalle.monto_adicional || 0
    const totalFinal = montoNeto + montoAdicional

    // Actualizar o crear resumen
    if (resumenMap.has(clave)) {
      const resumen = resumenMap.get(clave)!
      resumen.cantidad += 1
      resumen.total_bruto += montoFacturado
      resumen.retencion_30 += montoRetencion
      resumen.total_neto += montoNeto
      resumen.adicionales += montoAdicional
      resumen.total_final += totalFinal
      // Actualizar valor unitario promedio
      resumen.valor_unitario = resumen.total_bruto / resumen.cantidad
    } else {
      resumenMap.set(clave, {
        medico_id: detalle.medico_id,
        medico_nombre: medicoNombre,
        obra_social: obraSocial,
        cantidad: 1,
        valor_unitario: montoFacturado,
        total_bruto: montoFacturado,
        retencion_30: montoRetencion,
        total_neto: montoNeto,
        adicionales: montoAdicional,
        total_final: totalFinal
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
 * Calcula el resumen por prestador (agrupado por médico)
 * Incluye retención del 30% y adicionales
 */
export async function calcularResumenPorPrestador(
  mes: number,
  anio: number
): Promise<ResumenPorPrestador[]> {
  // Obtener resumen por médico
  const resumenPorMedico = await calcularResumenPorMedico(mes, anio)

  // Agrupar por médico
  const resumenMap = new Map<string, ResumenPorPrestador>()

  resumenPorMedico.forEach(resumen => {
    // Usar ID si existe, sino usar nombre normalizado
    const nombreNormalizado = resumen.medico_nombre.toLowerCase().trim().replace(/\s+/g, ' ')
    const clave = resumen.medico_id || `nombre-${nombreNormalizado}`
    const medicoNombre = resumen.medico_nombre

    if (resumenMap.has(clave)) {
      const prestador = resumenMap.get(clave)!
      prestador.cantidad += resumen.cantidad
      prestador.total_bruto += resumen.total_bruto
      prestador.retencion_30 += resumen.retencion_30
      prestador.total_neto += resumen.total_neto
      prestador.adicionales += resumen.adicionales
      prestador.total_final += resumen.total_final
    } else {
      resumenMap.set(clave, {
        medico_id: resumen.medico_id,
        medico_nombre: medicoNombre,
        cantidad: resumen.cantidad,
        total_bruto: resumen.total_bruto,
        retencion_30: resumen.retencion_30,
        total_neto: resumen.total_neto,
        adicionales: resumen.adicionales,
        total_final: resumen.total_final
      })
    }
  })

  // Convertir a array y ordenar por nombre
  return Array.from(resumenMap.values()).sort((a, b) =>
    a.medico_nombre.localeCompare(b.medico_nombre)
  )
}

