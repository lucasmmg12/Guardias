'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ExcelRow } from '@/lib/excel-reader'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UndoActionDeleteSingle {
    type: 'delete_single'
    description: string
    deletedRow: ExcelRow
    rowIndex: number
    filaExcel: number
    liquidacionId: string
    /** Full DB record for re-insert */
    dbRecord: Record<string, any> | null
    timestamp: number
}

export interface UndoActionDeleteMultiple {
    type: 'delete_multiple'
    description: string
    deletedRows: ExcelRow[]
    indices: number[]
    filasExcel: number[]
    liquidacionId: string
    /** Full DB records for re-insert */
    dbRecords: Record<string, any>[]
    timestamp: number
}

export interface UndoActionCellEdit {
    type: 'cell_edit'
    description: string
    rowIndex: number
    column: string
    previousValue: any
    newValue: any
    filaExcel: number
    liquidacionId: string
    timestamp: number
}

export type UndoAction = UndoActionDeleteSingle | UndoActionDeleteMultiple | UndoActionCellEdit

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_UNDO_STACK = 10
const TOAST_DURATION_MS = 10_000 // 10 seconds

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseUndoStackReturn {
    /** The current undo stack (most recent first) */
    undoStack: UndoAction[]
    /** The currently active toast action (most recent, within countdown) */
    activeToast: UndoAction | null
    /** Remaining time for the active toast in ms */
    toastRemainingMs: number
    /** Push a new action to the undo stack */
    pushAction: (action: UndoAction) => void
    /** Execute undo on the most recent action */
    undoLast: () => Promise<void>
    /** Dismiss the active toast (confirm the action) */
    dismissToast: () => void
    /** Whether an undo is currently in progress */
    undoing: boolean
}

export function useUndoStack(
    onUndo: (action: UndoAction) => Promise<void>
): UseUndoStackReturn {
    const [undoStack, setUndoStack] = useState<UndoAction[]>([])
    const [activeToast, setActiveToast] = useState<UndoAction | null>(null)
    const [toastRemainingMs, setToastRemainingMs] = useState(0)
    const [undoing, setUndoing] = useState(false)

    const toastTimerRef = useRef<NodeJS.Timeout | null>(null)
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const toastStartRef = useRef<number>(0)

    // ─── Cleanup ──────────────────────────────────────────────────────
    const clearTimers = useCallback(() => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current)
            toastTimerRef.current = null
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
        }
    }, [])

    useEffect(() => {
        return () => clearTimers()
    }, [clearTimers])

    // ─── Push action ──────────────────────────────────────────────────
    const pushAction = useCallback((action: UndoAction) => {
        setUndoStack(prev => {
            const newStack = [action, ...prev]
            return newStack.slice(0, MAX_UNDO_STACK)
        })

        // Start toast countdown
        clearTimers()
        setActiveToast(action)
        toastStartRef.current = Date.now()
        setToastRemainingMs(TOAST_DURATION_MS)

        // Update countdown every 100ms for smooth progress bar
        countdownIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - toastStartRef.current
            const remaining = Math.max(0, TOAST_DURATION_MS - elapsed)
            setToastRemainingMs(remaining)
            if (remaining <= 0) {
                clearTimers()
                setActiveToast(null)
            }
        }, 100)

        // Auto-dismiss after duration
        toastTimerRef.current = setTimeout(() => {
            clearTimers()
            setActiveToast(null)
        }, TOAST_DURATION_MS)
    }, [clearTimers])

    // ─── Dismiss toast ────────────────────────────────────────────────
    const dismissToast = useCallback(() => {
        clearTimers()
        setActiveToast(null)
        setToastRemainingMs(0)
    }, [clearTimers])

    // ─── Undo last ────────────────────────────────────────────────────
    const undoLast = useCallback(async () => {
        if (undoStack.length === 0 || undoing) return

        const lastAction = undoStack[0]
        setUndoing(true)

        try {
            await onUndo(lastAction)

            // Remove from stack
            setUndoStack(prev => prev.slice(1))

            // If the toast was showing this action, dismiss it
            if (activeToast && activeToast.timestamp === lastAction.timestamp) {
                dismissToast()
            }
        } catch (error) {
            console.error('[useUndoStack] Error executing undo:', error)
        } finally {
            setUndoing(false)
        }
    }, [undoStack, undoing, onUndo, activeToast, dismissToast])

    // ─── Ctrl+Z handler ──────────────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                // Don't intercept if typing in an input/textarea
                const target = e.target as HTMLElement
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                    return
                }

                if (undoStack.length > 0 && !undoing) {
                    e.preventDefault()
                    e.stopPropagation()
                    undoLast()
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [undoStack, undoing, undoLast])

    return {
        undoStack,
        activeToast,
        toastRemainingMs,
        pushAction,
        undoLast,
        dismissToast,
        undoing,
    }
}
