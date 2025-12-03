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
 * Calcula el resumen por médico y obra social
 * Incluye retención del 30% y adicionales
 * Busca la liquidación por mes y año o usa liquidacionId si se proporciona
 */
export async function calcularResumenPorMedico(
  mes: number,
  anio: number,
  liquidacionId?: string  // NUEVO: aceptar liquidacionId opcional para trabajar con liquidación específica
): Promise<ResumenPorMedico[]> {
  let liquidacionIdFinal: string

  if (liquidacionId) {
    // Si se proporciona liquidacionId, usarlo directamente (trabajar solo con ese archivo)
    liquidacionIdFinal = liquidacionId
    console.log(`[Pediatría Resúmenes] Usando liquidación específica: ${liquidacionIdFinal}`)
  } else {
    // Si no se proporciona, buscar la liquidación de Pediatría para el mes/año
    const { data: liquidacion } = await supabase
      .from('liquidaciones_guardia')
      .select('id')
      .eq('especialidad', 'Pediatría')  // IMPORTANTE: filtrar por especialidad
      .eq('mes', mes)
      .eq('anio', anio)
      .maybeSingle()

    if (!liquidacion || !(liquidacion as any).id) {
      console.warn(`[Pediatría Resúmenes] No se encontró liquidación de Pediatría para ${mes}/${anio}`)
      return []
    }

    liquidacionIdFinal = (liquidacion as any).id
    console.log(`[Pediatría Resúmenes] Liquidación encontrada: ${liquidacionIdFinal}`)
  }

  // Obtener todos los detalles de guardia de esta liquidación usando paginación
  // IMPORTANTE: Usar paginación para obtener TODOS los registros (más de 1000)
  let todosLosDetalles: DetalleGuardia[] = []
  const pageSize = 1000
  let from = 0
  let hasMore = true
  let paginaNum = 1

  while (hasMore) {
    const { data: detallesPagina, error } = await supabase
      .from('detalle_guardia')
      .select('*')
      .eq('liquidacion_id', liquidacionIdFinal)
      .order('id', { ascending: true })  // IMPORTANTE: Ordenar para paginación consistente
      .range(from, from + pageSize - 1)

    if (error) {
      console.error('[Pediatría Resúmenes] Error obteniendo detalles:', error)
      break
    }

    if (!detallesPagina || detallesPagina.length === 0) {
      hasMore = false
      break
    }

    todosLosDetalles = [...todosLosDetalles, ...detallesPagina]
    console.log(`[Pediatría Resúmenes] Página ${paginaNum}: ${detallesPagina.length} registros (total acumulado: ${todosLosDetalles.length})`)

    if (detallesPagina.length < pageSize) {
      hasMore = false
    } else {
      from += pageSize
      paginaNum++
    }
  }

  console.log(`[Pediatría Resúmenes] Total de detalles obtenidos: ${todosLosDetalles.length} para liquidación ${liquidacionIdFinal}`)

  if (todosLosDetalles.length === 0) {
    return []
  }

  const detalles = todosLosDetalles

  // Agrupar por médico y obra social
  const resumenMap = new Map<string, ResumenPorMedico>()
  
  // Contadores para diagnóstico
  let registrosExcluidosSinValor = 0
  let registrosExcluidosSinMedico = 0
  let registrosIncluidos = 0

  detalles.forEach(detalle => {
    // Verificar si tiene médico (registro válido)
    // MODIFICADO: Ser más permisivo - incluir si tiene médico_nombre o medico_id
    const tieneMedicoNombre = detalle.medico_nombre && detalle.medico_nombre.trim() !== '' && detalle.medico_nombre !== 'Desconocido'
    const tieneMedicoId = detalle.medico_id && detalle.medico_id.trim() !== ''
    const tieneMedico = tieneMedicoNombre || tieneMedicoId
    
    if (!tieneMedico) {
      registrosExcluidosSinMedico++
      return
    }

    // MODIFICADO: Incluir TODOS los registros que tengan médico, independientemente del valor
    // Esto asegura que se incluyan todas las consultas, incluso si aún no tienen valores asignados
    const tieneValor = (detalle.monto_facturado ?? 0) > 0 || (detalle.importe_calculado ?? 0) > 0
    
    // Contar registros sin valor para diagnóstico, pero incluirlos igual
    if (!tieneValor) {
      registrosExcluidosSinValor++
    }
    
    // IMPORTANTE: Incluir TODOS los registros con médico, incluso sin valor
    // Esto asegura que todas las consultas se cuenten en los resúmenes

    const obraSocial = detalle.obra_social || 'PARTICULARES'
    const medicoNombre = detalle.medico_nombre || 'Desconocido'
    const medicoId = detalle.medico_id

    // Clave única: usar medico_id si existe, sino usar nombre normalizado
    const nombreNormalizado = medicoNombre.toLowerCase().trim().replace(/\s+/g, ' ')
    const clave = medicoId 
      ? `${medicoId}|${obraSocial}` 
      : `${nombreNormalizado}|${obraSocial}`

    // Usar valores del detalle, o 0 si no están asignados
    const montoFacturado = detalle.monto_facturado ?? 0
    const montoRetencion = detalle.monto_retencion ?? 0
    const montoNeto = detalle.importe_calculado ?? 0
    const montoAdicional = detalle.monto_adicional ?? 0
    const totalFinal = montoNeto + montoAdicional
    
    registrosIncluidos++

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

  // Logs de diagnóstico
  const totalConsultas = Array.from(resumenMap.values()).reduce((sum, r) => sum + r.cantidad, 0)
  console.log(`[Pediatría Resúmenes] Registros incluidos en resúmenes: ${registrosIncluidos}`)
  console.log(`[Pediatría Resúmenes] Registros excluidos sin médico: ${registrosExcluidosSinMedico}`)
  console.log(`[Pediatría Resúmenes] Registros excluidos sin valor: ${registrosExcluidosSinValor}`)
  console.log(`[Pediatría Resúmenes] Total de consultas en resúmenes: ${totalConsultas}`)
  console.log(`[Pediatría Resúmenes] Diferencia: ${detalles.length - totalConsultas} registros no incluidos`)

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
  anio: number,
  liquidacionId?: string  // NUEVO: aceptar liquidacionId opcional
): Promise<ResumenPorPrestador[]> {
  // Obtener resumen por médico pasando liquidacionId
  const resumenPorMedico = await calcularResumenPorMedico(mes, anio, liquidacionId)

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

