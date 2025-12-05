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
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false)
        // Restaurar el valor original al cerrar sin seleccionar
        setSearchTerm(value || '')
      }
    }

    // Usar 'click' en lugar de 'mousedown' para evitar conflictos con los botones
    // Usar capture phase para capturar el evento antes de que se propague
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside, true)
    }
  }, [isOpen, value])

  // Filtrar obras sociales basándose en la búsqueda (SIN debounce - inmediato)
  const obrasFiltradas = useMemo(() => {
    if (!searchTerm.trim()) {
      return obrasSociales.slice(0, 50) // Limitar a 50 para mejor rendimiento
    }

    const searchLower = searchTerm.toLowerCase().trim()
    return obrasSociales.filter(obra => 
      obra.toLowerCase().includes(searchLower)
    ).slice(0, 50) // Limitar a 50 resultados
  }, [obrasSociales, searchTerm])

  // Seleccionar obra social
  const handleSelect = useCallback((obra: string) => {
    // Cerrar dropdown primero
    setIsOpen(false)
    setSearchTerm(obra)
    
    // Usar setTimeout para asegurar que el estado se actualice antes de llamar onSelect
    setTimeout(() => {
      onSelect(obra)
    }, 0)
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
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // ✅ SIEMPRE guardar el texto escrito cuando se presiona Enter
      if (searchTerm.trim()) {
        // Si hay resultados filtrados y solo uno, seleccionarlo
        if (obrasFiltradas.length === 1) {
          handleSelect(obrasFiltradas[0])
        } else {
          // Si hay múltiples resultados o ninguno, usar el texto escrito
          handleSelect(searchTerm.trim())
        }
      } else {
        // Si no hay texto, cerrar sin guardar
        setIsOpen(false)
        onCancel?.()
      }
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
    <>
      {/* Overlay para bloquear clicks en las columnas debajo - BLOQUEO TOTAL */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[9998]"
          onClick={(e) => {
            // Solo cerrar si el click NO es en el dropdown
            const target = e.target as Node
            if (dropdownRef.current && !dropdownRef.current.contains(target)) {
              e.stopPropagation()
              setIsOpen(false)
              setSearchTerm(value || '')
            }
          }}
          onMouseDown={(e) => {
            // Prevenir que el mousedown interfiera con el input
            const target = e.target as Node
            if (dropdownRef.current && dropdownRef.current.contains(target)) {
              e.stopPropagation()
            }
          }}
          style={{ 
            pointerEvents: 'auto',
            // Bloquear completamente las interacciones debajo
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        />
      )}
      
      <div 
        ref={dropdownRef} 
        className={cn("relative w-full", className)} 
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', zIndex: 9999 }}
      >
        {/* Input de búsqueda siempre visible */}
        <div className="relative" style={{ zIndex: 10000 }}>
          <Input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onClick={handleOpen}
            placeholder={value || "Buscar obra social..."}
            className="h-8 w-full bg-gray-800 border-green-500/50 text-white placeholder:text-gray-500 focus:border-green-400 focus:ring-green-400/20 pr-8"
            style={{ position: 'relative', zIndex: 10000 }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              tabIndex={-1}
              style={{ zIndex: 10001 }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdown con resultados - FONDO TOTALMENTE NEGRO */}
        {isOpen && (
          <div 
            className="absolute z-[9999] w-full mt-1 bg-black border border-green-500/50 rounded-md shadow-lg max-h-60 overflow-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#000000', zIndex: 10000 }}
          >
            {loading ? (
              <div className="px-4 py-2 text-sm text-gray-300 text-center bg-black">
                Cargando obras sociales...
              </div>
            ) : obrasFiltradas.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-300 text-center bg-black">
                {searchTerm.trim() ? (
                  <div className="bg-black">
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
              <div className="py-1 bg-black">
                {obrasFiltradas.map((obra) => (
                  <button
                    key={obra}
                    type="button"
                    onMouseDown={(e) => {
                      // Prevenir que el mousedown cierre el dropdown antes del click
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSelect(obra)
                    }}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm transition-colors cursor-pointer bg-black",
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
    </>
  )
}
