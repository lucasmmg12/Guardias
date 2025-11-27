'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ValorConsultaObraSocial } from '@/lib/types'
import { UploadExcel } from '@/components/custom/UploadExcel'
import { InlineEditCell } from '@/components/custom/InlineEditCell'
import { NotificationModal, NotificationType } from '@/components/custom/NotificationModal'
import { ObraSocialFormModal } from '@/components/custom/ObraSocialFormModal'
import { Button } from '@/components/ui/button'
import { Lightbulb, Star, Plus, Copy, CopyCheck, Upload, Trash2 } from 'lucide-react'
import * as XLSX from 'xlsx'

const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

const TIPOS_CONSULTA = [
  'CONSULTA',
  'CONSULTA DE GUARDIA CLINICA',
  'CONSULTA PEDIATRICA Y NEONATAL',
  'CONSULTA DE GUARDIA PEDIATRICA',
  'CONSULTA GINECOLOGICA',
  'CONSULTA DE GUARDIA GINECOLOGICA',
  'CONSULTA EN INTERNADOS',
  'INTERCONSULTAS',
  'CONSULTA CARDIOLOGICA',
  'E.C.G.',
]

// Función para normalizar nombres de tipos de consulta (maneja variaciones)
function normalizarTipoConsulta(header: string): string {
  const headerUpper = header.toUpperCase().trim()
  
  // Mapeo de variaciones a nombres estándar
  const mapeo: { [key: string]: string } = {
    'CONSULTA': 'CONSULTA',
    'CONSULTA DE GUARDIA CLINIC': 'CONSULTA DE GUARDIA CLINICA',
    'CONSULTA DE GUARDIA CLINICA': 'CONSULTA DE GUARDIA CLINICA',
    'CONSULTA DE GUARDIA CLÍNICA': 'CONSULTA DE GUARDIA CLINICA',
    'CONSULTA DE GUARDIA CLÍNIC': 'CONSULTA DE GUARDIA CLINICA',
    'CONSULTA PEDIATRICA Y NEONATAL': 'CONSULTA PEDIATRICA Y NEONATAL',
    'CONSULTA DE GUARDIA PEDIATRICA': 'CONSULTA DE GUARDIA PEDIATRICA',
    'CONSULTA GINECOLOGICA': 'CONSULTA GINECOLOGICA',
    'CONSULTA DE GUARDIA GINECOLOGICA': 'CONSULTA DE GUARDIA GINECOLOGICA',
    'CONSULTA EN INTERNADOS': 'CONSULTA EN INTERNADOS',
    'INTERCONSULTAS': 'INTERCONSULTAS',
    'CONSULTA CARDIOLOGICA': 'CONSULTA CARDIOLOGICA',
    'E.C.G.': 'E.C.G.',
    'ECG': 'E.C.G.',
  }
  
  // Buscar coincidencia exacta
  if (mapeo[headerUpper]) {
    return mapeo[headerUpper]
  }
  
  // Buscar coincidencia parcial (contiene)
  for (const [variacion, estandar] of Object.entries(mapeo)) {
    if (headerUpper.includes(variacion) || variacion.includes(headerUpper)) {
      return estandar
    }
  }
  
  // Si no encuentra coincidencia, normalizar y buscar por palabras clave
  if (headerUpper.includes('GUARDIA') && headerUpper.includes('CLINIC')) {
    return 'CONSULTA DE GUARDIA CLINICA'
  }
  if (headerUpper.includes('GUARDIA') && headerUpper.includes('PEDIATRIC')) {
    return 'CONSULTA DE GUARDIA PEDIATRICA'
  }
  if (headerUpper.includes('GUARDIA') && headerUpper.includes('GINECOLOGIC')) {
    return 'CONSULTA DE GUARDIA GINECOLOGICA'
  }
  if (headerUpper.includes('PEDIATRIC') && headerUpper.includes('NEONATAL')) {
    return 'CONSULTA PEDIATRICA Y NEONATAL'
  }
  if (headerUpper.includes('INTERNADOS')) {
    return 'CONSULTA EN INTERNADOS'
  }
  if (headerUpper.includes('INTERCONSULTA')) {
    return 'INTERCONSULTAS'
  }
  if (headerUpper.includes('CARDIOLOGIC')) {
    return 'CONSULTA CARDIOLOGICA'
  }
  if (headerUpper.includes('GINECOLOGIC') && !headerUpper.includes('GUARDIA')) {
    return 'CONSULTA GINECOLOGICA'
  }
  if (headerUpper.includes('ECG') || headerUpper === 'E.C.G.') {
    return 'E.C.G.'
  }
  if (headerUpper === 'CONSULTA' || headerUpper.includes('CONSULTA') && !headerUpper.includes('GUARDIA')) {
    return 'CONSULTA'
  }
  
  // Si no se encuentra ninguna coincidencia, devolver el header original normalizado
  return headerUpper
}

export default function ValoresConsultasPage() {
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [valores, setValores] = useState<ValorConsultaObraSocial[]>([])
  const [obrasSociales, setObrasSociales] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showObraSocialModal, setShowObraSocialModal] = useState(false)
  const [copiarConAumento, setCopiarConAumento] = useState(false)
  const [porcentajeAumento, setPorcentajeAumento] = useState(0)
  const [notification, setNotification] = useState<{
    isOpen: boolean
    type: NotificationType
    title?: string
    message: string
  }>({
    isOpen: false,
    type: 'info',
    message: ''
  })

  useEffect(() => {
    cargarValores()
  }, [mes, anio])

  const showNotification = (type: NotificationType, message: string, title?: string) => {
    setNotification({
      isOpen: true,
      type,
      message,
      title
    })
  }

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }))
  }

  async function cargarValores() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('valores_consultas_obra_social')
        .select('*')
        .eq('mes', mes)
        .eq('anio', anio)
        .order('obra_social', { ascending: true })

      if (error) throw error

      const valoresData = (data || []) as ValorConsultaObraSocial[]
      setValores(valoresData)
      
      // Extraer obras sociales únicas
      const obrasUnicas = [...new Set(valoresData.map(v => v.obra_social))]
      setObrasSociales(obrasUnicas)
    } catch (error) {
      console.error('Error cargando valores:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUploadExcel(file: File) {
    try {
      setLoading(true)
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      // Leer fila 2 (índice 1) para headers
      const headers: string[] = []
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
      
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col })
        const cell = worksheet[cellAddress]
        if (cell && cell.v) {
          headers.push(String(cell.v).trim())
        }
      }

      // Encontrar índices de columnas importantes
      const obraSocialIndex = headers.findIndex(h => 
        h.toLowerCase().includes('obra social') || h.toLowerCase().includes('prepaga')
      )
      const vigenciaIndex = headers.findIndex(h => 
        h.toLowerCase().includes('vigencia')
      )

      if (obraSocialIndex === -1) {
        showNotification('error', 'No se encontró la columna "OBRA SOCIAL / PREPAGA" en el archivo', 'Error de formato')
        return
      }

      // Leer datos desde fila 3 (índice 2)
      const nuevosValores: any[] = []
      
      for (let row = 2; row <= range.e.r; row++) {
        const obraSocialCell = XLSX.utils.encode_cell({ r: row, c: obraSocialIndex })
        const obraSocial = worksheet[obraSocialCell]?.v
        
        if (!obraSocial) continue

        const vigenciaCell = XLSX.utils.encode_cell({ r: row, c: vigenciaIndex })
        let vigencia: string | null = null
        if (worksheet[vigenciaCell]) {
          const fecha = worksheet[vigenciaCell].v
          if (fecha instanceof Date) {
            vigencia = fecha.toISOString().split('T')[0]
          } else if (typeof fecha === 'number') {
            // Fecha serial de Excel
            const excelDate = XLSX.SSF.parse_date_code(fecha)
            if (excelDate) {
              vigencia = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`
            }
          } else if (typeof fecha === 'string') {
            // Formato DD/MM/YYYY
            const partes = fecha.split('/')
            if (partes.length === 3) {
              vigencia = `${partes[2]}-${partes[1]}-${partes[0]}`
            }
          }
        }

        // Leer valores de cada tipo de consulta
        headers.forEach((header, colIndex) => {
          if (colIndex === obraSocialIndex || colIndex === vigenciaIndex) return
          
          const cell = XLSX.utils.encode_cell({ r: row, c: colIndex })
          const cellData = worksheet[cell]
          
          if (!cellData) return
          
          let valor: number | null = null
          
          // Procesar el valor según el tipo
          if (typeof cellData.v === 'number') {
            valor = cellData.v
          } else if (typeof cellData.v === 'string') {
            // Intentar convertir string a número (remover $, espacios, comas)
            const cleaned = cellData.v.replace(/[$,\s]/g, '').trim()
            const parsed = parseFloat(cleaned)
            if (!isNaN(parsed)) {
              valor = parsed
            }
          }
          
          if (valor !== null && valor > 0) {
            // Normalizar el nombre del tipo de consulta
            const tipoConsultaNormalizado = normalizarTipoConsulta(header)
            
            nuevosValores.push({
              obra_social: String(obraSocial).trim(),
              tipo_consulta: tipoConsultaNormalizado,
              valor: valor,
              vigencia: vigencia,
              mes: mes,
              anio: anio
            })
          }
        })
      }

      // Eliminar valores existentes del mes/año
      await supabase
        .from('valores_consultas_obra_social')
        .delete()
        .eq('mes', mes)
        .eq('anio', anio)

      // Insertar nuevos valores
      if (nuevosValores.length > 0) {
        const { error } = await supabase
          .from('valores_consultas_obra_social')
          // @ts-ignore - La tabla no está en los tipos generados de Supabase aún
          .insert(nuevosValores)

        if (error) throw error
      }

      await cargarValores()
      setShowUpload(false)
      showNotification('success', `Se importaron ${nuevosValores.length} valores correctamente`, 'Importación exitosa')
    } catch (error) {
      console.error('Error importando Excel:', error)
      showNotification('error', 'Error al importar el archivo Excel: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'Error de importación')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopiarDesdeMesAnterior() {
    try {
      setLoading(true)
      
      // Calcular mes anterior
      let mesAnterior = mes - 1
      let anioAnterior = anio
      if (mesAnterior === 0) {
        mesAnterior = 12
        anioAnterior = anio - 1
      }

      // Obtener valores del mes anterior
      const { data: valoresAnteriores, error } = await supabase
        .from('valores_consultas_obra_social')
        .select('*')
        .eq('mes', mesAnterior)
        .eq('anio', anioAnterior)

      if (error) throw error

      const valoresAnterioresData = (valoresAnteriores || []) as ValorConsultaObraSocial[]

      if (valoresAnterioresData.length === 0) {
        showNotification('warning', 'No hay valores en el mes anterior para copiar', 'Sin datos')
        return
      }

      // Eliminar valores existentes del mes actual
      await supabase
        .from('valores_consultas_obra_social')
        .delete()
        .eq('mes', mes)
        .eq('anio', anio)

      // Copiar valores con o sin aumento
      const nuevosValores = valoresAnterioresData.map(v => ({
        obra_social: v.obra_social,
        tipo_consulta: v.tipo_consulta,
        valor: copiarConAumento 
          ? Number((v.valor * (1 + porcentajeAumento / 100)).toFixed(2))
          : v.valor,
        vigencia: v.vigencia,
        mes: mes,
        anio: anio
      }))

      const { error: insertError } = await supabase
        .from('valores_consultas_obra_social')
        // @ts-ignore - La tabla no está en los tipos generados de Supabase aún
        .insert(nuevosValores)

      if (insertError) throw insertError

      await cargarValores()
      showNotification('success', `Se copiaron ${nuevosValores.length} valores desde ${MESES[mesAnterior - 1].label} ${anioAnterior}`, 'Copia exitosa')
    } catch (error) {
      console.error('Error copiando desde mes anterior:', error)
      showNotification('error', 'Error al copiar valores: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAgregarObraSocial(nombre: string) {
    try {
      // Verificar si ya existe para este mes/año
      const { data: existentes } = await supabase
        .from('valores_consultas_obra_social')
        .select('id')
        .eq('obra_social', nombre.trim())
        .eq('mes', mes)
        .eq('anio', anio)
        .limit(1)

      if (existentes && existentes.length > 0) {
        throw new Error('Esta obra social ya existe para el mes y año seleccionados')
      }

      // Crear valores para todos los tipos de consulta con valor 0
      const nuevosValores = TIPOS_CONSULTA.map(tipo => ({
        obra_social: nombre.trim(),
        tipo_consulta: tipo,
        valor: 0,
        vigencia: null,
        mes: mes,
        anio: anio
      }))

      const { error } = await supabase
        .from('valores_consultas_obra_social')
        // @ts-ignore - La tabla no está en los tipos generados de Supabase aún
        .insert(nuevosValores)

      if (error) throw error

      await cargarValores()
      showNotification('success', 'Obra social agregada correctamente', 'Éxito')
    } catch (error) {
      console.error('Error agregando obra social:', error)
      throw error
    }
  }

  async function handleCellUpdate(
    obraSocial: string,
    tipoConsulta: string,
    newValue: number
  ) {
    try {
      const { error } = await supabase
        .from('valores_consultas_obra_social')
        // @ts-ignore - La tabla no está en los tipos generados de Supabase aún
        .update({ valor: newValue })
        .eq('obra_social', obraSocial)
        .eq('tipo_consulta', tipoConsulta)
        .eq('mes', mes)
        .eq('anio', anio)

      if (error) throw error

      await cargarValores()
    } catch (error) {
      console.error('Error actualizando valor:', error)
      throw error
    }
  }

  async function handleEliminarObraSocial(obraSocial: string) {
    if (!confirm(`¿Está seguro de que desea eliminar la obra social "${obraSocial}" y todos sus valores para ${MESES[mes - 1]} ${anio}?`)) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('valores_consultas_obra_social')
        .delete()
        .eq('obra_social', obraSocial)
        .eq('mes', mes)
        .eq('anio', anio)

      if (error) throw error

      await cargarValores()
      showNotification('success', `Obra social "${obraSocial}" eliminada correctamente`, 'Eliminación exitosa')
    } catch (error) {
      console.error('Error eliminando obra social:', error)
      showNotification('error', 'Error al eliminar la obra social: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'Error')
    } finally {
      setLoading(false)
    }
  }

  // Crear matriz de datos para la tabla
  const tablaData = obrasSociales.map(obraSocial => {
    const fila: { obra_social: string; [key: string]: any } = { obra_social: obraSocial }
    TIPOS_CONSULTA.forEach(tipo => {
      const valor = valores.find(
        v => v.obra_social === obraSocial && v.tipo_consulta === tipo
      )
      fila[tipo] = valor?.valor || 0
    })
    return fila
  })

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-green-400">
            Valores de Consultas por Obra Social
          </h1>
        </div>

        {/* Sección de Instrucciones */}
        <div 
          className="p-4 rounded-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-2 text-yellow-400">
              <Lightbulb className="h-5 w-5" />
              <Star className="h-4 w-4" />
            </div>
            <div className="flex-1 text-sm text-gray-300 space-y-1">
              <p className="font-semibold text-green-400 mb-2">
                ¿Cómo funcionan los valores mensuales?
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>
                  <strong>Primer mes:</strong> Importe el archivo Excel con los valores (botón "Importar Excel")
                </li>
                <li>
                  <strong>Meses siguientes:</strong> Use "Copiar desde mes anterior" o "Copiar con aumento %"
                </li>
                <li>
                  <strong>Histórico:</strong> Cada mes mantiene sus propios valores para consultas históricas
                </li>
                <li>
                  <strong>Edición:</strong> Puede editar valores haciendo clic en la celda
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Selector de Mes y Año */}
        <div 
          className="flex items-center gap-4 p-4 rounded-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">Mes a gestionar:</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="px-3 py-2 bg-gray-800 border border-green-500/50 rounded-lg text-white focus:border-green-400 focus:outline-none"
            >
              {MESES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">Año:</label>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="px-3 py-2 bg-gray-800 border border-green-500/50 rounded-lg text-white w-24 focus:border-green-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => setShowObraSocialModal(true)}
            className="bg-green-600 hover:bg-green-500 text-white"
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Obra Social
          </Button>
          <Button
            onClick={() => setShowUpload(!showUpload)}
            variant="outline"
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
            disabled={loading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar Excel
          </Button>
          <Button
            onClick={handleCopiarDesdeMesAnterior}
            variant="outline"
            className={`border-purple-500/50 text-purple-400 hover:bg-purple-500/20 ${
              !copiarConAumento ? 'bg-purple-500/20' : ''
            }`}
            disabled={loading}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar desde mes anterior
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                if (!copiarConAumento) {
                  const porcentaje = prompt('Ingrese el porcentaje de aumento:')
                  if (porcentaje && !isNaN(Number(porcentaje))) {
                    setPorcentajeAumento(Number(porcentaje))
                    setCopiarConAumento(true)
                  }
                } else {
                  setCopiarConAumento(false)
                  setPorcentajeAumento(0)
                }
              }}
              variant="outline"
              className={`border-purple-500/50 text-purple-400 hover:bg-purple-500/20 ${
                copiarConAumento ? 'bg-purple-500/20' : ''
              }`}
              disabled={loading}
            >
              {copiarConAumento ? (
                <>
                  <CopyCheck className="h-4 w-4 mr-2" />
                  ✓ Copiar con aumento %
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar con aumento %
                </>
              )}
            </Button>
            {copiarConAumento && (
              <input
                type="number"
                value={porcentajeAumento}
                onChange={(e) => setPorcentajeAumento(Number(e.target.value))}
                placeholder="%"
                className="px-2 py-1 bg-gray-800 border border-purple-500/50 rounded text-white w-20 focus:border-purple-400 focus:outline-none"
              />
            )}
          </div>
        </div>

        {/* Upload Excel */}
        {showUpload && (
          <div 
            className="p-4 rounded-xl" 
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <UploadExcel
              onUpload={handleUploadExcel}
              isProcessing={loading}
            />
          </div>
        )}

        {/* Contador */}
        <div className="text-sm text-gray-400">
          Obras sociales configuradas: <span className="text-green-400 font-semibold">{obrasSociales.length}</span>
        </div>

        {/* Tabla de Datos */}
        <div 
          className="rounded-xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-sm font-semibold text-green-400 border-b border-green-500/30 sticky left-0 z-20"
                    style={{ 
                      minWidth: '200px',
                      background: 'rgba(34, 197, 94, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    Obra Social
                  </th>
                  {TIPOS_CONSULTA.map(tipo => (
                    <th
                      key={tipo}
                      className="px-4 py-3 text-left text-sm font-semibold text-green-400 bg-green-500/20 border-b border-green-500/30 whitespace-nowrap"
                      style={{ minWidth: '150px' }}
                    >
                      {tipo}
                    </th>
                  ))}
                  <th 
                    className="px-4 py-3 text-center text-sm font-semibold text-green-400 border-b border-green-500/30 sticky right-0 z-20"
                    style={{ 
                      minWidth: '80px',
                      background: 'rgba(34, 197, 94, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td 
                      colSpan={TIPOS_CONSULTA.length + 2}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      Cargando...
                    </td>
                  </tr>
                ) : tablaData.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={TIPOS_CONSULTA.length + 2}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No hay datos para el mes seleccionado. Use "Importar Excel" o "Copiar desde mes anterior" para comenzar.
                    </td>
                  </tr>
                ) : (
                  tablaData.map((fila, index) => {
                    const esPar = index % 2 === 0
                    return (
                    <tr
                      key={fila.obra_social}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td 
                        className="px-4 py-3 text-sm text-gray-300 font-medium sticky left-0 z-10"
                        style={{ 
                          minWidth: '200px',
                          background: esPar 
                            ? 'rgba(17, 24, 39, 0.95)' 
                            : 'rgba(17, 24, 39, 0.98)',
                          backdropFilter: 'blur(10px)'
                        }}
                      >
                        {fila.obra_social}
                      </td>
                      {TIPOS_CONSULTA.map(tipo => (
                        <td key={tipo} className="px-4 py-3">
                          <InlineEditCell
                            value={fila[tipo]}
                            type="number"
                            onSave={async (newValue) => {
                              await handleCellUpdate(
                                fila.obra_social,
                                tipo,
                                Number(newValue)
                              )
                            }}
                            isEditable={true}
                          />
                        </td>
                      ))}
                      <td 
                        className="px-4 py-3 text-center sticky right-0 z-10"
                        style={{ 
                          minWidth: '80px',
                          background: esPar 
                            ? 'rgba(17, 24, 39, 0.95)' 
                            : 'rgba(17, 24, 39, 0.98)',
                          backdropFilter: 'blur(10px)'
                        }}
                      >
                        <button
                          onClick={() => handleEliminarObraSocial(fila.obra_social)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Eliminar obra social"
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Notificación */}
        <NotificationModal
          isOpen={notification.isOpen}
          onClose={closeNotification}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          duration={notification.type === 'success' ? 3000 : 0}
        />

        {/* Modal de Agregar Obra Social */}
        <ObraSocialFormModal
          isOpen={showObraSocialModal}
          onClose={() => setShowObraSocialModal(false)}
          onSave={handleAgregarObraSocial}
          mes={mes}
          anio={anio}
        />
      </div>
    </div>
  )
}

