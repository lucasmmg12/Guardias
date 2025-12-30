-- Migración: Configuración de grupos para Pediatría
-- Descripción: Crea la tabla para asignar médicos a diferentes tipos de consulta pediátrica mensualmente

-- ============================================================================
-- TABLA: pediatric_groups_config
-- Configuración de grupos mensuales (GUARDIA_ESTANDAR o ESPECIALISTA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pediatric_groups_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INTEGER NOT NULL CHECK (anio >= 2020),
  group_type VARCHAR(30) NOT NULL CHECK (group_type IN ('GUARDIA_ESTANDAR', 'ESPECIALISTA')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint único: Un médico no puede estar en ambos grupos el mismo mes
  CONSTRAINT pediatric_groups_unique UNIQUE (doctor_id, mes, anio)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_pediatric_groups_periodo ON pediatric_groups_config(anio DESC, mes DESC);
CREATE INDEX IF NOT EXISTS idx_pediatric_groups_doctor ON pediatric_groups_config(doctor_id);
CREATE INDEX IF NOT EXISTS idx_pediatric_groups_type ON pediatric_groups_config(group_type);

-- Trigger para updated_at
CREATE TRIGGER trigger_update_pediatric_groups_updated_at
  BEFORE UPDATE ON pediatric_groups_config
  FOR EACH ROW
  EXECUTE FUNCTION update_clinical_groups_updated_at();

-- Habilitar RLS
ALTER TABLE pediatric_groups_config ENABLE ROW LEVEL SECURITY;

-- Políticas básicas
CREATE POLICY "Permitir todo a usuarios autenticados en pediatric_groups_config" 
ON pediatric_groups_config FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

COMMENT ON TABLE pediatric_groups_config IS 'Configuración de grupos mensuales para Pediatría (Guardia Estándar vs Especialista/Neonatal)';
COMMENT ON COLUMN pediatric_groups_config.group_type IS 'GUARDIA_ESTANDAR = Cobra Consulta de Guardia Pediatrica, ESPECIALISTA = Cobra Consulta Pediatrica y Neonatal';
