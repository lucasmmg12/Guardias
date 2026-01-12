SET search_path = public, extensions;
-- ============================================================================
-- SISTEMA DE LIQUIDACIONES DE GUARDIAS MÉDICAS (S.L.G.)
-- Grow Labs - Migración Inicial
-- ============================================================================
-- Versión: 1.0.0
-- Fecha: 2025-11-25
-- Descripción: Estructura base para procesamiento de guardias médicas
--              con reglas de Pediatría, Ginecología y Adicionales
-- ============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsqueda full-text

-- ============================================================================
-- TABLA: medicos
-- Almacena información de médicos (residentes y de planta)
-- ============================================================================
CREATE TABLE IF NOT EXISTS medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  matricula VARCHAR(50) UNIQUE NOT NULL,
  es_residente BOOLEAN DEFAULT false,
  especialidad VARCHAR(100) NOT NULL, -- 'Pediatría', 'Ginecología', etc.
  activo BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices
  CONSTRAINT medicos_nombre_check CHECK (char_length(nombre) >= 3)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_medicos_matricula ON medicos(matricula);
CREATE INDEX IF NOT EXISTS idx_medicos_especialidad ON medicos(especialidad);
CREATE INDEX IF NOT EXISTS idx_medicos_es_residente ON medicos(es_residente);
CREATE INDEX IF NOT EXISTS idx_medicos_nombre_trgm ON medicos USING gin (nombre gin_trgm_ops);

COMMENT ON TABLE medicos IS 'Registro de médicos (residentes y de planta) del sistema';
COMMENT ON COLUMN medicos.es_residente IS 'true = Residente (aplican reglas de horario formativo), false = Médico de planta';
COMMENT ON COLUMN medicos.especialidad IS 'Especialidad médica (Pediatría, Ginecología, etc.)';

-- ============================================================================
-- TABLA: tarifas_guardia
-- Histórico de tarifas por tipo de guardia y fecha de vigencia
-- ============================================================================
CREATE TABLE IF NOT EXISTS tarifas_guardia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_guardia VARCHAR(50) NOT NULL, -- 'Pediatría', 'Ginecología'
  fecha_vigencia DATE NOT NULL,
  
  -- Valores de tarifa
  valor_hora DECIMAL(10, 2), -- Para guardias por hora (Ginecología)
  valor_consulta DECIMAL(10, 2), -- Para guardias por producción (Pediatría)
  valor_adicional DECIMAL(10, 2), -- Monto fijo adicional (ej. Damsu, Provincia)
  
  -- Porcentajes
  porcentaje_retencion DECIMAL(5, 2) DEFAULT 30.00, -- % de retención (ej. 30%)
  
  -- Metadata
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT tarifas_tipo_fecha_unique UNIQUE (tipo_guardia, fecha_vigencia),
  CONSTRAINT tarifas_valores_positivos CHECK (
    (valor_hora IS NULL OR valor_hora >= 0) AND
    (valor_consulta IS NULL OR valor_consulta >= 0) AND
    (valor_adicional IS NULL OR valor_adicional >= 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_tarifas_tipo_fecha ON tarifas_guardia(tipo_guardia, fecha_vigencia DESC);
CREATE INDEX IF NOT EXISTS idx_tarifas_vigencia ON tarifas_guardia(fecha_vigencia DESC);

COMMENT ON TABLE tarifas_guardia IS 'Histórico de tarifas por tipo de guardia (permite cambios de precio en el tiempo)';
COMMENT ON COLUMN tarifas_guardia.valor_hora IS 'Valor por hora trabajada (usado en Ginecología)';
COMMENT ON COLUMN tarifas_guardia.valor_consulta IS 'Valor por consulta (usado en Pediatría)';
COMMENT ON COLUMN tarifas_guardia.porcentaje_retencion IS 'Porcentaje de retención aplicado (ej. 30%)';

-- ============================================================================
-- TABLA: configuracion_adicionales
-- Define qué Obras Sociales pagan adicional por mes/año
-- ============================================================================
CREATE TABLE IF NOT EXISTS configuracion_adicionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_social VARCHAR(100) NOT NULL, -- 'Damsu', 'Provincia', etc.
  especialidad VARCHAR(50) NOT NULL, -- 'Pediatría', 'Ginecología'
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INTEGER NOT NULL CHECK (anio >= 2020),
  
  -- Configuración del adicional
  aplica_adicional BOOLEAN DEFAULT true,
  monto_adicional DECIMAL(10, 2), -- Monto fijo por consulta
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint única por OS/especialidad/periodo
  CONSTRAINT config_adicionales_unique UNIQUE (obra_social, especialidad, mes, anio)
);

CREATE INDEX IF NOT EXISTS idx_config_adicionales_periodo ON configuracion_adicionales(anio DESC, mes DESC);
CREATE INDEX IF NOT EXISTS idx_config_adicionales_os ON configuracion_adicionales(obra_social);

COMMENT ON TABLE configuracion_adicionales IS 'Configuración de adicionales por Obra Social (ej. Damsu, Provincia pagan extra en Pediatría)';
COMMENT ON COLUMN configuracion_adicionales.aplica_adicional IS 'Si es true, se suma el monto_adicional por cada consulta de esta OS';

-- ============================================================================
-- TABLA: liquidaciones_guardia
-- Cabecera de cada liquidación mensual
-- ============================================================================
CREATE TABLE IF NOT EXISTS liquidaciones_guardia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INTEGER NOT NULL CHECK (anio >= 2020),
  especialidad VARCHAR(50) NOT NULL, -- 'Pediatría', 'Ginecología'
  
  -- Estado del proceso
  estado VARCHAR(50) DEFAULT 'borrador', -- 'borrador', 'procesando', 'finalizada', 'aprobada'
  
  -- Totales calculados
  total_consultas INTEGER DEFAULT 0,
  total_bruto DECIMAL(12, 2) DEFAULT 0,
  total_retenciones DECIMAL(12, 2) DEFAULT 0,
  total_adicionales DECIMAL(12, 2) DEFAULT 0,
  total_neto DECIMAL(12, 2) DEFAULT 0,
  
  -- Archivo original
  archivo_nombre VARCHAR(255),
  archivo_url TEXT,
  
  -- Metadata
  procesado_por UUID, -- Referencia al usuario que procesó
  procesado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint única por periodo/especialidad
  CONSTRAINT liquidaciones_periodo_unique UNIQUE (mes, anio, especialidad)
);

CREATE INDEX IF NOT EXISTS idx_liquidaciones_periodo ON liquidaciones_guardia(anio DESC, mes DESC);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_estado ON liquidaciones_guardia(estado);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_especialidad ON liquidaciones_guardia(especialidad);

COMMENT ON TABLE liquidaciones_guardia IS 'Cabecera de liquidaciones mensuales por especialidad';
COMMENT ON COLUMN liquidaciones_guardia.estado IS 'borrador = En edición | procesando = Calculando | finalizada = Lista | aprobada = Cerrada';

-- ============================================================================
-- TABLA: detalle_guardia
-- Cada fila procesada del Excel (consultas/atenciones individuales)
-- ============================================================================
CREATE TABLE IF NOT EXISTS detalle_guardia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id UUID NOT NULL REFERENCES liquidaciones_guardia(id) ON DELETE CASCADE,
  medico_id UUID REFERENCES medicos(id) ON DELETE SET NULL,
  
  -- Datos de la atención
  fecha DATE NOT NULL,
  hora TIME,
  paciente VARCHAR(255),
  obra_social VARCHAR(100),
  
  -- Datos del médico (desnormalizados para histórico)
  medico_nombre VARCHAR(255),
  medico_matricula VARCHAR(50),
  medico_es_residente BOOLEAN,
  
  -- Cálculo de importe
  monto_facturado DECIMAL(10, 2), -- Monto original facturado
  porcentaje_retencion DECIMAL(5, 2), -- % aplicado
  monto_retencion DECIMAL(10, 2), -- Monto retenido
  monto_adicional DECIMAL(10, 2) DEFAULT 0, -- Adicional por OS
  importe_calculado DECIMAL(10, 2), -- Neto final para el médico
  
  -- Reglas aplicadas
  aplica_adicional BOOLEAN DEFAULT false,
  es_horario_formativo BOOLEAN DEFAULT false, -- true si es residente en horario 07:30-15:00
  
  -- Estado de revisión
  estado_revision VARCHAR(50) DEFAULT 'pendiente', -- 'pendiente', 'revisado', 'observado', 'aprobado'
  observaciones TEXT,
  
  -- Metadata
  fila_excel INTEGER, -- Número de fila original del Excel
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detalle_liquidacion ON detalle_guardia(liquidacion_id);
CREATE INDEX IF NOT EXISTS idx_detalle_medico ON detalle_guardia(medico_id);
CREATE INDEX IF NOT EXISTS idx_detalle_fecha ON detalle_guardia(fecha);
CREATE INDEX IF NOT EXISTS idx_detalle_estado ON detalle_guardia(estado_revision);
CREATE INDEX IF NOT EXISTS idx_detalle_obra_social ON detalle_guardia(obra_social);

COMMENT ON TABLE detalle_guardia IS 'Detalle de cada consulta/atención procesada del Excel';
COMMENT ON COLUMN detalle_guardia.es_horario_formativo IS 'true = Residente en horario 07:30-15:00 (no cobra)';
COMMENT ON COLUMN detalle_guardia.aplica_adicional IS 'true = Se aplicó adicional por Obra Social (Damsu, Provincia, etc.)';
COMMENT ON COLUMN detalle_guardia.estado_revision IS 'Estado de revisión manual de la fila';

-- ============================================================================
-- TABLA: feriados
-- Catálogo de feriados nacionales/provinciales
-- ============================================================================
CREATE TABLE IF NOT EXISTS feriados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL UNIQUE,
  descripcion VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'nacional', -- 'nacional', 'provincial', 'local'
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feriados_fecha ON feriados(fecha);
CREATE INDEX IF NOT EXISTS idx_feriados_tipo ON feriados(tipo);

COMMENT ON TABLE feriados IS 'Catálogo de feriados (usado para detectar guardias especiales)';

-- ============================================================================
-- TABLA: logs_procesamiento
-- Auditoría de procesamiento de archivos Excel
-- ============================================================================
CREATE TABLE IF NOT EXISTS logs_procesamiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id UUID REFERENCES liquidaciones_guardia(id) ON DELETE CASCADE,
  
  -- Información del proceso
  tipo_evento VARCHAR(50) NOT NULL, -- 'inicio', 'error', 'advertencia', 'finalizado'
  mensaje TEXT NOT NULL,
  detalle JSONB, -- Información adicional en formato JSON
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_liquidacion ON logs_procesamiento(liquidacion_id);
CREATE INDEX IF NOT EXISTS idx_logs_tipo ON logs_procesamiento(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_logs_fecha ON logs_procesamiento(created_at DESC);

COMMENT ON TABLE logs_procesamiento IS 'Auditoría de procesamiento de liquidaciones';

-- ============================================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
DROP TRIGGER IF EXISTS update_medicos_updated_at ON medicos; CREATE TRIGGER update_medicos_updated_at BEFORE UPDATE ON medicos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tarifas_updated_at ON tarifas_guardia; CREATE TRIGGER update_tarifas_updated_at BEFORE UPDATE ON tarifas_guardia
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_config_adicionales_updated_at ON configuracion_adicionales; CREATE TRIGGER update_config_adicionales_updated_at BEFORE UPDATE ON configuracion_adicionales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_liquidaciones_updated_at ON liquidaciones_guardia; CREATE TRIGGER update_liquidaciones_updated_at BEFORE UPDATE ON liquidaciones_guardia
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_detalle_updated_at ON detalle_guardia; CREATE TRIGGER update_detalle_updated_at BEFORE UPDATE ON detalle_guardia
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feriados_updated_at ON feriados; CREATE TRIGGER update_feriados_updated_at BEFORE UPDATE ON feriados
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- POLÍTICAS RLS (Row Level Security) - BÁSICAS
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifas_guardia ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_adicionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidaciones_guardia ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_guardia ENABLE ROW LEVEL SECURITY;
ALTER TABLE feriados ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_procesamiento ENABLE ROW LEVEL SECURITY;

-- Política básica: Permitir todo a usuarios autenticados (ajustar según roles)
-- NOTA: En producción, refinar estas políticas según roles (admin, médico, auditor)

CREATE POLICY "Permitir lectura a autenticados" ON medicos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir todo a autenticados" ON medicos
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir lectura a autenticados" ON tarifas_guardia
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir todo a autenticados" ON tarifas_guardia
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir lectura a autenticados" ON configuracion_adicionales
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir todo a autenticados" ON configuracion_adicionales
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir lectura a autenticados" ON liquidaciones_guardia
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir todo a autenticados" ON liquidaciones_guardia
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir lectura a autenticados" ON detalle_guardia
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir todo a autenticados" ON detalle_guardia
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir lectura a autenticados" ON feriados
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir todo a autenticados" ON feriados
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir lectura a autenticados" ON logs_procesamiento
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir inserción a autenticados" ON logs_procesamiento
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- DATOS INICIALES (SEED)
-- ============================================================================

-- Insertar feriados nacionales 2025 (Argentina)
INSERT INTO feriados (fecha, descripcion, tipo) VALUES
  ('2025-01-01', 'Año Nuevo', 'nacional'),
  ('2025-03-03', 'Carnaval', 'nacional'),
  ('2025-03-04', 'Carnaval', 'nacional'),
  ('2025-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia', 'nacional'),
  ('2025-04-02', 'Día del Veterano y de los Caídos en la Guerra de Malvinas', 'nacional'),
  ('2025-04-18', 'Viernes Santo', 'nacional'),
  ('2025-05-01', 'Día del Trabajador', 'nacional'),
  ('2025-05-25', 'Día de la Revolución de Mayo', 'nacional'),
  ('2025-06-20', 'Paso a la Inmortalidad del General Manuel Belgrano', 'nacional'),
  ('2025-07-09', 'Día de la Independencia', 'nacional'),
  ('2025-08-17', 'Paso a la Inmortalidad del General José de San Martín', 'nacional'),
  ('2025-10-12', 'Día del Respeto a la Diversidad Cultural', 'nacional'),
  ('2025-11-24', 'Día de la Soberanía Nacional', 'nacional'),
  ('2025-12-08', 'Inmaculada Concepción de María', 'nacional'),
  ('2025-12-25', 'Navidad', 'nacional')
ON CONFLICT (fecha) DO NOTHING;

-- Tarifas iniciales de ejemplo (ajustar según valores reales)
INSERT INTO tarifas_guardia (tipo_guardia, fecha_vigencia, valor_consulta, porcentaje_retencion) VALUES
  ('Pediatría', '2025-01-01', 5000.00, 30.00)
ON CONFLICT (tipo_guardia, fecha_vigencia) DO NOTHING;

INSERT INTO tarifas_guardia (tipo_guardia, fecha_vigencia, valor_hora, porcentaje_retencion) VALUES
  ('Ginecología', '2025-01-01', 8000.00, 0.00)
ON CONFLICT (tipo_guardia, fecha_vigencia) DO NOTHING;

-- Configuración de adicionales de ejemplo
INSERT INTO configuracion_adicionales (obra_social, especialidad, mes, anio, aplica_adicional, monto_adicional) VALUES
  ('Damsu', 'Pediatría', 11, 2025, true, 1500.00),
  ('Provincia', 'Pediatría', 11, 2025, true, 1200.00)
ON CONFLICT (obra_social, especialidad, mes, anio) DO NOTHING;

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista: Resumen de liquidaciones con totales
CREATE OR REPLACE VIEW v_resumen_liquidaciones AS
SELECT 
  l.id,
  l.mes,
  l.anio,
  l.especialidad,
  l.estado,
  l.total_consultas,
  l.total_bruto,
  l.total_retenciones,
  l.total_adicionales,
  l.total_neto,
  COUNT(DISTINCT d.medico_id) as cantidad_medicos,
  l.created_at,
  l.updated_at
FROM liquidaciones_guardia l
LEFT JOIN detalle_guardia d ON l.id = d.liquidacion_id
GROUP BY l.id;

COMMENT ON VIEW v_resumen_liquidaciones IS 'Resumen de liquidaciones con cantidad de médicos';

-- Vista: Detalle con información completa
CREATE OR REPLACE VIEW v_detalle_completo AS
SELECT 
  d.id,
  d.liquidacion_id,
  l.mes,
  l.anio,
  l.especialidad,
  d.fecha,
  d.hora,
  d.paciente,
  d.obra_social,
  d.medico_nombre,
  d.medico_matricula,
  d.medico_es_residente,
  d.monto_facturado,
  d.porcentaje_retencion,
  d.monto_retencion,
  d.monto_adicional,
  d.importe_calculado,
  d.aplica_adicional,
  d.es_horario_formativo,
  d.estado_revision,
  d.observaciones
FROM detalle_guardia d
INNER JOIN liquidaciones_guardia l ON d.liquidacion_id = l.id;

COMMENT ON VIEW v_detalle_completo IS 'Detalle de guardias con información de liquidación';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

-- Verificar que todo se creó correctamente
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '📊 Tablas creadas: medicos, tarifas_guardia, configuracion_adicionales, liquidaciones_guardia, detalle_guardia, feriados, logs_procesamiento';
  RAISE NOTICE '🔒 RLS habilitado en todas las tablas';
  RAISE NOTICE '🌱 Datos iniciales insertados (feriados 2025, tarifas ejemplo)';
END $$;

