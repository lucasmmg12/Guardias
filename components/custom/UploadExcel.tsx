'use client'

import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface UploadExcelProps {
    onUpload: (file: File) => Promise<void>
    isProcessing?: boolean
}

export function UploadExcel({ onUpload, isProcessing = false }: UploadExcelProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        setError(null)

        const droppedFile = e.dataTransfer.files[0]
        validateAndSetFile(droppedFile)
    }, [])

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null)
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            validateAndSetFile(selectedFile)
        }
    }, [])

    const validateAndSetFile = (file: File) => {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ]

        if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            setError('Formato no válido. Por favor sube un archivo Excel (.xlsx, .xls)')
            return
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            setError('El archivo es demasiado grande (máx 10MB)')
            return
        }

        setFile(file)
    }

    const handleProcess = async () => {
        if (!file) return
        try {
            await onUpload(file)
            // No limpiamos el archivo aquí, dejamos que el padre decida qué hacer
        } catch (err) {
            setError('Error al procesar el archivo')
        }
    }

    const clearFile = () => {
        setFile(null)
        setError(null)
    }

    return (
        <div className="w-full">
            {!file ? (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                        "border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer",
                        isDragging
                            ? "border-green-400 bg-green-400/10 scale-[1.02]"
                            : "border-gray-700 hover:border-green-500/50 hover:bg-white/5"
                    )}
                >
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileInput}
                        className="hidden"
                        id="excel-upload"
                    />
                    <label htmlFor="excel-upload" className="cursor-pointer w-full h-full block">
                        <div className="flex flex-col items-center gap-4">
                            <div className={cn(
                                "p-4 rounded-full transition-colors",
                                isDragging ? "bg-green-400/20 text-green-400" : "bg-gray-800 text-gray-400"
                            )}>
                                <Upload className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-200">
                                    Sube tu archivo Excel
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">
                                    Arrastra y suelta o haz clic para seleccionar
                                </p>
                            </div>
                            <div className="text-xs text-gray-500 bg-gray-800/50 px-3 py-1 rounded-full">
                                Soporta .xlsx y .xls hasta 10MB
                            </div>
                        </div>
                    </label>
                </div>
            ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/20 text-green-400 rounded-lg">
                                <FileSpreadsheet className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-200">{file.name}</h3>
                                <p className="text-sm text-gray-400">
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        </div>
                        {!isProcessing && (
                            <button
                                onClick={clearFile}
                                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-red-400 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg mb-4 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={clearFile}
                            disabled={isProcessing}
                            className="border-gray-600 text-gray-300 hover:bg-white/5 hover:text-white"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleProcess}
                            disabled={isProcessing}
                            className="bg-green-600 hover:bg-green-500 text-white min-w-[140px]"
                        >
                            {isProcessing ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Procesando...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    Procesar
                                </div>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
