'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ValorConsultaObraSocial } from '@/lib/types'
import { UploadExcel } from '@/components/custom/UploadExcel'
import { InlineEditCell } from '@/components/custom/InlineEditCell'
import { Button } from '@/components/ui/button'
import { Lightbulb, Star, Plus, Copy, CopyCheck, Upload } from 'lucide-react'
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
  'CONSULTA DE GUARDIA CLINIC',
  'CONSULTA PEDIATRICA Y NEONATAL',
  'CONSULTA DE GUARDIA PEDIATRICA',
  'CONSULTA GINECOLOGICA',
  'CONSULTA DE GUARDIA GINECOLOGICA',
  'CONSULTA EN INTERNADOS',
  'INTERCONSULTAS',
  'CONSULTA CARDIOLOGICA',
  'E.C.G.',
]

export default function ValoresConsultasPage() {
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [valores, setValores] = useState<ValorConsultaObraSocial[]>([])
  const [obrasSociales, setObrasSociales] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [copiarConAumento, setCopiarConAumento] = useState(false)
  const [porcentajeAumento, setPorcentajeAumento] = useState(0)

  useEffect(() => {
    cargarValores()
  }, [mes, anio])

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
        alert('No se encontró la columna "OBRA SOCIAL / PREPAGA" en el archivo')
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
            nuevosValores.push({
              obra_social: String(obraSocial).trim(),
              tipo_consulta: header.trim(),
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
      alert(`Se importaron ${nuevosValores.length} valores correctamente`)
    } catch (error) {
      console.error('Error importando Excel:', error)
      alert('Error al importar el archivo Excel: ' + (error instanceof Error ? error.message : 'Error desconocido'))
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
        alert('No hay valores en el mes anterior para copiar')
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
      alert(`Se copiaron ${nuevosValores.length} valores desde ${MESES[mesAnterior - 1].label} ${anioAnterior}`)
    } catch (error) {
      console.error('Error copiando desde mes anterior:', error)
      alert('Error al copiar valores: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  async function handleAgregarObraSocial() {
    const nombre = prompt('Ingrese el nombre de la obra social (ej: "001 - PROVINCIA"):')
    if (!nombre || !nombre.trim()) return

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
        alert('Esta obra social ya existe para el mes y año seleccionados')
        return
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
      alert('Obra social agregada correctamente')
    } catch (error) {
      console.error('Error agregando obra social:', error)
      alert('Error al agregar obra social: ' + (error instanceof Error ? error.message : 'Error desconocido'))
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
            onClick={handleAgregarObraSocial}
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
                    className="px-4 py-3 text-left text-sm font-semibold text-green-400 bg-green-500/20 border-b border-green-500/30 sticky left-0 z-10"
                    style={{ minWidth: '200px' }}
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
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td 
                      colSpan={TIPOS_CONSULTA.length + 1}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      Cargando...
                    </td>
                  </tr>
                ) : tablaData.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={TIPOS_CONSULTA.length + 1}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No hay datos para el mes seleccionado. Use "Importar Excel" o "Copiar desde mes anterior" para comenzar.
                    </td>
                  </tr>
                ) : (
                  tablaData.map((fila, index) => (
                    <tr
                      key={fila.obra_social}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td 
                        className="px-4 py-3 text-sm text-gray-300 font-medium sticky left-0 bg-gray-900/95"
                        style={{ minWidth: '200px' }}
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

