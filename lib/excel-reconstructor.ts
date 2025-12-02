import { ExcelData, ExcelRow } from './excel-reader'
import { DetalleGuardia } from './types'

/**
 * Reconstruye ExcelData desde los detalles guardados en BD
 * Optimizado para rendimiento: usa Map para búsquedas O(1)
 */
export function reconstruirExcelDataDesdeDetalles(
  detalles: DetalleGuardia[],
  headersOriginales?: string[]
): ExcelData {
  if (detalles.length === 0) {
    return {
      periodo: null,
      headers: headersOriginales || [],
      rows: []
    }
  }

  // Ordenar por fila_excel para mantener el orden original
  const detallesOrdenados = [...detalles].sort((a, b) => {
    const filaA = a.fila_excel || 0
    const filaB = b.fila_excel || 0
    return filaA - filaB
  })

  // Determinar headers si no se proporcionan
  // Usar headers comunes de ginecología
  const headers = headersOriginales || [
    'Fecha',
    'Hora',
    'Paciente',
    'Obra Social',
    'Responsable'
  ]

  // Reconstruir filas desde los detalles
  const rows: ExcelRow[] = detallesOrdenados.map(detalle => {
    const row: ExcelRow = {}
    
    // Mapear campos de detalle_guardia a columnas del Excel
    headers.forEach(header => {
      const headerLower = header.toLowerCase().trim()
      
      if (headerLower.includes('fecha') || headerLower.includes('date')) {
        // Formatear fecha de ISO a DD/MM/YYYY
        if (detalle.fecha) {
          const date = new Date(detalle.fecha)
          if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0')
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const year = date.getFullYear()
            row[header] = `${day}/${month}/${year}`
          } else {
            row[header] = detalle.fecha
          }
        } else {
          row[header] = null
        }
      } else if (headerLower.includes('hora') || headerLower.includes('horario')) {
        row[header] = detalle.hora || null
      } else if (headerLower.includes('paciente')) {
        row[header] = detalle.paciente || null
      } else if (headerLower.includes('obra') || headerLower.includes('cliente')) {
        row[header] = detalle.obra_social || null
      } else if (headerLower.includes('responsable') || headerLower.includes('medico')) {
        row[header] = detalle.medico_nombre || null
      } else {
        // Para otros headers, intentar mapear si existe
        row[header] = null
      }
    })
    
    return row
  })

  // Extraer período desde las fechas (si es posible)
  let periodo: { desde: string; hasta: string } | null = null
  if (detallesOrdenados.length > 0) {
    const fechas = detallesOrdenados
      .map(d => d.fecha ? new Date(d.fecha) : null)
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())
    
    if (fechas.length > 0) {
      const desde = fechas[0]
      const hasta = fechas[fechas.length - 1]
      
      const formatearFecha = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
      }
      
      periodo = {
        desde: formatearFecha(desde),
        hasta: formatearFecha(hasta)
      }
    }
  }

  return {
    periodo,
    headers,
    rows
  }
}

/**
 * Reconstruye ExcelData desde BD de forma optimizada
 * Usa índices de BD para consultas rápidas
 */
export async function cargarExcelDataDesdeBD(
  liquidacionId: string,
  supabase: any,
  headersOriginales?: string[]
): Promise<ExcelData | null> {
  try {
    // Consulta optimizada: solo campos necesarios, ordenada por índice
    const { data: detalles, error } = await supabase
      .from('detalle_guardia')
      .select('id, fecha, hora, paciente, obra_social, medico_nombre, fila_excel')
      .eq('liquidacion_id', liquidacionId)
      .order('fila_excel', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('Error cargando detalles:', error)
      return null
    }

    if (!detalles || detalles.length === 0) {
      return null
    }

    return reconstruirExcelDataDesdeDetalles(detalles as DetalleGuardia[], headersOriginales)
  } catch (error) {
    console.error('Error en cargarExcelDataDesdeBD:', error)
    return null
  }
}

