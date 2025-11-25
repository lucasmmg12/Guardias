import { SupabaseClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import {
    Database,
    DetalleGuardiaInsert,
    LiquidacionGuardia,
    Medico,
    TarifaGuardia,
    ConfiguracionAdicional
} from './types'

export interface ResultadoProcesamientoExcel {
    totalFilas: number
    procesadas: number
    errores: string[]
    advertencias: string[]
    detalles: DetalleGuardiaInsert[]
}

export class GuardiasProcessor {
    private supabase: SupabaseClient<Database>
    private especialidad: string
    private mes: number
    private anio: number

    constructor(
        supabase: SupabaseClient<Database>,
        especialidad: string,
        mes: number,
        anio: number
    ) {
        this.supabase = supabase
        this.especialidad = especialidad
        this.mes = mes
        this.anio = anio
    }

    async procesarExcel(file: File): Promise<ResultadoProcesamientoExcel> {
        const resultado: ResultadoProcesamientoExcel = {
            totalFilas: 0,
            procesadas: 0,
            errores: [],
            advertencias: [],
            detalles: []
        }

        try {
            // 1. Leer Excel
            const buffer = await file.arrayBuffer()
            const workbook = XLSX.read(buffer)
            const worksheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(worksheet)

            resultado.totalFilas = jsonData.length

            // 2. Cargar datos de referencia
            const medicos = await this.cargarMedicos()
            const tarifas = await this.cargarTarifas()
            const configuraciones = await this.cargarConfiguraciones()

            // 3. Procesar filas
            for (const row of jsonData as any[]) {
                try {
                    if (!this.validarFila(row)) continue

                    const detalle = await this.procesarFila(
                        row,
                        medicos,
                        tarifas,
                        configuraciones
                    )

                    if (detalle) {
                        resultado.detalles.push(detalle)
                        resultado.procesadas++
                    }
                } catch (error: any) {
                    resultado.errores.push(`Error en fila: ${error.message}`)
                }
            }

        } catch (error: any) {
            resultado.errores.push(`Error general: ${error.message}`)
        }

        return resultado
    }

    private async cargarMedicos() {
        const { data } = await this.supabase
            .from('medicos')
            .select('*')
            .eq('activo', true)
            .eq('especialidad', this.especialidad)
        return data || []
    }

    private async cargarTarifas() {
        const { data } = await this.supabase
            .from('tarifas_guardia')
            .select('*')
            .eq('tipo_guardia', this.especialidad)
            .eq('activo', true)
        return data || []
    }

    private async cargarConfiguraciones() {
        const { data } = await this.supabase
            .from('configuracion_adicionales')
            .select('*')
            .eq('especialidad', this.especialidad)
            .eq('mes', this.mes)
            .eq('anio', this.anio)
        return data || []
    }

    private validarFila(row: any): boolean {
        // Implementación básica de validación
        if (!row) return false
        // Agregar más validaciones según especialidad
        return true
    }

    private async procesarFila(
        row: any,
        medicos: Medico[],
        tarifas: TarifaGuardia[],
        configuraciones: ConfiguracionAdicional[]
    ): Promise<DetalleGuardiaInsert | null> {
        // Lógica placeholder - Aquí iría la implementación real de Pediatría/Ginecología
        // Retornamos un objeto básico para que compile

        // Simulación de identificación de médico
        const medico = medicos.find(m =>
            (row['Medico'] && m.nombre.toLowerCase().includes(row['Medico'].toLowerCase())) ||
            (row['Matricula'] && m.matricula === row['Matricula'])
        )

        return {
            liquidacion_id: '', // Se asignará al guardar
            fecha: new Date().toISOString(), // Placeholder
            medico_id: medico?.id || null,
            medico_nombre: medico?.nombre || row['Medico'] || 'Desconocido',
            medico_matricula: medico?.matricula || null,
            medico_es_residente: medico?.es_residente || false,
            monto_facturado: 0,
            importe_calculado: 0,
            estado_revision: 'pendiente'
        }
    }
}
