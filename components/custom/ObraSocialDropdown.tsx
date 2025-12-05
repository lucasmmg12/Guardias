'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ObraSocialDropdownProps {
  value: string | null
  onSelect: (obraSocial: string) => void
  onCancel?: () => void
  className?: string
}

export function ObraSocialDropdown({ value, onSelect, onCancel, className }: ObraSocialDropdownProps) {
  // ✅ TODOS LOS HOOKS PRIMERO (siempre se ejecutan)
  const [isOpen, setIsOpen] = useState(false)
  const [obrasSociales, setObrasSociales] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Cargar todas las obras sociales al montar
  useEffect(() => {
    let isMounted = true
    
    async function cargarObrasSociales() {
      try {
        setLoading(true)
        
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

          if (errorPagina) {
            console.error('Error cargando obras sociales:', errorPagina)
            break
          }

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

  // Inicializar searchTerm con el value cuando se abre o cambia el value
  useEffect(() => {
    if (isOpen) {
      setSearchTerm(value || '')
      // Enfocar el input cuando se abre
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, value])

  // Debounce del término de búsqueda (500ms) - NO interfiere con la escritura
  useEffect(() => {
    // Limpiar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Solo aplicar debounce si el dropdown está abierto
    if (isOpen) {
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedSearch(searchTerm)
      }, 500)
    } else {
      // Si se cierra, limpiar búsqueda
      setDebouncedSearch('')
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchTerm, isOpen])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        // Restaurar el valor original al cerrar sin seleccionar
        setSearchTerm(value || '')
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
  }, [isOpen, value])

  // Filtrar obras sociales basándose en la búsqueda con debounce
  const obrasFiltradas = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return obrasSociales.slice(0, 50) // Limitar a 50 para mejor rendimiento
    }

    const searchLower = debouncedSearch.toLowerCase().trim()
    return obrasSociales.filter(obra => 
      obra.toLowerCase().includes(searchLower)
    ).slice(0, 50) // Limitar a 50 resultados
  }, [obrasSociales, debouncedSearch])

  // Seleccionar obra social
  const handleSelect = useCallback((obra: string) => {
    setIsOpen(false)
    setSearchTerm(obra)
    setDebouncedSearch(obra)
    onSelect(obra)
  }, [onSelect])

  // Manejar cambio en el input (sin debounce - respuesta inmediata)
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevoValor = e.target.value
    setSearchTerm(nuevoValor) // Actualización inmediata para que el usuario vea lo que escribe
    
    // Abrir dropdown si no está abierto
    if (!isOpen) {
      setIsOpen(true)
    }
  }, [isOpen])

  // Manejar teclas
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()
    
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchTerm(value || '')
      onCancel?.()
    } else if (e.key === 'Enter' && obrasFiltradas.length === 1) {
      // Si hay solo un resultado, seleccionarlo con Enter
      e.preventDefault()
      handleSelect(obrasFiltradas[0])
    } else if (e.key === 'Enter' && searchTerm.trim() && obrasFiltradas.length === 0) {
      // Si no hay resultados pero hay texto, usar ese texto como valor
      e.preventDefault()
      handleSelect(searchTerm.trim())
    }
  }, [onCancel, obrasFiltradas, searchTerm, value, handleSelect])

  // Abrir dropdown
  const handleOpen = useCallback(() => {
    setIsOpen(true)
  }, [])

  // Limpiar búsqueda
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setSearchTerm('')
    inputRef.current?.focus()
  }, [])

  // ✅ Returns condicionales DESPUÉS de todos los hooks
  return (
    <div ref={dropdownRef} className={cn("relative w-full", className)} onClick={(e) => e.stopPropagation()}>
      {/* Input de búsqueda siempre visible */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onClick={handleOpen}
          placeholder={value || "Buscar obra social..."}
          className="h-8 w-full bg-gray-800 border-green-500/50 text-white placeholder:text-gray-500 focus:border-green-400 focus:ring-green-400/20 pr-8"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            tabIndex={-1}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown con resultados */}
      {isOpen && (
        <div 
          className="absolute z-[9999] w-full mt-1 bg-gray-800 border border-green-500/50 rounded-md shadow-lg max-h-60 overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-300 text-center">
              Cargando obras sociales...
            </div>
          ) : obrasFiltradas.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-300 text-center">
              {debouncedSearch.trim() ? (
                <div>
                  <div className="mb-2">No se encontraron resultados</div>
                  <button
                    type="button"
                    onClick={() => handleSelect(searchTerm.trim())}
                    className="text-xs text-green-400 hover:text-green-300 underline"
                  >
                    Usar "{searchTerm.trim()}" como valor
                  </button>
                </div>
              ) : (
                'No hay obras sociales disponibles'
              )}
            </div>
          ) : (
            <div className="py-1">
              {obrasFiltradas.map((obra) => (
                <button
                  key={obra}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelect(obra)
                  }}
                  className={cn(
                    "w-full px-4 py-2 text-left text-sm transition-colors",
                    value === obra
                      ? "bg-green-500/30 text-white font-semibold"
                      : "text-gray-200 hover:bg-green-500/20 hover:text-white"
                  )}
                >
                  {obra}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
