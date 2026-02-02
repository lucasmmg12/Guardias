/**
 * Servicio para gestión de feriados nacionales
 * Utilizado para calcular pagos especiales en guardias
 */

// Lista de feriados nacionales (formato YYYY-MM-DD)
// IMPORTANTE: Mantener actualizada esta lista anualmente
const FERIADOS_NACIONALES = new Set([
    // --- 2024 (Por si acaso se reprocesan datos viejos) ---
    '2024-01-01', // Año Nuevo
    '2024-02-12', // Carnaval
    '2024-02-13', // Carnaval
    '2024-03-24', // Día de la Memoria
    '2024-03-29', // Viernes Santo
    '2024-04-02', // Malvinas
    '2024-05-01', // Día del Trabajador
    '2024-05-25', // Revolución de Mayo
    '2024-06-17', // Gral. Güemes
    '2024-06-20', // Gral. Belgrano
    '2024-07-09', // Independencia
    '2024-08-17', // Gral. San Martín
    '2024-10-12', // Diversidad Cultural
    '2024-11-20', // Soberanía Nacional
    '2024-12-08', // Inmaculada Concepción
    '2024-12-25', // Navidad

    // --- 2025 ---
    '2025-01-01', // Año Nuevo
    '2025-03-03', // Carnaval
    '2025-03-04', // Carnaval
    '2025-03-24', // Día Nacional de la Memoria
    '2025-04-02', // Día del Veterano y de los Caídos en la Guerra de Malvinas
    '2025-04-18', // Viernes Santo
    '2025-05-01', // Día del Trabajador
    '2025-05-25', // Día de la Revolución de Mayo
    '2025-06-20', // Paso a la Inmortalidad del Gral. Manuel Belgrano
    '2025-07-09', // Día de la Independencia
    '2025-08-17', // Paso a la Inmortalidad del Gral. José de San Martín
    '2025-10-12', // Día del Respeto a la Diversidad Cultural
    '2025-11-24', // Día de la Soberanía Nacional (trasladado del 20/11)
    '2025-12-08', // Inmaculada Concepción de María
    '2025-12-25', // Navidad

    // --- 2026 (Provisorio) ---
    '2026-01-01', // Año Nuevo
    '2026-02-16', // Carnaval
    '2026-02-17', // Carnaval
    '2026-03-24', // Día de la Memoria
    '2026-04-02', // Malvinas
    '2026-04-03', // Viernes Santo
    '2026-05-01', // Día del Trabajador
    '2026-05-25', // Revolución de Mayo
    '2026-06-20', // Belgrano
    '2026-07-09', // Independencia
    '2026-08-17', // San Martín
    '2026-10-12', // Diversidad Cultural
    '2026-11-20', // Soberanía
    '2026-12-08', // Inmaculada Concepción
    '2026-12-25'  // Navidad
])

/**
 * Verifica si una fecha corresponde a un feriado nacional
 * @param fecha Fecha en formato string (YYYY-MM-DD), DD/MM/YYYY o Date object
 */
export function esFeriado(fecha: string | Date | null | undefined): boolean {
    if (!fecha) return false

    let fechaISO = ''

    if (fecha instanceof Date) {
        // Usar métodos locales para evitar problemas de timezone UTC
        const year = fecha.getFullYear()
        const month = String(fecha.getMonth() + 1).padStart(2, '0')
        const day = String(fecha.getDate()).padStart(2, '0')
        fechaISO = `${year}-${month}-${day}`
    } else {
        const fechaStr = String(fecha).trim()

        // Intentar formato DD/MM/YYYY
        const matchDDMMYYYY = fechaStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
        if (matchDDMMYYYY) {
            const dia = matchDDMMYYYY[1].padStart(2, '0')
            const mes = matchDDMMYYYY[2].padStart(2, '0')
            const anio = matchDDMMYYYY[3]
            fechaISO = `${anio}-${mes}-${dia}`
        }
        // Intentar formato YYYY-MM-DD
        else if (fechaStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            fechaISO = fechaStr
        }
        // Intentar parsear como Date
        else {
            try {
                const d = new Date(fechaStr)
                if (!isNaN(d.getTime())) {
                    const year = d.getFullYear()
                    const month = String(d.getMonth() + 1).padStart(2, '0') // getMonth es 0-index
                    const day = String(d.getDate()).padStart(2, '0')
                    fechaISO = `${year}-${month}-${day}`
                }
            } catch (e) {
                return false
            }
        }
    }

    if (!fechaISO) return false

    return FERIADOS_NACIONALES.has(fechaISO)
}
