'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ObraSocialDropdownProps {
  value: string | null
  onSelect: (obraSocial: string) => void
  onCancel?: () => void
  className?: string
}

export function ObraSocialDropdown({ value, onSelect, onCancel, className }: ObraSocialDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(value ? String(value) : '')
  const [obrasSociales, setObrasSociales] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isInitialMount = useRef(true)

  // Cargar todas las obras sociales al montar
  useEffect(() => {
    let isMounted = true
    
    async function cargarObrasSociales() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('valores_consultas_obra_social')
          .select('obra_social')
          .order('obra_social', { ascending: true })

        if (error) throw error

        // Obtener obras sociales únicas y ordenadas usando paginación
        let todasLasObras: string[] = []
        const pageSize = 1000
        let from = 0
        let hasMore = true

        while (hasMore && isMounted) {
          const { data: pagina, error: errorPagina } = await supabase
            .from('valores_consultas_obra_social')
            .select('obra_social')
            .order('obra_social', { ascending: true })
            .range(from, from + pageSize - 1)

          if (errorPagina) throw errorPagina

          if (!pagina || pagina.length === 0) {
            hasMore = false
            break
          }

          const obrasPagina = (pagina || []).map((v: any) => v.obra_social).filter(Boolean)
          todasLasObras = [...todasLasObras, ...obrasPagina]

          if (pagina.length < pageSize) {
            hasMore = false
          } else {
            from += pageSize
          }
        }

        if (isMounted) {
          // Obtener obras sociales únicas y ordenadas
          const obrasUnicas = Array.from(new Set(todasLasObras)).sort() as string[]
          setObrasSociales(obrasUnicas)
        }
      } catch (error) {
        console.error('Error cargando obras sociales:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    cargarObrasSociales()

    return () => {
      isMounted = false
    }
  }, [])

  // Inicializar searchTerm solo una vez al montar
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      setSearchTerm(value ? String(value) : '')
    }
  }, []) // Solo al montar

  // Sincronizar searchTerm con value solo si no está abierto (para evitar bucles)
  useEffect(() => {
    if (!isOpen && value !== null) {
      const valueStr = String(value)
      // Solo actualizar si es diferente para evitar bucles
      setSearchTerm(prev => prev !== valueStr ? valueStr : prev)
    }
  }, [value, isOpen]) // Removido searchTerm de dependencias para evitar bucles

  // Enfocar el input cuando se abre el dropdown
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Debounce de 500ms para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Filtrar obras sociales basado en búsqueda
  const obrasFiltradas = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return obrasSociales.slice(0, 50) // Limitar a 50 para mejor rendimiento
    }

    const searchLower = debouncedSearch.toLowerCase().trim()
    return obrasSociales
      .filter(obra => obra.toLowerCase().includes(searchLower))
      .slice(0, 50) // Limitar resultados a 50
  }, [obrasSociales, debouncedSearch])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        // No resetear searchTerm aquí para mantener el valor
      }
    }

    // Usar un pequeño delay para evitar que se cierre inmediatamente al abrir
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Abrir dropdown cuando se hace focus en el input
  const handleOpen = useCallback(() => {
    setIsOpen(true)
  }, [])

  // Seleccionar obra social
  const handleSelect = useCallback((obra: string) => {
    setIsOpen(false)
    // Llamar onSelect de forma síncrona pero después de cerrar
    onSelect(obra)
  }, [onSelect])

  // Manejar teclas
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchTerm(value ? String(value) : '')
      onCancel?.()
    } else if (e.key === 'Enter' && obrasFiltradas.length > 0) {
      handleSelect(obrasFiltradas[0])
    }
  }, [obrasFiltradas, handleSelect, onCancel, value])

  return (
    <div ref={dropdownRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            if (!isOpen) {
              setIsOpen(true)
            }
          }}
          onFocus={handleOpen}
          onKeyDown={handleKeyDown}
          onClick={handleOpen}
          placeholder="Buscar obra social..."
          className="h-8 bg-gray-800 border-green-500/50 focus:border-green-400 text-white pr-8"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <div className="h-4 w-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-gray-800 border border-green-500/50 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-400 text-center">
              Cargando obras sociales...
            </div>
          ) : obrasFiltradas.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-400 text-center">
              {debouncedSearch.trim() ? 'No se encontraron obras sociales' : 'Escriba para buscar...'}
            </div>
          ) : (
            <div className="py-1">
              {obrasFiltradas.map((obra, idx) => (
                <button
                  key={`${obra}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(obra)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-green-500/20 hover:text-white transition-colors"
                >
                  {obra}
                </button>
              ))}
              {obrasFiltradas.length === 50 && (
                <div className="px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-700">
                  Mostrando primeros 50 resultados. Refine su búsqueda para más opciones.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

