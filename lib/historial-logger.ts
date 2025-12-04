import { supabase } from './supabase/client'
import { LogProcesamientoInsert } from './types'

/**
 * Tipos de eventos que se pueden registrar en el historial
 */
export type TipoEventoHistorial = 
  | 'exportacion_pdf_completo'
  | 'exportacion_pdf_individual'
  | 'exportacion_pdf_medico'
  | 'exportacion_excel'
  | 'edicion_celda'
  | 'eliminacion_fila'
  | 'eliminacion_masiva'
  | 'cambio_estado'
  | 'procesamiento_inicio'
  | 'procesamiento_finalizado'
  | 'procesamiento_error'

/**
 * Guarda un log en el historial
 */
export async function guardarLogHistorial(
  tipoEvento: TipoEventoHistorial,
  mensaje: string,
  liquidacionId?: string | null,
  detalle?: Record<string, any>
): Promise<void> {
  try {
    const log: LogProcesamientoInsert = {
      liquidacion_id: liquidacionId || null,
      tipo_evento: tipoEvento,
      mensaje,
      detalle: detalle ? (detalle as any) : null,
      created_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('logs_procesamiento')
      .insert([log])

    if (error) {
      console.error('Error guardando log en historial:', error)
      // No lanzar error para no interrumpir el flujo principal
    }
  } catch (error) {
    console.error('Error guardando log en historial:', error)
    // No lanzar error para no interrumpir el flujo principal
  }
}

/**
 * Helper para guardar logs de exportación de PDF
 */
export async function logExportacionPDF(
  tipo: 'completo' | 'individual' | 'medico',
  liquidacionId: string | null,
  detalles: {
    mes: number
    anio: number
    especialidad: string
    prestadorNombre?: string
    cantidadPrestadores?: number
  }
): Promise<void> {
  const tipoEvento = tipo === 'completo' 
    ? 'exportacion_pdf_completo'
    : tipo === 'individual'
    ? 'exportacion_pdf_individual'
    : 'exportacion_pdf_medico'

  const mensaje = tipo === 'completo'
    ? `PDF completo exportado - ${detalles.especialidad} ${detalles.mes}/${detalles.anio}`
    : tipo === 'individual'
    ? `PDF individual exportado - ${detalles.prestadorNombre} - ${detalles.especialidad} ${detalles.mes}/${detalles.anio}`
    : `PDF por médico exportado - ${detalles.prestadorNombre} - ${detalles.especialidad} ${detalles.mes}/${detalles.anio}`

  await guardarLogHistorial(tipoEvento, mensaje, liquidacionId, {
    tipo,
    mes: detalles.mes,
    anio: detalles.anio,
    especialidad: detalles.especialidad,
    prestadorNombre: detalles.prestadorNombre,
    cantidadPrestadores: detalles.cantidadPrestadores
  })
}

/**
 * Helper para guardar logs de edición de celdas
 */
export async function logEdicionCelda(
  liquidacionId: string,
  detalles: {
    filaExcel: number
    columna: string
    valorAnterior: any
    valorNuevo: any
    paciente?: string
    fecha?: string
  }
): Promise<void> {
  await guardarLogHistorial(
    'edicion_celda',
    `Celda editada - Fila ${detalles.filaExcel}, Columna: ${detalles.columna}`,
    liquidacionId,
    {
      filaExcel: detalles.filaExcel,
      columna: detalles.columna,
      valorAnterior: detalles.valorAnterior,
      valorNuevo: detalles.valorNuevo,
      paciente: detalles.paciente,
      fecha: detalles.fecha
    }
  )
}

/**
 * Helper para guardar logs de eliminación de filas
 */
export async function logEliminacionFila(
  liquidacionId: string,
  detalles: {
    filaExcel: number
    motivo: string
    paciente?: string
    fecha?: string
    cantidad?: number // Para eliminaciones masivas
  }
): Promise<void> {
  const tipoEvento = detalles.cantidad && detalles.cantidad > 1
    ? 'eliminacion_masiva'
    : 'eliminacion_fila'

  const mensaje = detalles.cantidad && detalles.cantidad > 1
    ? `${detalles.cantidad} filas eliminadas - Motivo: ${detalles.motivo}`
    : `Fila ${detalles.filaExcel} eliminada - Motivo: ${detalles.motivo}`

  await guardarLogHistorial(
    tipoEvento,
    mensaje,
    liquidacionId,
    {
      filaExcel: detalles.filaExcel,
      motivo: detalles.motivo,
      paciente: detalles.paciente,
      fecha: detalles.fecha,
      cantidad: detalles.cantidad
    }
  )
}

/**
 * Helper para guardar logs de cambio de estado
 */
export async function logCambioEstado(
  liquidacionId: string,
  detalles: {
    estadoAnterior: string
    estadoNuevo: string
    especialidad: string
    mes: number
    anio: number
  }
): Promise<void> {
  await guardarLogHistorial(
    'cambio_estado',
    `Estado cambiado: ${detalles.estadoAnterior} → ${detalles.estadoNuevo}`,
    liquidacionId,
    {
      estadoAnterior: detalles.estadoAnterior,
      estadoNuevo: detalles.estadoNuevo,
      especialidad: detalles.especialidad,
      mes: detalles.mes,
      anio: detalles.anio
    }
  )
}

