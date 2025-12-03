'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { ExcelRow, ExcelData } from '@/lib/excel-reader'
import { InlineEditCell } from './InlineEditCell'
import { ExpandableSection } from './ExpandableSection'
import { CheckCircle2, AlertCircle, Trash2, Clock, UserX, Database } from 'lucide-react'
import { esParticular, tieneHorario, obtenerIndicesDuplicados, esResidenteHorarioFormativo } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { Medico, ValorConsultaObraSocial, ConfiguracionAdicional } from '@/lib/types'

interface ExcelDataTableProps {
  data: ExcelData
  especialidad?: 'Pediatría' | 'Ginecología'
  onCellUpdate?: (rowIndex: number, column: string, newValue: any) => Promise<void>
  onDeleteRow?: (rowIndex: number) => Promise<void>
  liquidacionId?: string
  mes?: number
  anio?: number
}

export function ExcelDataTable({ data, especialidad, onCellUpdate, onDeleteRow, liquidacionId, mes, anio }: ExcelDataTableProps) {
  const [rows, setRows] = useState<ExcelRow[]>(data.rows)
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({})
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [medicosLoading, setMedicosLoading] = useState(false)
  const [valoresConsultas, setValoresConsultas] = useState<Map<string, number>>(new Map())
  const [valoresLoading, setValoresLoading] = useState(false)
  const [adicionales, setAdicionales] = useState<Map<string, number>>(new Map())
  const [adicionalesLoading, setAdicionalesLoading] = useState(false)

  // Sincronizar rows cuando data cambia - MEJORADO para detectar cambios en el contenido
  useEffect(() => {
    // Actualizar siempre que cambie data.rows (no solo la longitud)
    // Usar JSON.stringify para comparación profunda, pero solo si cambió la longitud o referencia
    setRows(data.rows)
  }, [data.rows])

  // Cargar médicos una sola vez cuando se monta el componente
  useEffect(() => {
    if (!especialidad) {
      setMedicos([])
      setMedicosLoading(false)
      return
    }

    async function loadMedicos() {
      try {
        setMedicosLoading(true)
        // Guardar especialidad en variable local para TypeScript
        const especialidadValue = especialidad
        if (!especialidadValue) return

        const { data: medicosData, error } = await supabase
          .from('medicos')
          .select('*')
          .eq('especialidad', especialidadValue)
          .eq('activo', true)

        if (error) throw error
        setMedicos(medicosData || [])
      } catch (error) {
        console.error('Error loading médicos:', error)
      } finally {
        setMedicosLoading(false)
      }
    }

    loadMedicos()
  }, [especialidad])

  // Cargar valores de consultas cuando cambia mes, año o especialidad
  useEffect(() => {
    if (!mes || !anio || !especialidad) {
      setValoresConsultas(new Map())
      setValoresLoading(false)
      return
    }

    async function loadValoresConsultas() {
      try {
        setValoresLoading(true)
        const tipoConsulta = especialidad === 'Pediatría' 
          ? 'CONSULTA DE GUARDIA PEDIATRICA' 
          : 'CONSULTA GINECOLOGICA'

        // Validar que mes y anio estén definidos
        const mesValue = mes as number
        const anioValue = anio as number

        const { data: valoresData, error } = await supabase
          .from('valores_consultas_obra_social')
          .select('*')
          .eq('tipo_consulta', tipoConsulta)
          .eq('mes', mesValue)
          .eq('anio', anioValue) as { data: ValorConsultaObraSocial[] | null; error: any }

        if (error) throw error

        const valoresMap = new Map<string, number>()
        if (valoresData) {
          valoresData.forEach(v => {
            valoresMap.set(v.obra_social, v.valor)
          })

          // Manejar PARTICULARES y 042 - PARTICULARES
          const valorParticular = valoresMap.get('PARTICULARES')
          const valorParticular042 = valoresMap.get('042 - PARTICULARES')
          
          if (valorParticular && !valoresMap.has('042 - PARTICULARES')) {
            valoresMap.set('042 - PARTICULARES', valorParticular)
          }
          if (valorParticular042 && !valoresMap.has('PARTICULARES')) {
            valoresMap.set('PARTICULARES', valorParticular042)
          }
        }

        setValoresConsultas(valoresMap)
      } catch (error) {
        console.error('Error loading valores consultas:', error)
      } finally {
        setValoresLoading(false)
      }
    }

    loadValoresConsultas()
  }, [mes, anio, especialidad])

  // Cargar adicionales cuando cambia mes, año o especialidad
  useEffect(() => {
    if (!mes || !anio || !especialidad) {
      setAdicionales(new Map())
      setAdicionalesLoading(false)
      return
    }

    async function loadAdicionales() {
      try {
        setAdicionalesLoading(true)
        const mesValue = mes as number
        const anioValue = anio as number

        const { data: adicionalesData, error } = await supabase
          .from('configuracion_adicionales')
          .select('*')
          .eq('especialidad', especialidad)
          .eq('mes', mesValue)
          .eq('anio', anioValue)
          .eq('aplica_adicional', true) as { data: ConfiguracionAdicional[] | null; error: any }

        if (error) throw error

        const adicionalesMap = new Map<string, number>()
        if (adicionalesData) {
          adicionalesData.forEach(a => {
            if (a.monto_base_adicional && a.porcentaje_pago_medico) {
              // Calcular el monto que recibe el médico
              const montoCalculado = a.monto_base_adicional * (a.porcentaje_pago_medico / 100)
              adicionalesMap.set(a.obra_social, montoCalculado)
            }
          })
        }

        setAdicionales(adicionalesMap)
      } catch (error) {
        console.error('Error loading adicionales:', error)
      } finally {
        setAdicionalesLoading(false)
      }
    }

    loadAdicionales()
  }, [mes, anio, especialidad])

  // Crear mapa optimizado de médicos por nombre (búsqueda rápida)
  const mapaMedicos = useMemo(() => {
    const mapa = new Map<string, Medico>()
    medicos.forEach(medico => {
      // Normalizar nombre para búsqueda (sin acentos, minúsculas)
      const nombreNormalizado = medico.nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
      mapa.set(nombreNormalizado, medico)
      
      // También agregar variaciones del nombre (solo apellido, etc.)
      const partes = medico.nombre.split(',').map(p => p.trim())
      if (partes.length > 0) {
        const apellidoNormalizado = partes[0]
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
        if (apellidoNormalizado && !mapa.has(apellidoNormalizado)) {
          mapa.set(apellidoNormalizado, medico)
        }
      }
    })
    return mapa
  }, [medicos])

  // Función optimizada para buscar médico por nombre
  const buscarMedico = useCallback((nombre: string | null | undefined): Medico | null => {
    if (!nombre || typeof nombre !== 'string') return null
    
    const nombreNormalizado = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
    
    // Buscar coincidencia exacta
    if (mapaMedicos.has(nombreNormalizado)) {
      return mapaMedicos.get(nombreNormalizado) || null
    }
    
    // Buscar coincidencia parcial (el nombre contiene el apellido del médico)
    for (const [key, medico] of mapaMedicos.entries()) {
      if (nombreNormalizado.includes(key) || key.includes(nombreNormalizado)) {
        return medico
      }
    }
    
    return null
  }, [mapaMedicos])

  const handleCellSave = async (rowIndex: number, column: string, newValue: any) => {
    const key = `${rowIndex}-${column}`
    setSaving(prev => ({ ...prev, [key]: true }))

    try {
      // Actualizar el estado local
      const updatedRows = [...rows]
      updatedRows[rowIndex] = {
        ...updatedRows[rowIndex],
        [column]: newValue
      }
      setRows(updatedRows)

      // Si hay un callback, llamarlo
      if (onCellUpdate) {
        await onCellUpdate(rowIndex, column, newValue)
      }
    } catch (error) {
      console.error('Error al guardar celda:', error)
      // Revertir el cambio en caso de error
      setRows(data.rows)
      throw error
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }))
    }
  }

  const isEditable = (column: string): boolean => {
    const columnLower = column.toLowerCase().trim()
    return columnLower === 'cliente' || columnLower === 'responsable'
  }

  // Detectar filas con PARTICULARES (sin obra social) - búsqueda flexible
  // Incluye: nombres de personas, valores vacíos, y "042 - PARTICULARES" / "PARTICULARES"
  // (estos últimos porque pueden haber sido convertidos desde nombres de pacientes)
  const filasParticulares = useMemo(() => {
    const indices: Set<number> = new Set()
    
    // Buscar columna de cliente/obra social con múltiples variaciones
    const clienteIndex = data.headers.findIndex(h => {
      const hLower = h.toLowerCase().trim()
      return hLower === 'cliente' || 
             hLower.includes('obra social') || 
             hLower === 'obra social' ||
             hLower === 'obra' ||
             (hLower.includes('obra') && hLower.includes('social'))
    })
    
    if (clienteIndex === -1) {
      console.warn('[ExcelDataTable] No se encontró columna de Cliente/Obra Social')
      return indices
    }
    
    const headerCliente = data.headers[clienteIndex]
    
    rows.forEach((row, index) => {
      const cliente = row[headerCliente]
      const clienteStr = cliente ? String(cliente).trim() : ''
      const clienteLower = clienteStr.toLowerCase()
      
      // Detectar si es particular:
      // 1. Si es un nombre de persona (usando esParticular)
      // 2. Si está vacío
      // 3. Si es "042 - PARTICULARES" o "PARTICULARES" (pueden haber sido convertidos desde nombres)
      if (esParticular(cliente) || 
          clienteStr === '' || 
          clienteLower === '042 - particulares' || 
          clienteLower === 'particulares' ||
          clienteLower.includes('042') && clienteLower.includes('particulares')) {
        indices.add(index)
      }
    })
    
    console.log(`[ExcelDataTable] Filas sin obra social detectadas: ${indices.size}`)
    return indices
  }, [rows, data.headers])

  // Detectar filas sin horario de inicio
  const filasSinHorario = useMemo(() => {
    const indices: Set<number> = new Set()
    
    rows.forEach((row, index) => {
      if (!tieneHorario(row, data.headers)) {
        indices.add(index)
      }
    })
    
    return indices
  }, [rows, data.headers])

  // Detectar filas duplicadas
  const filasDuplicadas = useMemo(() => {
    return obtenerIndicesDuplicados(rows, data.headers)
  }, [rows, data.headers])

  // Detectar filas con residentes en horario formativo (optimizado)
  const filasResidenteHorarioFormativo = useMemo(() => {
    const indices: Set<number> = new Set()
    
    // Si no hay especialidad o no hay médicos cargados, retornar vacío
    if (!especialidad || medicos.length === 0 || medicosLoading) {
      return indices
    }

    // Buscar índices de columnas relevantes una sola vez
    const responsableIndex = data.headers.findIndex(h => {
      const hLower = h.toLowerCase().trim()
      return hLower === 'responsable' || hLower.includes('responsable') || hLower.includes('medico')
    })
    const fechaIndex = data.headers.findIndex(h => {
      const hLower = h.toLowerCase().trim()
      return hLower === 'fecha' || hLower.includes('fecha') || hLower.includes('fecha visita')
    })
    const horaIndex = data.headers.findIndex(h => {
      const hLower = h.toLowerCase().trim()
      return hLower.includes('hora') || hLower.includes('horario') || hLower.includes('inicio')
    })

    // Si no encontramos las columnas necesarias, retornar vacío
    if (responsableIndex === -1 || fechaIndex === -1 || horaIndex === -1) {
      return indices
    }

    // Procesar filas
    rows.forEach((row, index) => {
      const responsable = row[data.headers[responsableIndex]]
      const fecha = row[data.headers[fechaIndex]]
      const hora = row[data.headers[horaIndex]]

      // Buscar médico
      const medico = buscarMedico(responsable)
      if (!medico || !medico.es_residente) {
        return // No es residente, continuar
      }

      // Verificar si está en horario formativo
      if (esResidenteHorarioFormativo(fecha, hora, medico.es_residente)) {
        indices.add(index)
      }
    })

    return indices
  }, [rows, data.headers, especialidad, medicos, medicosLoading, buscarMedico])

  // Contar problemas
  const cantidadParticulares = filasParticulares.size
  const cantidadSinHorario = filasSinHorario.size
  const cantidadDuplicados = filasDuplicadas.size
  const cantidadResidenteHorarioFormativo = filasResidenteHorarioFormativo.size

  // Función para eliminar una fila (usa callback del padre si está disponible)
  // NOTA: La confirmación se maneja en ExpandableSection con el modal personalizado
  const handleDeleteRowLocal = useCallback(async (rowIndex: number) => {
    if (onDeleteRow) {
      // Usar callback del padre (elimina de BD y actualiza ExcelData)
      // La confirmación ya se hizo en ExpandableSection
      await onDeleteRow(rowIndex)
      // El padre actualizará excelData, pero también actualizamos local para UI inmediata
      const updatedRows = rows.filter((_, index) => index !== rowIndex)
      setRows(updatedRows)
      data.rows = updatedRows
    } else {
      // Fallback: solo actualizar local (modo legacy, sin confirmación porque no hay modal)
    const updatedRows = rows.filter((_, index) => index !== rowIndex)
    setRows(updatedRows)
      data.rows = updatedRows
    }
  }, [rows, data, onDeleteRow])

  // Funciones para eliminar múltiples filas (optimizado: batch)
  const handleDeleteRows = useCallback(async (indices: Set<number>) => {
    if (onDeleteRow) {
      // Eliminar en batch usando el callback del padre
      const indicesArray = Array.from(indices).sort((a, b) => b - a) // Orden inverso para evitar problemas de índices
      for (const index of indicesArray) {
        await onDeleteRow(index)
      }
    } else {
      // Fallback: solo actualizar local
      const updatedRows = rows.filter((_, index) => !indices.has(index))
      setRows(updatedRows)
      data.rows = updatedRows
    }
  }, [rows, data, onDeleteRow])

  // Obtener filas filtradas por tipo
  const filasParticularesList = useMemo(() => {
    return rows.filter((row, index) => filasParticulares.has(index))
  }, [rows, filasParticulares])

  const filasSinHorarioList = useMemo(() => {
    return rows.filter((row, index) => filasSinHorario.has(index))
  }, [rows, filasSinHorario])

  const filasDuplicadasList = useMemo(() => {
    return rows.filter((row, index) => filasDuplicadas.has(index))
  }, [rows, filasDuplicadas])

  const filasResidenteFormativoList = useMemo(() => {
    return rows.filter((row, index) => filasResidenteHorarioFormativo.has(index))
  }, [rows, filasResidenteHorarioFormativo])

  // Funciones para eliminar todos de cada sección
  const handleDeleteAllParticulares = useCallback(async () => {
    await handleDeleteRows(filasParticulares)
  }, [filasParticulares, handleDeleteRows])

  const handleDeleteAllSinHorario = useCallback(async () => {
    await handleDeleteRows(filasSinHorario)
  }, [filasSinHorario, handleDeleteRows])

  const handleDeleteAllDuplicados = useCallback(async () => {
    await handleDeleteRows(filasDuplicadas)
  }, [filasDuplicadas, handleDeleteRows])

  const handleDeleteAllResidenteFormativo = useCallback(async () => {
    await handleDeleteRows(filasResidenteHorarioFormativo)
  }, [filasResidenteHorarioFormativo, handleDeleteRows])

  return (
    <div className="w-full space-y-4">
      {/* Información del período */}
      {data.periodo && (
        <div 
          className="p-4 rounded-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}
        >
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">Período analizado:</span>
            <span className="text-white">
              {data.periodo.desde} - {data.periodo.hasta}
            </span>
          </div>
        </div>
      )}

      {/* Sección expandible: Registros sin obra social */}
      <ExpandableSection
        title={`⚠️ ${cantidadParticulares} registro${cantidadParticulares > 1 ? 's' : ''} sin obra social detectado${cantidadParticulares > 1 ? 's' : ''}`}
        count={cantidadParticulares}
        description='Estos registros deben ser revisados. Si son pacientes particulares, edite la columna "Cliente" y agregue: "042 - PARTICULARES"'
        icon={<AlertCircle className="h-6 w-6 flex-shrink-0" />}
        bgColor="rgba(251, 191, 36, 0.15)"
        borderColor="rgba(251, 191, 36, 0.5)"
        textColor="#fbbf24"
        rows={filasParticularesList}
        data={data}
        onCellUpdate={onCellUpdate}
        onDeleteRow={handleDeleteRowLocal}
        onDeleteAll={handleDeleteAllParticulares}
        allowEdit={true}
        allowDelete={true}
        mes={mes}
        anio={anio}
        sectionKey="sin_obra_social"
      />

      {/* Sección expandible: Registros sin horario */}
      <ExpandableSection
        title={`⚠️ ${cantidadSinHorario} registro${cantidadSinHorario > 1 ? 's' : ''} sin horario de inicio detectado${cantidadSinHorario > 1 ? 's' : ''}`}
        count={cantidadSinHorario}
        description="Estos registros indican que el paciente no se atendió. Deben ser eliminados."
        icon={<Clock className="h-6 w-6 flex-shrink-0" />}
        bgColor="rgba(239, 68, 68, 0.15)"
        borderColor="rgba(239, 68, 68, 0.5)"
        textColor="#ef4444"
        rows={filasSinHorarioList}
        data={data}
        onDeleteRow={handleDeleteRowLocal}
        onDeleteAll={handleDeleteAllSinHorario}
        allowDelete={true}
        mes={mes}
        anio={anio}
        sectionKey="sin_horario"
        valoresConsultas={valoresConsultas}
        adicionales={adicionales}
      />

      {/* Sección expandible: Registros duplicados */}
      <ExpandableSection
        title={`⚠️ ${cantidadDuplicados} registro${cantidadDuplicados > 1 ? 's' : ''} duplicado${cantidadDuplicados > 1 ? 's' : ''} detectado${cantidadDuplicados > 1 ? 's' : ''}`}
        count={cantidadDuplicados}
        description="Se detectaron filas completamente iguales (misma fecha, misma hora, mismo todo). Revise y elimine los duplicados si es necesario."
        icon={<AlertCircle className="h-6 w-6 flex-shrink-0" />}
        bgColor="rgba(168, 85, 247, 0.15)"
        borderColor="rgba(168, 85, 247, 0.5)"
        textColor="#a855f7"
        rows={filasDuplicadasList}
        data={data}
        onDeleteRow={handleDeleteRowLocal}
        onDeleteAll={handleDeleteAllDuplicados}
        allowDelete={true}
        mes={mes}
        anio={anio}
        sectionKey="duplicados"
        valoresConsultas={valoresConsultas}
        adicionales={adicionales}
      />

      {/* Sección expandible: Residentes en horario formativo */}
      <ExpandableSection
        title={`ℹ️ ${cantidadResidenteHorarioFormativo} consulta${cantidadResidenteHorarioFormativo > 1 ? 's' : ''} de residente${cantidadResidenteHorarioFormativo > 1 ? 's' : ''} en horario formativo detectada${cantidadResidenteHorarioFormativo > 1 ? 's' : ''}`}
        count={cantidadResidenteHorarioFormativo}
        description="Estas consultas son de residentes realizadas entre lunes a sábado de 07:00 a 15:00. NO se deben pagar según las reglas del sistema."
        icon={<UserX className="h-6 w-6 flex-shrink-0" />}
        bgColor="rgba(59, 130, 246, 0.15)"
        borderColor="rgba(59, 130, 246, 0.5)"
        textColor="#3b82f6"
        rows={filasResidenteFormativoList}
        data={data}
        onDeleteRow={handleDeleteRowLocal}
        onDeleteAll={handleDeleteAllResidenteFormativo}
        allowDelete={true}
        mes={mes}
        anio={anio}
        sectionKey="residente_formativo"
        valoresConsultas={valoresConsultas}
        adicionales={adicionales}
      />

      {/* 5to recuadro: Detalle completo */}
      <ExpandableSection
        title={`📊 Ver detalle completo (${rows.length} registros)`}
        count={rows.length}
        description="Muestra todos los registros del Excel para revisión completa con colores según reglas."
        icon={<Database className="h-6 w-6 flex-shrink-0" />}
        bgColor="rgba(34, 197, 94, 0.15)"
        borderColor="rgba(34, 197, 94, 0.5)"
        textColor="#22c55e"
        rows={rows}
        data={data}
        onCellUpdate={onCellUpdate}
        onDeleteRow={handleDeleteRowLocal}
        allowEdit={true}
        allowDelete={true}
        mes={mes}
        anio={anio}
        sectionKey="detalle_completo"
        esParticularRow={(rowIndex) => filasParticulares.has(rowIndex)}
        esSinHorarioRow={(rowIndex) => filasSinHorario.has(rowIndex)}
        esDuplicadoRow={(rowIndex) => filasDuplicadas.has(rowIndex)}
        esResidenteFormativoRow={(rowIndex) => filasResidenteHorarioFormativo.has(rowIndex)}
        valoresConsultas={valoresConsultas}
        adicionales={adicionales}
      />
      <div className="text-sm text-gray-400">
        Total de filas: <span className="text-green-400 font-semibold">{rows.length}</span>
        {' • '}
        Columnas: <span className="text-green-400 font-semibold">{data.headers.length}</span>
        {cantidadParticulares > 0 && (
          <>
            {' • '}
            Sin obra social: <span className="text-yellow-400 font-semibold">{cantidadParticulares}</span>
          </>
        )}
        {cantidadSinHorario > 0 && (
          <>
            {' • '}
            Sin horario: <span className="text-red-400 font-semibold">{cantidadSinHorario}</span>
          </>
        )}
        {cantidadDuplicados > 0 && (
          <>
            {' • '}
            Duplicados: <span className="text-purple-400 font-semibold">{cantidadDuplicados}</span>
          </>
        )}
        {cantidadResidenteHorarioFormativo > 0 && (
          <>
            {' • '}
            Residente formativo: <span className="text-blue-400 font-semibold">{cantidadResidenteHorarioFormativo}</span>
          </>
        )}
      </div>
    </div>
  )
}

