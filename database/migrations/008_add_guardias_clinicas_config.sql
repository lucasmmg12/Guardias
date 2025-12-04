-- Migración 008: Sistema de Configuración para Guardias Clínicas
-- Fecha: 2025-01-XX
-- Descripción: Crea tablas para configuración de grupos y valores de Guardias Clínicas

-- ============================================================================
-- TABLA: clinical_groups_config
-- Configuración de grupos mensuales (GRUPO_70 o GRUPO_40)
-- ============================================================================
CREATE TABLE IF NOT EXISTS clinical_groups_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INTEGER NOT NULL CHECK (anio >= 2020),
  group_type VARCHAR(20) NOT NULL CHECK (group_type IN ('GRUPO_70', 'GRUPO_40')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint único: Un médico no puede estar en ambos grupos el mismo mes
  CONSTRAINT clinical_groups_unique UNIQUE (doctor_id, mes, anio)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_clinical_groups_periodo ON clinical_groups_config(anio DESC, mes DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_groups_doctor ON clinical_groups_config(doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinical_groups_type ON clinical_groups_config(group_type);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_clinical_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_clinical_groups_updated_at
  BEFORE UPDATE ON clinical_groups_config
  FOR EACH ROW
  EXECUTE FUNCTION update_clinical_groups_updated_at();

-- Habilitar RLS
ALTER TABLE clinical_groups_config ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE clinical_groups_config IS 'Configuración de grupos mensuales para Guardias Clínicas (70% o 40% del bruto)';
COMMENT ON COLUMN clinical_groups_config.group_type IS 'GRUPO_70 = 70% del bruto, GRUPO_40 = 40% del bruto';

-- ============================================================================
-- TABLA: clinical_values_config
-- Configuración de valores monetarios mensuales (horas y garantía mínima)
-- ============================================================================
CREATE TABLE IF NOT EXISTS clinical_values_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INTEGER NOT NULL CHECK (anio >= 2020),
  
  -- Valores monetarios
  value_hour_weekly_8_16 DECIMAL(12, 2) NOT NULL DEFAULT 0,      -- Valor franja 8-16 días semana
  value_hour_weekly_16_8 DECIMAL(12, 2) NOT NULL DEFAULT 0,       -- Valor franja 16-8 días semana
  value_hour_weekend DECIMAL(12, 2) NOT NULL DEFAULT 0,            -- Valor por hora fines de semana/feriados
  value_hour_weekend_night DECIMAL(12, 2) NOT NULL DEFAULT 0,       -- Valor por hora nocturna fines de semana/feriados
  value_guaranteed_min DECIMAL(12, 2) NOT NULL DEFAULT 0,          -- Valor mínimo por hora trabajada
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint único: Solo una configuración por mes/año
  CONSTRAINT clinical_values_unique UNIQUE (mes, anio)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_clinical_values_periodo ON clinical_values_config(anio DESC, mes DESC);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_clinical_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_clinical_values_updated_at
  BEFORE UPDATE ON clinical_values_config
  FOR EACH ROW
  EXECUTE FUNCTION update_clinical_values_updated_at();

-- Habilitar RLS
ALTER TABLE clinical_values_config ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE clinical_values_config IS 'Configuración de valores monetarios mensuales para Guardias Clínicas';
COMMENT ON COLUMN clinical_values_config.value_hour_weekly_8_16 IS 'Valor fijo por franja horaria 8-16 días de semana';
COMMENT ON COLUMN clinical_values_config.value_hour_weekly_16_8 IS 'Valor fijo por franja horaria 16-8 días de semana';
COMMENT ON COLUMN clinical_values_config.value_hour_weekend IS 'Valor por hora fines de semana y feriados';
COMMENT ON COLUMN clinical_values_config.value_hour_weekend_night IS 'Valor por hora nocturna fines de semana y feriados';
COMMENT ON COLUMN clinical_values_config.value_guaranteed_min IS 'Valor mínimo garantizado por hora trabajada';

