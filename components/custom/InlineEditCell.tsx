'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, X, Edit2 } from 'lucide-react'
import { cn, obtenerSugerenciasObraSocial, CODIGO_PARTICULARES } from '@/lib/utils'
import { ObraSocialDropdown } from './ObraSocialDropdown'

interface InlineEditCellProps {
    value: string | number | null
    type?: 'text' | 'number' | 'date'
    onSave: (newValue: string | number) => Promise<void>
    className?: string
    isEditable?: boolean
    columnName?: string // Nombre de la columna para mostrar sugerencias específicas
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
    
    // Memoizar si es columna Cliente u Obra Social
    const esColumnaCliente = useMemo(() => {
      const columnLower = columnName?.toLowerCase().trim() || ''
      return columnLower === 'cliente' || 
             columnLower === 'obra social' || 
             columnLower.includes('obra social') ||
             (columnLower.includes('obra') && columnLower.includes('social'))
    }, [columnName])
    
    // Memoizar sugerencias
    const sugerencias = useMemo(() => {
      return esColumnaCliente ? obtenerSugerenciasObraSocial(String(value)) : []
    }, [esColumnaCliente, value])

    useEffect(() => {
        setCurrentValue(value ?? '')
    }, [value])

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isEditing])

    const handleSave = useCallback(async () => {
        if (currentValue === value) {
            setIsEditing(false)
            return
        }

        setIsLoading(true)
        try {
            await onSave(currentValue)
            setIsEditing(false)
        } catch (error) {
            console.error('Error saving:', error)
            // Aquí podrías mostrar un toast de error
        } finally {
            setIsLoading(false)
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

    if (!isEditable) {
        return <div className={cn("px-2 py-1", className)}>{value}</div>
    }

    if (isEditing) {
        return (
            <div className="flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-1">
                    {esColumnaCliente ? (
                        <ObraSocialDropdown
                            value={String(currentValue)}
                            onSelect={(obra) => {
                                setCurrentValue(obra)
                                handleSave()
                            }}
                            onCancel={handleCancel}
                            className="flex-1"
                        />
                    ) : (
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
            </div>
        )
    }

    const handleEditClick = useCallback(() => {
        setIsEditing(true)
    }, [])

    // Memoizar el valor formateado
    const displayValue = useMemo(() => {
        if (value === null || value === '') {
            return <span className="text-gray-500 italic text-xs">Vacío</span>
        }
        if (type === 'number' && typeof value === 'number') {
            return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
        }
        return value
    }, [value, type])

    return (
        <div
            className={cn(
                "group flex items-center justify-between px-2 py-1 rounded hover:bg-white/5 cursor-pointer transition-colors min-h-[32px]",
                className
            )}
            onClick={handleEditClick}
        >
            <span className="truncate">
                {displayValue}
            </span>
            <Edit2 className="h-3 w-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    )
}
