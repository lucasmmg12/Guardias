import { supabase } from './supabase/client'

/**
 * Guarda un log simple cuando se procesa un archivo
 * Solo guarda: especialidad, mes, año y hora de procesamiento
 */
export async function guardarLogProcesamiento(
  especialidad: string,
  mes: number,
  anio: number,
  liquidacionId?: string | null
): Promise<void> {
  try {
    const log = {
      liquidacion_id: liquidacionId || null,
      tipo_evento: 'procesamiento_finalizado',
      mensaje: `Archivo procesado - ${especialidad} ${mes}/${anio}`,
      detalle: {
        especialidad,
        mes,
        anio,
        hora_procesamiento: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('logs_procesamiento')
      // @ts-ignore - La tabla no está en los tipos generados de Supabase aún
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

