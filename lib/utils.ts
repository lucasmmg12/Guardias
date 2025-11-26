import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Detecta si un valor es un nombre de persona (no una obra social)
 * Un nombre de persona típicamente:
 * - Tiene 2-4 palabras
 * - Contiene mayúsculas y minúsculas
 * - No contiene números al inicio
 * - No contiene guiones o códigos
 */
export function esNombrePersona(valor: string | null | undefined): boolean {
    if (!valor || typeof valor !== 'string') return false
    
    const trimmed = valor.trim()
    if (trimmed === '') return false
    
    // Si contiene números al inicio o códigos como "042 -", no es nombre de persona
    if (/^\d+/.test(trimmed) || /^\d+\s*-\s*/.test(trimmed)) {
        return false
    }
    
    // Si contiene solo números, no es nombre de persona
    if (/^\d+$/.test(trimmed)) {
        return false
    }
    
    // Si es muy corto (menos de 3 caracteres), probablemente no es nombre completo
    if (trimmed.length < 3) {
        return false
    }
    
    // Dividir en palabras
    const palabras = trimmed.split(/\s+/).filter(p => p.length > 0)
    
    // Si tiene más de 4 palabras, probablemente no es un nombre de persona
    if (palabras.length > 4) {
        return false
    }
    
    // Si tiene 2-4 palabras y contiene letras, probablemente es un nombre
    if (palabras.length >= 2 && palabras.length <= 4) {
        // Verificar que todas las palabras contengan letras
        const todasTienenLetras = palabras.every(p => /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(p))
        if (todasTienenLetras) {
            return true
        }
    }
    
    // Si tiene una sola palabra pero es larga y tiene mayúsculas/minúsculas, podría ser nombre
    if (palabras.length === 1 && trimmed.length > 5) {
        const tieneMayusculas = /[A-ZÁÉÍÓÚÑ]/.test(trimmed)
        const tieneMinusculas = /[a-záéíóúñ]/.test(trimmed)
        if (tieneMayusculas && tieneMinusculas) {
            return true
        }
    }
    
    return false
}

/**
 * Detecta si un registro es un PARTICULAR (sin obra social)
 */
export function esParticular(cliente: string | null | undefined): boolean {
    // Si está vacío, es particular
    if (!cliente || cliente.trim() === '') {
        return true
    }
    
    // Si es "042 - PARTICULARES" o variaciones, no es particular (ya está marcado)
    const clienteLower = cliente.toLowerCase().trim()
    if (clienteLower.includes('042') && clienteLower.includes('particular')) {
        return false
    }
    
    // Si parece un nombre de persona, es particular
    if (esNombrePersona(cliente)) {
        return true
    }
    
    return false
}

/**
 * Normaliza el código de obra social para PARTICULARES
 */
export const CODIGO_PARTICULARES = '042 - PARTICULARES'

/**
 * Obtiene sugerencias de obra social basadas en el valor actual
 */
export function obtenerSugerenciasObraSocial(valor: string | null | undefined): string[] {
    const sugerencias: string[] = []
    
    if (esParticular(valor)) {
        sugerencias.push(CODIGO_PARTICULARES)
    }
    
    // Aquí se pueden agregar más sugerencias basadas en obras sociales comunes
    // Por ejemplo: 'OSDE', 'DAMSU', 'PROVINCIA', etc.
    
    return sugerencias
}