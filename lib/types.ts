export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      medicos: {
        Row: Medico
        Insert: MedicoInsert
        Update: MedicoUpdate
      }
      tarifas_guardia: {
        Row: TarifaGuardia
        Insert: TarifaGuardiaInsert
        Update: TarifaGuardiaUpdate
      }
      configuracion_adicionales: {
        Row: ConfiguracionAdicional
        Insert: ConfiguracionAdicionalInsert
        Update: ConfiguracionAdicionalUpdate
      }
      liquidaciones_guardia: {
        Row: LiquidacionGuardia
        Insert: LiquidacionGuardiaInsert
        Update: LiquidacionGuardiaUpdate
      }
      detalle_guardia: {
        Row: DetalleGuardia
        Insert: DetalleGuardiaInsert
        Update: DetalleGuardiaUpdate
      }
      logs_procesamiento: {
        Row: LogProcesamiento
        Insert: LogProcesamientoInsert
        Update: LogProcesamientoUpdate
      }
      feriados: {
        Row: Feriado
        Insert: FeriadoInsert
        Update: FeriadoUpdate
      }
    }
    Views: {
      v_resumen_liquidaciones_guardia: {
        Row: ResumenLiquidacion
      }
      v_detalle_guardia_completo: {
        Row: DetalleCompleto
      }
    }
  }
}

// Enums
export type EstadoLiquidacion = 'borrador' | 'procesando' | 'finalizada' | 'error'
export type EstadoRevision = 'pendiente' | 'aprobado' | 'observado' | 'rechazado'
export type Especialidad = 'Pediatría' | 'Ginecología' | 'Obstetricia' | 'Cirugía' | 'Clínica'

// Interfaces de Tablas
export interface Medico {
  id: string
  nombre: string
  matricula: string
  matricula_provincial: string | null
  cuit: string | null
  grupo_persona: string | null
  perfil: string | null
  es_residente: boolean
  especialidad: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface MedicoInsert {
  id?: string
  nombre: string
  matricula: string
  matricula_provincial?: string | null
  cuit?: string | null
  grupo_persona?: string | null
  perfil?: string | null
  es_residente?: boolean
  especialidad: string
  activo?: boolean
  created_at?: string
  updated_at?: string
}

export interface MedicoUpdate {
  id?: string
  nombre?: string
  matricula?: string
  matricula_provincial?: string | null
  cuit?: string | null
  grupo_persona?: string | null
  perfil?: string | null
  es_residente?: boolean
  especialidad?: string
  activo?: boolean
  created_at?: string
  updated_at?: string
}

export interface TarifaGuardia {
  id: string
  tipo_guardia: string
  fecha_vigencia: string
  valor_hora: number | null
  valor_consulta: number | null
  valor_adicional: number | null
  porcentaje_retencion: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface TarifaGuardiaInsert {
  id?: string
  tipo_guardia: string
  fecha_vigencia: string
  valor_hora?: number | null
  valor_consulta?: number | null
  valor_adicional?: number | null
  porcentaje_retencion?: number
  activo?: boolean
  created_at?: string
  updated_at?: string
}

export interface TarifaGuardiaUpdate {
  id?: string
  tipo_guardia?: string
  fecha_vigencia?: string
  valor_hora?: number | null
  valor_consulta?: number | null
  valor_adicional?: number | null
  porcentaje_retencion?: number
  activo?: boolean
  created_at?: string
  updated_at?: string
}

export interface ConfiguracionAdicional {
  id: string
  obra_social: string
  especialidad: string
  mes: number
  anio: number
  aplica_adicional: boolean
  monto_adicional: number | null
  created_at: string
  updated_at: string
}

export interface ConfiguracionAdicionalInsert {
  id?: string
  obra_social: string
  especialidad: string
  mes: number
  anio: number
  aplica_adicional?: boolean
  monto_adicional?: number | null
  created_at?: string
  updated_at?: string
}

export interface ConfiguracionAdicionalUpdate {
  id?: string
  obra_social?: string
  especialidad?: string
  mes?: number
  anio?: number
  aplica_adicional?: boolean
  monto_adicional?: number | null
  created_at?: string
  updated_at?: string
}

export interface LiquidacionGuardia {
  id: string
  mes: number
  anio: number
  especialidad: string
  estado: EstadoLiquidacion
  total_consultas: number
  total_bruto: number
  total_retenciones: number
  total_adicionales: number
  total_neto: number
  archivo_nombre: string | null
  archivo_url: string | null
  procesado_por: string | null
  procesado_at: string | null
  created_at: string
  updated_at: string
}

export interface LiquidacionGuardiaInsert {
  id?: string
  mes: number
  anio: number
  especialidad: string
  estado?: EstadoLiquidacion
  total_consultas?: number
  total_bruto?: number
  total_retenciones?: number
  total_adicionales?: number
  total_neto?: number
  archivo_nombre?: string | null
  archivo_url?: string | null
  procesado_por?: string | null
  procesado_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface LiquidacionGuardiaUpdate {
  id?: string
  mes?: number
  anio?: number
  especialidad?: string
  estado?: EstadoLiquidacion
  total_consultas?: number
  total_bruto?: number
  total_retenciones?: number
  total_adicionales?: number
  total_neto?: number
  archivo_nombre?: string | null
  archivo_url?: string | null
  procesado_por?: string | null
  procesado_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface DetalleGuardia {
  id: string
  liquidacion_id: string
  medico_id: string | null
  fecha: string
  hora: string | null
  paciente: string | null
  obra_social: string | null
  medico_nombre: string | null
  medico_matricula: string | null
  medico_es_residente: boolean | null
  monto_facturado: number | null
  porcentaje_retencion: number | null
  monto_retencion: number | null
  monto_adicional: number
  importe_calculado: number | null
  aplica_adicional: boolean
  es_horario_formativo: boolean
  estado_revision: EstadoRevision
  observaciones: string | null
  fila_excel: number | null
  created_at: string
  updated_at: string
}

export interface DetalleGuardiaInsert {
  id?: string
  liquidacion_id: string
  medico_id?: string | null
  fecha: string
  hora?: string | null
  paciente?: string | null
  obra_social?: string | null
  medico_nombre?: string | null
  medico_matricula?: string | null
  medico_es_residente?: boolean | null
  monto_facturado?: number | null
  porcentaje_retencion?: number | null
  monto_retencion?: number | null
  monto_adicional?: number
  importe_calculado?: number | null
  aplica_adicional?: boolean
  es_horario_formativo?: boolean
  estado_revision?: EstadoRevision
  observaciones?: string | null
  fila_excel?: number | null
  created_at?: string
  updated_at?: string
}

export interface DetalleGuardiaUpdate {
  id?: string
  liquidacion_id?: string
  medico_id?: string | null
  fecha?: string
  hora?: string | null
  paciente?: string | null
  obra_social?: string | null
  medico_nombre?: string | null
  medico_matricula?: string | null
  medico_es_residente?: boolean | null
  monto_facturado?: number | null
  porcentaje_retencion?: number | null
  monto_retencion?: number | null
  monto_adicional?: number
  importe_calculado?: number | null
  aplica_adicional?: boolean
  es_horario_formativo?: boolean
  estado_revision?: EstadoRevision
  observaciones?: string | null
  fila_excel?: number | null
  created_at?: string
  updated_at?: string
}

export interface LogProcesamiento {
  id: string
  liquidacion_id: string | null
  tipo_evento: string
  mensaje: string
  detalle: Json | null
  created_at: string
}

export interface LogProcesamientoInsert {
  id?: string
  liquidacion_id?: string | null
  tipo_evento: string
  mensaje: string
  detalle?: Json | null
  created_at?: string
}

export interface LogProcesamientoUpdate {
  id?: string
  liquidacion_id?: string | null
  tipo_evento?: string
  mensaje?: string
  detalle?: Json | null
  created_at?: string
}

export interface Feriado {
  id: string
  fecha: string
  descripcion: string
  tipo: string
  created_at: string
  updated_at: string
}

export interface FeriadoInsert {
  id?: string
  fecha: string
  descripcion: string
  tipo?: string
  created_at?: string
  updated_at?: string
}

export interface FeriadoUpdate {
  id?: string
  fecha?: string
  descripcion?: string
  tipo?: string
  created_at?: string
  updated_at?: string
}

// Interfaces de Vistas
export interface ResumenLiquidacion {
  id: string
  mes: number
  anio: number
  especialidad: string
  estado: EstadoLiquidacion
  total_consultas: number
  total_bruto: number
  total_retenciones: number
  total_adicionales: number
  total_neto: number
  cantidad_medicos: number
  created_at: string
  updated_at: string
}

export interface DetalleCompleto {
  id: string
  liquidacion_id: string
  mes: number
  anio: number
  especialidad: string
  fecha: string
  hora: string | null
  paciente: string | null
  obra_social: string | null
  medico_nombre: string | null
  medico_matricula: string | null
  medico_es_residente: boolean | null
  monto_facturado: number | null
  porcentaje_retencion: number | null
  monto_retencion: number | null
  monto_adicional: number
  importe_calculado: number | null
  aplica_adicional: boolean
  es_horario_formativo: boolean
  estado_revision: EstadoRevision
  observaciones: string | null
}
