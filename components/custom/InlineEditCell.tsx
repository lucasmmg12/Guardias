'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, X, Edit2 } from 'lucide-react'
import { cn, obtenerSugerenciasObraSocial, CODIGO_PARTICULARES } from '@/lib/utils'

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
    
    // Obtener sugerencias si es la columna "Cliente"
    const esColumnaCliente = columnName?.toLowerCase().trim() === 'cliente'
    const sugerencias = esColumnaCliente ? obtenerSugerenciasObraSocial(String(value)) : []

    useEffect(() => {
        setCurrentValue(value ?? '')
    }, [value])

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isEditing])

    const handleSave = async () => {
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
    }

    const handleCancel = () => {
        setCurrentValue(value ?? '')
        setIsEditing(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave()
        } else if (e.key === 'Escape') {
            handleCancel()
        }
    }

    if (!isEditable) {
        return <div className={cn("px-2 py-1", className)}>{value}</div>
    }

    if (isEditing) {
        return (
            <div className="flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-1">
                    <Input
                        ref={inputRef}
                        type={type}
                        value={currentValue}
                        onChange={(e) => setCurrentValue(type === 'number' ? Number(e.target.value) : e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        className="h-8 min-w-[100px] bg-gray-800 border-green-500/50 focus:border-green-400 text-white"
                        placeholder={esColumnaCliente ? "Ingrese obra social o código" : undefined}
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
                </div>
                {/* Mostrar sugerencias para columna Cliente */}
                {esColumnaCliente && sugerencias.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {sugerencias.map((sugerencia, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                    setCurrentValue(sugerencia)
                                    inputRef.current?.focus()
                                }}
                                className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-colors"
                            >
                                {sugerencia}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div
            className={cn(
                "group flex items-center justify-between px-2 py-1 rounded hover:bg-white/5 cursor-pointer transition-colors min-h-[32px]",
                className
            )}
            onClick={() => setIsEditing(true)}
        >
            <span className="truncate">
                {value === null || value === '' ? (
                    <span className="text-gray-500 italic text-xs">Vacío</span>
                ) : (
                    type === 'number' && typeof value === 'number'
                        ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value)
                        : value
                )}
            </span>
            <Edit2 className="h-3 w-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    )
}
