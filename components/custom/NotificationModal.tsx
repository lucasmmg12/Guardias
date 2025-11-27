'use client'

import { useEffect } from 'react'
import { CheckCircle, X, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type NotificationType = 'success' | 'error' | 'info' | 'warning'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  type?: NotificationType
  duration?: number // Duración en milisegundos (0 = no auto-cerrar)
}

export function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  duration = 0
}: NotificationModalProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isOpen, duration, onClose])

  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-400" />
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-400" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-400" />
      default:
        return <Info className="h-6 w-6 text-blue-400" />
    }
  }

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-green-500/50'
      case 'error':
        return 'border-red-500/50'
      case 'warning':
        return 'border-yellow-500/50'
      default:
        return 'border-blue-500/50'
    }
  }

  const getTitleColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-400'
      case 'error':
        return 'text-red-400'
      case 'warning':
        return 'text-yellow-400'
      default:
        return 'text-blue-400'
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
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
            {getIcon()}
          </div>

          {/* Texto */}
          <div className="flex-1 space-y-2">
            {title && (
              <h3 className={`text-lg font-semibold ${getTitleColor()}`}>
                {title}
              </h3>
            )}
            <p className="text-gray-300 text-sm leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Botón de acción */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={onClose}
            className={`${
              type === 'success'
                ? 'bg-green-600 hover:bg-green-500'
                : type === 'error'
                ? 'bg-red-600 hover:bg-red-500'
                : type === 'warning'
                ? 'bg-yellow-600 hover:bg-yellow-500'
                : 'bg-blue-600 hover:bg-blue-500'
            } text-white`}
          >
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  )
}

