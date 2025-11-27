-- Migración 005: Sistema de Valores de Consultas por Obra Social
-- Fecha: 2025-01-XX
-- Descripción: Crea tabla para almacenar valores de consultas por obra social y mes/año

-- Tabla para almacenar valores de consultas por obra social
CREATE TABLE IF NOT EXISTS valores_consultas_obra_social (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_social VARCHAR(100) NOT NULL, -- '001 - PROVINCIA', '004 - DAMSU', etc.
  tipo_consulta VARCHAR(100) NOT NULL, -- 'CONSULTA', 'CONSULTA DE GUARDIA CLINIC', etc.
  valor DECIMAL(10, 2) NOT NULL,
  vigencia DATE, -- Fecha hasta la cual es válido
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INTEGER NOT NULL CHECK (anio >= 2020),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint único: no puede haber duplicados de la misma combinación
  CONSTRAINT valores_consultas_unique UNIQUE (obra_social, tipo_consulta, mes, anio)
);

-- Índices para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_valores_mes_anio ON valores_consultas_obra_social(mes, anio);
CREATE INDEX IF NOT EXISTS idx_valores_obra_social ON valores_consultas_obra_social(obra_social);
CREATE INDEX IF NOT EXISTS idx_valores_tipo_consulta ON valores_consultas_obra_social(tipo_consulta);
CREATE INDEX IF NOT EXISTS idx_valores_completo ON valores_consultas_obra_social(mes, anio, obra_social, tipo_consulta);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_valores_consultas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_valores_consultas_updated_at
  BEFORE UPDATE ON valores_consultas_obra_social
  FOR EACH ROW
  EXECUTE FUNCTION update_valores_consultas_updated_at();

-- Habilitar RLS
ALTER TABLE valores_consultas_obra_social ENABLE ROW LEVEL SECURITY;

-- Política: Permitir todo a autenticados
CREATE POLICY "Permitir todo a autenticados" ON valores_consultas_obra_social
  FOR ALL
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE valores_consultas_obra_social IS 'Valores de consultas por obra social, organizados por mes y año para mantener histórico';
COMMENT ON COLUMN valores_consultas_obra_social.obra_social IS 'Código y nombre de la obra social (ej: "001 - PROVINCIA")';
COMMENT ON COLUMN valores_consultas_obra_social.tipo_consulta IS 'Tipo de consulta (ej: "CONSULTA", "CONSULTA DE GUARDIA CLINIC")';
COMMENT ON COLUMN valores_consultas_obra_social.valor IS 'Valor monetario de la consulta';
COMMENT ON COLUMN valores_consultas_obra_social.vigencia IS 'Fecha hasta la cual es válido este valor';
COMMENT ON COLUMN valores_consultas_obra_social.mes IS 'Mes (1-12) para mantener histórico';
COMMENT ON COLUMN valores_consultas_obra_social.anio IS 'Año para mantener histórico';

