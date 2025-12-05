-- ============================================================================
-- MIGRACIÓN: TABLA DETALLE_HORAS_GUARDIA
-- ============================================================================
-- Descripción: Tabla para almacenar las horas trabajadas por médico
--              Permite editar, filtrar y eliminar horas individuales
-- ============================================================================

BEGIN;

-- Tabla para almacenar horas trabajadas
CREATE TABLE IF NOT EXISTS detalle_horas_guardia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id UUID NOT NULL REFERENCES liquidaciones_guardia(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  medico_nombre VARCHAR(255) NOT NULL,
  medico_matricula VARCHAR(50),
  medico_es_residente BOOLEAN DEFAULT false,
  
  -- Horas trabajadas
  franjas_8_16 DECIMAL(10, 2) DEFAULT 0,              -- Cantidad de franjas 8-16
  franjas_16_8 DECIMAL(10, 2) DEFAULT 0,              -- Cantidad de franjas 16-8
  horas_weekend DECIMAL(10, 2) DEFAULT 0,             -- Horas fines de semana/feriados
  horas_weekend_night DECIMAL(10, 2) DEFAULT 0,       -- Horas nocturnas fines de semana/feriados
  
  -- Valores calculados
  valor_franjas_8_16 DECIMAL(12, 2) DEFAULT 0,
  valor_franjas_16_8 DECIMAL(12, 2) DEFAULT 0,
  valor_horas_weekend DECIMAL(12, 2) DEFAULT 0,
  valor_horas_weekend_night DECIMAL(12, 2) DEFAULT 0,
  total_horas DECIMAL(12, 2) DEFAULT 0,               -- Total calculado
  
  -- Metadata
  fila_excel INTEGER,                                  -- Número de fila en el Excel original
  estado_revision VARCHAR(20) DEFAULT 'pendiente',     -- 'pendiente', 'revisado', 'corregido'
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT detalle_horas_franjas_positivas CHECK (
    franjas_8_16 >= 0 AND
    franjas_16_8 >= 0 AND
    horas_weekend >= 0 AND
    horas_weekend_night >= 0
  )
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_detalle_horas_liquidacion ON detalle_horas_guardia(liquidacion_id);
CREATE INDEX IF NOT EXISTS idx_detalle_horas_medico ON detalle_horas_guardia(medico_id);
CREATE INDEX IF NOT EXISTS idx_detalle_horas_fila_excel ON detalle_horas_guardia(liquidacion_id, fila_excel);
CREATE INDEX IF NOT EXISTS idx_detalle_horas_estado ON detalle_horas_guardia(estado_revision);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_detalle_horas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_detalle_horas_updated_at
  BEFORE UPDATE ON detalle_horas_guardia
  FOR EACH ROW
  EXECUTE FUNCTION update_detalle_horas_updated_at();

-- RLS Policies
ALTER TABLE detalle_horas_guardia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view detalle_horas_guardia"
  ON detalle_horas_guardia FOR SELECT
  USING (true);

CREATE POLICY "Users can insert detalle_horas_guardia"
  ON detalle_horas_guardia FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update detalle_horas_guardia"
  ON detalle_horas_guardia FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete detalle_horas_guardia"
  ON detalle_horas_guardia FOR DELETE
  USING (true);

COMMENT ON TABLE detalle_horas_guardia IS 'Detalle de horas trabajadas por médico en guardias clínicas';
COMMENT ON COLUMN detalle_horas_guardia.franjas_8_16 IS 'Cantidad de franjas horarias 8-16 días semana';
COMMENT ON COLUMN detalle_horas_guardia.franjas_16_8 IS 'Cantidad de franjas horarias 16-8 días semana';
COMMENT ON COLUMN detalle_horas_guardia.horas_weekend IS 'Horas trabajadas fines de semana/feriados';
COMMENT ON COLUMN detalle_horas_guardia.horas_weekend_night IS 'Horas nocturnas trabajadas fines de semana/feriados';

COMMIT;

