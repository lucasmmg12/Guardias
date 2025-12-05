'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, X, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ObraSocialDropdown } from './ObraSocialDropdown'

interface InlineEditCellProps {
    value: string | number | null
    type?: 'text' | 'number' | 'date'
    onSave: (newValue: string | number) => Promise<void>
    className?: string
    isEditable?: boolean
    columnName?: string
}

export function InlineEditCell({
    value,
    type = 'text',
    onSave,
    className,
    isEditable = true,
    columnName
}: InlineEditCellProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [currentValue, setCurrentValue] = useState<string | number>(value ?? '')
    const [isLoading, setIsLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const isSavingRef = useRef(false)

    // Detectar si es columna Cliente/Obra Social (solo para determinar qué renderizar)
    const esColumnaCliente = useMemo(() => {
        const columnLower = columnName?.toLowerCase().trim() || ''
        return columnLower === 'cliente' || 
               columnLower === 'obra social' || 
               columnLower.includes('obra social') ||
               (columnLower.includes('obra') && columnLower.includes('social'))
    }, [columnName])

    useEffect(() => {
        setCurrentValue(value ?? '')
    }, [value])

    useEffect(() => {
        // Solo enfocar si NO es columna Cliente (el dropdown maneja su propio foco)
        if (isEditing && !esColumnaCliente && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isEditing, esColumnaCliente])

    const handleSave = useCallback(async () => {
        if (isSavingRef.current) return
        
        if (currentValue === value) {
            setIsEditing(false)
            return
        }

        isSavingRef.current = true
        setIsLoading(true)
        try {
            await onSave(currentValue)
            setIsEditing(false)
        } catch (error) {
            console.error('Error saving:', error)
        } finally {
            setIsLoading(false)
            isSavingRef.current = false
        }
    }, [currentValue, value, onSave])

    const handleCancel = useCallback(() => {
        setCurrentValue(value ?? '')
        setIsEditing(false)
    }, [value])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave()
        } else if (e.key === 'Escape') {
            handleCancel()
        }
    }, [handleSave, handleCancel])

    // Callback para cuando se selecciona una obra social del dropdown
    const handleObraSocialSelect = useCallback(async (obra: string) => {
        if (isSavingRef.current) return
        
        const obraTrimmed = obra.trim()
        if (!obraTrimmed) return
        
        // Actualizar el valor actual
        setCurrentValue(obraTrimmed)
        
        // Si el valor es el mismo, solo cerrar edición
        if (obraTrimmed === String(value || '')) {
            setIsEditing(false)
            return
        }

        // Guardar el nuevo valor
        isSavingRef.current = true
        setIsLoading(true)
        try {
            await onSave(obraTrimmed)
            setIsEditing(false)
        } catch (error) {
            console.error('Error saving:', error)
            // Revertir el valor en caso de error
            setCurrentValue(value ?? '')
        } finally {
            setIsLoading(false)
            isSavingRef.current = false
        }
    }, [value, onSave])

    // ✅ TODOS LOS HOOKS DEBEN ESTAR ANTES DE CUALQUIER RETURN CONDICIONAL
    const handleEditClick = useCallback(() => {
        setIsEditing(true)
    }, [])

    const displayValue = useMemo(() => {
        if (value === null || value === '') {
            return <span className="text-gray-500 italic text-xs">Vacío</span>
        }
        if (type === 'number' && typeof value === 'number') {
            return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
        }
        return value
    }, [value, type])

    // Verificar si el dropdown está abierto para deshabilitar hover
    const [dropdownOpen, setDropdownOpen] = useState(false)
    
    useEffect(() => {
        const checkDropdown = () => {
            const isOpen = document.body.hasAttribute('data-dropdown-open')
            setDropdownOpen(isOpen)
        }
        
        // Verificar inicialmente
        checkDropdown()
        
        // Observar cambios en el atributo
        const observer = new MutationObserver(checkDropdown)
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['data-dropdown-open']
        })
        
        return () => observer.disconnect()
    }, [])

    // ✅ AHORA SÍ: Returns condicionales DESPUÉS de todos los hooks
    if (!isEditable) {
        return <div className={cn("px-2 py-1", className)}>{value}</div>
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                {esColumnaCliente ? (
                    // Dropdown para columna Cliente/Obra Social
                    <>
                        <ObraSocialDropdown
                            value={String(currentValue || '')}
                            onSelect={handleObraSocialSelect}
                            onCancel={handleCancel}
                            className="flex-1"
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/20"
                            onClick={handleSave}
                            disabled={isLoading}
                        >
                            <Check className="h-4 w-4" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            onClick={handleCancel}
                            disabled={isLoading}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </>
                ) : (
                    // Input normal para otras columnas
                    <>
                        <Input
                            ref={inputRef}
                            type={type}
                            value={currentValue}
                            onChange={(e) => setCurrentValue(type === 'number' ? Number(e.target.value) : e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            className="h-8 min-w-[100px] bg-gray-800 border-green-500/50 focus:border-green-400 text-white"
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/20"
                            onClick={handleSave}
                            disabled={isLoading}
                        >
                            <Check className="h-4 w-4" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            onClick={handleCancel}
                            disabled={isLoading}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </>
                )}
            </div>
        )
    }

    return (
        <div
            className={cn(
                "group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors min-h-[32px]",
                // Solo aplicar hover si el dropdown NO está abierto
                !dropdownOpen && "hover:bg-white/5",
                className
            )}
            onClick={handleEditClick}
        >
            <span className="truncate">
                {displayValue}
            </span>
            <Edit2 className={cn(
                "h-3 w-3 text-gray-500 transition-opacity",
                dropdownOpen ? "opacity-0" : "opacity-0 group-hover:opacity-100"
            )} />
        </div>
    )
}
