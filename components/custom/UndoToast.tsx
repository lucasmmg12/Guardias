'use client'

import { useEffect, useState, useMemo } from 'react'
import { UndoAction } from '@/hooks/useUndoStack'
import { Undo2, X, Trash2, Edit3, Layers } from 'lucide-react'

interface UndoToastProps {
    action: UndoAction | null
    remainingMs: number
    totalMs?: number
    onUndo: () => void
    onDismiss: () => void
    undoing: boolean
}

export function UndoToast({
    action,
    remainingMs,
    totalMs = 10_000,
    onUndo,
    onDismiss,
    undoing,
}: UndoToastProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [isExiting, setIsExiting] = useState(false)

    useEffect(() => {
        if (action) {
            setIsExiting(false)
            // Small delay for enter animation
            requestAnimationFrame(() => setIsVisible(true))
        } else {
            setIsExiting(true)
            const timer = setTimeout(() => {
                setIsVisible(false)
                setIsExiting(false)
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [action])

    const progress = useMemo(() => {
        if (!action) return 0
        return Math.max(0, Math.min(100, (remainingMs / totalMs) * 100))
    }, [remainingMs, totalMs, action])

    if (!isVisible && !action) return null

    // Determine icon and colors based on action type
    const getActionStyle = () => {
        if (!action) return { icon: <Trash2 className="h-4 w-4" />, color: '#ef4444', label: '' }

        switch (action.type) {
            case 'delete_single':
                return {
                    icon: <Trash2 className="h-4 w-4" />,
                    color: '#ef4444',
                    label: '1 registro eliminado',
                }
            case 'delete_multiple':
                return {
                    icon: <Layers className="h-4 w-4" />,
                    color: '#f97316',
                    label: `${action.deletedRows.length} registros eliminados`,
                }
            case 'cell_edit':
                return {
                    icon: <Edit3 className="h-4 w-4" />,
                    color: '#3b82f6',
                    label: `Celda editada (${action.column})`,
                }
        }
    }

    const style = getActionStyle()

    return (
        <div
            className="fixed bottom-6 left-1/2 z-[9999] pointer-events-none"
            style={{
                transform: 'translateX(-50%)',
            }}
        >
            <div
                className="pointer-events-auto"
                style={{
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isVisible && !isExiting ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                    opacity: isVisible && !isExiting ? 1 : 0,
                }}
            >
                <div
                    className="relative overflow-hidden rounded-2xl shadow-2xl"
                    style={{
                        background: 'rgba(15, 15, 15, 0.95)',
                        backdropFilter: 'blur(24px)',
                        border: `1px solid ${style.color}40`,
                        boxShadow: `0 0 40px ${style.color}15, 0 8px 32px rgba(0,0,0,0.6)`,
                        minWidth: '380px',
                        maxWidth: '520px',
                    }}
                >
                    {/* Progress bar */}
                    <div
                        className="absolute top-0 left-0 h-[3px] transition-all"
                        style={{
                            width: `${progress}%`,
                            background: `linear-gradient(90deg, ${style.color}, ${style.color}80)`,
                            transition: 'width 0.15s linear',
                        }}
                    />

                    <div className="px-5 py-4 flex items-center gap-4">
                        {/* Icon */}
                        <div
                            className="flex-shrink-0 p-2.5 rounded-xl"
                            style={{
                                background: `${style.color}15`,
                                color: style.color,
                            }}
                        >
                            {style.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-bold tracking-tight">
                                {style.label}
                            </p>
                            {action?.description && (
                                <p className="text-gray-400 text-xs mt-0.5 truncate max-w-[280px]">
                                    {action.description}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={onUndo}
                                disabled={undoing}
                                className="group flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black tracking-tight uppercase transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: `${style.color}20`,
                                    color: style.color,
                                    border: `1px solid ${style.color}40`,
                                }}
                            >
                                <Undo2 className={`h-3.5 w-3.5 transition-transform group-hover:-rotate-45 ${undoing ? 'animate-spin' : ''}`} />
                                {undoing ? 'REVIRTIENDO...' : 'DESHACER'}
                            </button>

                            <button
                                onClick={onDismiss}
                                className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
                                title="Cerrar"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Timer text */}
                    <div className="px-5 pb-3 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                            Auto-confirma en {Math.ceil(remainingMs / 1000)}s
                        </span>
                        <span className="text-[10px] text-gray-600">
                            Ctrl+Z para deshacer
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Undo Button (permanent) ────────────────────────────────────────────────

interface UndoButtonProps {
    stackSize: number
    onUndo: () => void
    undoing: boolean
    className?: string
}

export function UndoButton({ stackSize, onUndo, undoing, className = '' }: UndoButtonProps) {
    if (stackSize === 0) return null

    return (
        <button
            onClick={onUndo}
            disabled={undoing}
            className={`group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#818cf8',
            }}
            title={`Deshacer último cambio (${stackSize} en historial) · Ctrl+Z`}
        >
            <Undo2 className={`h-3.5 w-3.5 transition-transform group-hover:-rotate-45 ${undoing ? 'animate-spin' : ''}`} />
            <span>{undoing ? 'Revirtiendo...' : `Deshacer (${stackSize})`}</span>
        </button>
    )
}
