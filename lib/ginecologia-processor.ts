import { supabase } from './supabase/client'
import { ExcelData, ExcelRow } from './excel-reader'
import { Medico, DetalleGuardiaInsert, LiquidacionGuardiaInsert, ValorConsultaObraSocial } from './types'
import { esResidenteHorarioFormativo, horaAMinutos } from './utils'
import { calcularNumeroLiquidacion } from './utils'

interface ProcesamientoResult {
  liquidacionId: string
  totalFilas: number
  procesadas: number
  errores: string[]
  advertencias: string[]
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
  
  // Buscar coincidencia exacta
  for (const variacion of variaciones) {
    if (row[variacion] !== undefined && row[variacion] !== null) {
      const valor = row[variacion]
      if (typeof valor === 'string' && valor.trim() !== '') return valor.trim()
      if (typeof valor !== 'string') return valor
    }
  }
  
  // Buscar coincidencia normalizada
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
  
  // Buscar coincidencia parcial
  for (const variacion of variaciones) {
    const palabras = normalizarColumna(variacion).split(/\s+/).filter(p => p.length > 2)
    for (const key of keys) {
      const keyNormalizada = normalizarColumna(key)
      if (palabras.every(p => keyNormalizada.includes(p))) {
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
 * Busca un médico por nombre en la lista de médicos
 */
function buscarMedico(nombre: string | null, medicos: Medico[]): Medico | null {
  if (!nombre || typeof nombre !== 'string') return null
  
  const nombreNormalizado = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  
  // Buscar coincidencia exacta
  for (const medico of medicos) {
    const medicoNombreNormalizado = medico.nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
    
    if (medicoNombreNormalizado === nombreNormalizado) {
      return medico
    }
    
    // Buscar por apellido (primera parte antes de la coma)
    const partesMedico = medico.nombre.split(',').map(p => p.trim())
    if (partesMedico.length > 0) {
      const apellidoMedico = partesMedico[0]
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
      
      if (nombreNormalizado.includes(apellidoMedico) || apellidoMedico.includes(nombreNormalizado)) {
        return medico
      }
    }
  }
  
  return null
}

/**
 * Convierte una fecha en formato DD/MM/YYYY a ISO (YYYY-MM-DD)
 */
function convertirFechaISO(fecha: string | null | undefined): string | null {
  if (!fecha || typeof fecha !== 'string') return null
  
  const match = fecha.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!match) return null
  
  const dia = match[1].padStart(2, '0')
  const mes = match[2].padStart(2, '0')
  const anio = match[3]
  
  return `${anio}-${mes}-${dia}`
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
 * Procesa un Excel de ginecología y lo guarda en la base de datos
 */
export async function procesarExcelGinecologia(
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
    advertencias: []
  }

  try {
    // 1. Cargar médicos de ginecología
    const { data: medicosData, error: errorMedicos } = await supabase
      .from('medicos')
      .select('*')
      .eq('especialidad', 'Ginecología')
      .eq('activo', true) as { data: Medico[] | null; error: any }

    if (errorMedicos) {
      resultado.errores.push(`Error cargando médicos: ${errorMedicos.message}`)
      return resultado
    }

    const medicos = medicosData || []

    // 2. Cargar valores de consultas ginecológicas
    const { data: valoresData } = await supabase
      .from('valores_consultas_obra_social')
      .select('*')
      .eq('tipo_consulta', 'CONSULTA GINECOLOGICA')
      .eq('mes', mes)
      .eq('anio', anio) as { data: ValorConsultaObraSocial[] | null }

    const valoresConsultas = valoresData || []
    const valoresPorObraSocial = new Map<string, number>()
    valoresConsultas.forEach(v => {
      valoresPorObraSocial.set(v.obra_social, v.valor)
    })

    // 3. Crear o obtener liquidación
    const numeroLiquidacion = calcularNumeroLiquidacion(mes, anio)
    
    // Verificar si ya existe
    const { data: liquidacionExistente } = await supabase
      .from('liquidaciones_guardia')
      .select('id')
      .eq('especialidad', 'Ginecología')
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
        especialidad: 'Ginecología',
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

      if (errorLiquidacion || !liquidacionCreada) {
        resultado.errores.push(`Error creando liquidación: ${errorLiquidacion?.message || 'Error desconocido'}`)
        return resultado
      }

      liquidacionId = (liquidacionCreada as any).id
    }

    resultado.liquidacionId = liquidacionId

    // 4. Procesar cada fila del Excel
    const detalles: DetalleGuardiaInsert[] = []
    resultado.totalFilas = excelData.rows.length

    for (let i = 0; i < excelData.rows.length; i++) {
      const row = excelData.rows[i]
      
      try {
        // Extraer datos de la fila
        const fechaStr = buscarValor(row, ['Fecha', 'fecha', 'FECHA', 'Fecha visita', 'Fecha Visita'])
        const hora = buscarValor(row, ['Hora', 'hora', 'HORA', 'Horario', 'horario'])
        const paciente = buscarValor(row, ['Paciente', 'paciente', 'PACIENTE', 'Nombre paciente', 'Nombre Paciente'])
        const obraSocial = buscarValor(row, ['Obra Social', 'obra social', 'Obra social', 'ObraSocial', 'Cliente'])
        const medicoNombre = buscarValor(row, ['Responsable', 'responsable', 'Médico', 'medico', 'MEDICO', 'Medico', 'Profesional'])
        
        // Validar datos mínimos
        if (!fechaStr) {
          resultado.advertencias.push(`Fila ${i + 1}: Sin fecha, se omite`)
          continue
        }

        const fecha = convertirFechaISO(fechaStr)
        if (!fecha) {
          resultado.advertencias.push(`Fila ${i + 1}: Fecha inválida (${fechaStr}), se omite`)
          continue
        }

        // Buscar médico
        const medico = buscarMedico(medicoNombre, medicos)
        const esResidente = medico?.es_residente || false

        // Obtener valor de consulta
        const obraSocialFinal = obraSocial || 'PARTICULARES'
        const valorUnitario = valoresPorObraSocial.get(obraSocialFinal) || 0

        // Aplicar regla de residentes
        const horaFormato = convertirHora(hora)
        const esHorarioFormativo = esResidenteHorarioFormativo(fecha, horaFormato, esResidente)
        
        let montoFacturado = valorUnitario
        let importeCalculado = valorUnitario

        if (esHorarioFormativo) {
          // Residente en horario formativo: no se paga
          montoFacturado = 0
          importeCalculado = 0
        }

        // Crear detalle
        const detalle: DetalleGuardiaInsert = {
          liquidacion_id: liquidacionId,
          medico_id: medico?.id || null,
          fecha,
          hora: horaFormato,
          paciente: paciente || null,
          obra_social: obraSocialFinal,
          medico_nombre: medicoNombre || medico?.nombre || 'Desconocido',
          medico_matricula: medico?.matricula || null,
          medico_es_residente: esResidente,
          monto_facturado: montoFacturado,
          porcentaje_retencion: null, // Ginecología no tiene retención del 30%
          monto_retencion: null,
          monto_adicional: 0,
          importe_calculado: importeCalculado,
          aplica_adicional: false,
          es_horario_formativo: esHorarioFormativo,
          estado_revision: 'pendiente',
          fila_excel: i + 1
        }

        detalles.push(detalle)
        resultado.procesadas++

      } catch (error: any) {
        resultado.errores.push(`Fila ${i + 1}: ${error.message || 'Error desconocido'}`)
      }
    }

    // 5. Guardar detalles en la base de datos
    if (detalles.length > 0) {
      const { error: errorDetalles } = await supabase
        .from('detalle_guardia')
        // @ts-ignore - La tabla no está en los tipos generados de Supabase aún
        .insert(detalles)

      if (errorDetalles) {
        resultado.errores.push(`Error guardando detalles: ${errorDetalles.message}`)
        return resultado
      }
    }

    // 6. Actualizar totales de la liquidación
    const totalConsultas = detalles.length
    const totalBruto = detalles.reduce((sum, d) => sum + (d.monto_facturado || 0), 0)
    const totalNeto = detalles.reduce((sum, d) => sum + (d.importe_calculado || 0), 0)

    const { error: errorUpdate } = await supabase
      .from('liquidaciones_guardia')
      // @ts-ignore - La tabla no está en los tipos generados de Supabase aún
      .update({
        total_consultas: totalConsultas,
        total_bruto: totalBruto,
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

