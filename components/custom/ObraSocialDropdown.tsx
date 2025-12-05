'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
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
  const [obrasSociales, setObrasSociales] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
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

  // Toggle dropdown
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation() // Prevenir que se propague el evento
    setIsOpen(prev => !prev)
  }, [])

  // Seleccionar obra social - más estable
  const handleSelect = useCallback((obra: string) => {
    setIsOpen(false)
    // Usar setTimeout para asegurar que el estado se actualice antes de llamar onSelect
    setTimeout(() => {
      onSelect(obra)
    }, 0)
  }, [onSelect])

  // Manejar teclas
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Escape') {
      setIsOpen(false)
      onCancel?.()
    }
  }, [onCancel])

  const displayValue = value || 'Seleccionar obra social...'

  return (
    <div ref={dropdownRef} className={cn("relative w-full", className)} onClick={(e) => e.stopPropagation()}>
      <Button
        type="button"
        variant="outline"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="w-full h-8 justify-between bg-gray-800 border-green-500/50 text-white hover:bg-gray-700 hover:border-green-400"
      >
        <span className="truncate text-left flex-1">{displayValue}</span>
        <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div 
          className="absolute z-[9999] w-full mt-1 bg-gray-800 border border-green-500/50 rounded-md shadow-lg max-h-60 overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-400 text-center">
              Cargando obras sociales...
            </div>
          ) : obrasSociales.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-400 text-center">
              No hay obras sociales disponibles
            </div>
          ) : (
            <div className="py-1">
              {obrasSociales.map((obra) => (
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
                      : "text-gray-300 hover:bg-green-500/20 hover:text-white"
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
