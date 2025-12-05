'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ObraSocialDropdownProps {
  value: string | null
  onSelect: (obraSocial: string) => void
  onCancel?: () => void
  className?: string
}

export function ObraSocialDropdown({ value, onSelect, onCancel, className }: ObraSocialDropdownProps) {
  const [isOpen, setIsOpen] = useState(true) // Abrir automáticamente al renderizar
  const [searchTerm, setSearchTerm] = useState(value ? String(value) : '')
  const [obrasSociales, setObrasSociales] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cargar todas las obras sociales al montar
  useEffect(() => {
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

        while (hasMore) {
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

        // Obtener obras sociales únicas y ordenadas
        const obrasUnicas = Array.from(new Set(todasLasObras)).sort() as string[]
        setObrasSociales(obrasUnicas)
      } catch (error) {
        console.error('Error cargando obras sociales:', error)
      } finally {
        setLoading(false)
      }
    }

    cargarObrasSociales()
  }, [])

  // Inicializar searchTerm con el valor actual cuando se abre y abrir automáticamente
  useEffect(() => {
    if (isOpen) {
      if (value) {
        setSearchTerm(String(value))
      } else {
        setSearchTerm('')
      }
      // Enfocar el input cuando se abre
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }, [isOpen, value])

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
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Abrir dropdown cuando se hace focus en el input
  const handleOpen = useCallback(() => {
    if (!isOpen) {
      setIsOpen(true)
    }
  }, [isOpen])

  // Seleccionar obra social
  const handleSelect = useCallback((obra: string) => {
    onSelect(obra)
    setIsOpen(false)
    setSearchTerm('')
  }, [onSelect])

  // Manejar teclas
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchTerm('')
      onCancel?.()
    } else if (e.key === 'Enter' && obrasFiltradas.length > 0) {
      handleSelect(obrasFiltradas[0])
    } else if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault()
      // Podrías implementar navegación con flechas aquí
    }
  }, [obrasFiltradas, handleSelect, onCancel, isOpen])

  return (
    <div ref={dropdownRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleOpen}
          onKeyDown={handleKeyDown}
          placeholder="Buscar obra social..."
          className="h-8 bg-gray-800 border-green-500/50 focus:border-green-400 text-white pr-8"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <div className="h-4 w-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-green-500/50 rounded-md shadow-lg max-h-60 overflow-auto">
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
                  key={idx}
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

