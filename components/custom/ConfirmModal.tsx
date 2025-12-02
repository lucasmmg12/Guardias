'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  type = 'danger'
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!isOpen || !mounted) return null

  const getBorderColor = () => {
    switch (type) {
      case 'danger':
        return 'border-red-500/50'
      case 'warning':
        return 'border-yellow-500/50'
      default:
        return 'border-blue-500/50'
    }
  }

  const getTitleColor = () => {
    switch (type) {
      case 'danger':
        return 'text-red-400'
      case 'warning':
        return 'text-yellow-400'
      default:
        return 'text-blue-400'
    }
  }

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-500 text-white'
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-500 text-white'
      default:
        return 'bg-blue-600 hover:bg-blue-500 text-white'
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${getBorderColor().replace('/50', '/30')}`,
          boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.3)',
          animation: 'fadeIn 0.2s ease-in-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Contenido */}
        <div className="flex items-start gap-4">
          {/* Ícono */}
          <div className="flex-shrink-0 mt-1">
            <AlertTriangle className={`h-6 w-6 ${getTitleColor()}`} />
          </div>

          {/* Texto */}
          <div className="flex-1 space-y-2">
            <h3 className={`text-lg font-semibold ${getTitleColor()}`}>
              {title}
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-gray-500/50 text-gray-300 hover:bg-gray-500/20"
          >
            {cancelText}
          </Button>
          <Button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={getConfirmButtonStyle()}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )

  // Renderizar el modal usando portal directamente en el body
  return createPortal(modalContent, document.body)
}
