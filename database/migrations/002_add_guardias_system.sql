-- ============================================================================
-- MIGRACIÓN INCREMENTAL: SISTEMA DE GUARDIAS MÉDICAS
-- ============================================================================
-- Versión: 2.0.0
-- Fecha: 2025-11-25
-- Descripción: Agrega tablas del Sistema de Guardias a la base de datos existente
--              SIN MODIFICAR ninguna tabla del sistema de Instrumentadores
-- ============================================================================
-- IMPORTANTE: Esta migración es SEGURA y REVERSIBLE
--             - Solo CREA tablas nuevas
--             - NO modifica tablas existentes
--             - Comparte tabla 'feriados' con sistema de Instrumentadores
-- ============================================================================

-- Iniciar transacción para seguridad
BEGIN;

-- ============================================================================
-- VERIFICACIÓN PREVIA
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🚀 Iniciando migración del Sistema de Guardias Médicas...';
  RAISE NOTICE '✅ Esta migración NO afectará el sistema de Instrumentadores';
END $$;

-- ============================================================================
-- TABLA: medicos
-- Almacena información de médicos (residentes y de planta)
-- ============================================================================
CREATE TABLE IF NOT EXISTS medicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

COMMENT ON TABLE medicos IS 'Registro de médicos (residentes y de planta) del sistema de Guardias';
COMMENT ON COLUMN medicos.es_residente IS 'true = Residente (aplican reglas de horario formativo), false = Médico de planta';

-- ============================================================================
-- TABLA: tarifas_guardia
-- Histórico de tarifas por tipo de guardia y fecha de vigencia
-- ============================================================================
CREATE TABLE IF NOT EXISTS tarifas_guardia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo_guardia VARCHAR(50) NOT NULL, -- 'Pediatría', 'Ginecología'
  fecha_vigencia DATE NOT NULL,
  
  -- Valores de tarifa
  valor_hora DECIMAL(10, 2), -- Para guardias por hora (Ginecología)
  valor_consulta DECIMAL(10, 2), -- Para guardias por producción (Pediatría)
  valor_adicional DECIMAL(10, 2), -- Monto fijo adicional
  
  -- Porcentajes
  porcentaje_retencion DECIMAL(5, 2) DEFAULT 30.00,
  
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

-- ============================================================================
-- TABLA: configuracion_adicionales
-- Define qué Obras Sociales pagan adicional por mes/año
-- ============================================================================
CREATE TABLE IF NOT EXISTS configuracion_adicionales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_social VARCHAR(100) NOT NULL,
  especialidad VARCHAR(50) NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INTEGER NOT NULL CHECK (anio >= 2020),
  
  -- Configuración del adicional
  aplica_adicional BOOLEAN DEFAULT true,
  monto_adicional DECIMAL(10, 2),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint única por OS/especialidad/periodo
  CONSTRAINT config_adicionales_unique UNIQUE (obra_social, especialidad, mes, anio)
);

CREATE INDEX IF NOT EXISTS idx_config_adicionales_periodo ON configuracion_adicionales(anio DESC, mes DESC);
CREATE INDEX IF NOT EXISTS idx_config_adicionales_os ON configuracion_adicionales(obra_social);

COMMENT ON TABLE configuracion_adicionales IS 'Configuración de adicionales por Obra Social (ej. Damsu, Provincia pagan extra en Pediatría)';

-- ============================================================================
-- TABLA: liquidaciones_guardia
-- Cabecera de cada liquidación mensual
-- NOTA: Nombre diferente de 'liquidaciones' (sistema Instrumentadores)
-- ============================================================================
CREATE TABLE IF NOT EXISTS liquidaciones_guardia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INTEGER NOT NULL CHECK (anio >= 2020),
  especialidad VARCHAR(50) NOT NULL,
  
  -- Estado del proceso
  estado VARCHAR(50) DEFAULT 'borrador',
  
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
  procesado_por UUID,
  procesado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint única por periodo/especialidad
  CONSTRAINT liquidaciones_guardia_periodo_unique UNIQUE (mes, anio, especialidad)
);

CREATE INDEX IF NOT EXISTS idx_liquidaciones_guardia_periodo ON liquidaciones_guardia(anio DESC, mes DESC);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_guardia_estado ON liquidaciones_guardia(estado);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_guardia_especialidad ON liquidaciones_guardia(especialidad);

COMMENT ON TABLE liquidaciones_guardia IS 'Cabecera de liquidaciones mensuales de guardias por especialidad';

-- ============================================================================
-- TABLA: detalle_guardia
-- Cada fila procesada del Excel (consultas/atenciones individuales)
-- NOTA: Nombre diferente de 'detalle' (sistema Instrumentadores)
-- ============================================================================
CREATE TABLE IF NOT EXISTS detalle_guardia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  monto_facturado DECIMAL(10, 2),
  porcentaje_retencion DECIMAL(5, 2),
  monto_retencion DECIMAL(10, 2),
  monto_adicional DECIMAL(10, 2) DEFAULT 0,
  importe_calculado DECIMAL(10, 2),
  
  -- Reglas aplicadas
  aplica_adicional BOOLEAN DEFAULT false,
  es_horario_formativo BOOLEAN DEFAULT false,
  
  -- Estado de revisión
  estado_revision VARCHAR(50) DEFAULT 'pendiente',
  observaciones TEXT,
  
  -- Metadata
  fila_excel INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detalle_guardia_liquidacion ON detalle_guardia(liquidacion_id);
CREATE INDEX IF NOT EXISTS idx_detalle_guardia_medico ON detalle_guardia(medico_id);
CREATE INDEX IF NOT EXISTS idx_detalle_guardia_fecha ON detalle_guardia(fecha);
CREATE INDEX IF NOT EXISTS idx_detalle_guardia_estado ON detalle_guardia(estado_revision);
CREATE INDEX IF NOT EXISTS idx_detalle_guardia_obra_social ON detalle_guardia(obra_social);

COMMENT ON TABLE detalle_guardia IS 'Detalle de cada consulta/atención procesada del Excel de guardias';

-- ============================================================================
-- TABLA: feriados (COMPARTIDA)
-- Verificar si existe, si no, crearla
-- Esta tabla se comparte con el sistema de Instrumentadores
-- ============================================================================
CREATE TABLE IF NOT EXISTS feriados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL UNIQUE,
  descripcion VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'nacional',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feriados_fecha ON feriados(fecha);
CREATE INDEX IF NOT EXISTS idx_feriados_tipo ON feriados(tipo);

COMMENT ON TABLE feriados IS 'Catálogo de feriados (COMPARTIDA entre Instrumentadores y Guardias)';

-- ============================================================================
-- TABLA: logs_procesamiento
-- Auditoría de procesamiento de archivos Excel
-- ============================================================================
CREATE TABLE IF NOT EXISTS logs_procesamiento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liquidacion_id UUID REFERENCES liquidaciones_guardia(id) ON DELETE CASCADE,
  
  -- Información del proceso
  tipo_evento VARCHAR(50) NOT NULL,
  mensaje TEXT NOT NULL,
  detalle JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_procesamiento_liquidacion ON logs_procesamiento(liquidacion_id);
CREATE INDEX IF NOT EXISTS idx_logs_procesamiento_tipo ON logs_procesamiento(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_logs_procesamiento_fecha ON logs_procesamiento(created_at DESC);

COMMENT ON TABLE logs_procesamiento IS 'Auditoría de procesamiento de liquidaciones de guardias';

-- ============================================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================================

-- Trigger para updated_at en tablas nuevas
CREATE TRIGGER update_medicos_updated_at BEFORE UPDATE ON medicos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tarifas_guardia_updated_at BEFORE UPDATE ON tarifas_guardia
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_config_adicionales_updated_at BEFORE UPDATE ON configuracion_adicionales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_liquidaciones_guardia_updated_at BEFORE UPDATE ON liquidaciones_guardia
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_detalle_guardia_updated_at BEFORE UPDATE ON detalle_guardia
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Solo crear trigger de feriados si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_feriados_updated_at'
  ) THEN
    CREATE TRIGGER update_feriados_updated_at BEFORE UPDATE ON feriados
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================================================

-- Habilitar RLS en tablas nuevas
ALTER TABLE medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifas_guardia ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_adicionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidaciones_guardia ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_guardia ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_procesamiento ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según roles en producción)
CREATE POLICY "Permitir todo a autenticados" ON medicos
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir todo a autenticados" ON tarifas_guardia
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir todo a autenticados" ON configuracion_adicionales
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir todo a autenticados" ON liquidaciones_guardia
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir todo a autenticados" ON detalle_guardia
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir lectura a autenticados" ON logs_procesamiento
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir inserción a autenticados" ON logs_procesamiento
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista: Resumen de liquidaciones con totales
CREATE OR REPLACE VIEW v_resumen_liquidaciones_guardia AS
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

COMMENT ON VIEW v_resumen_liquidaciones_guardia IS 'Resumen de liquidaciones de guardias con cantidad de médicos';

-- Vista: Detalle con información completa
CREATE OR REPLACE VIEW v_detalle_guardia_completo AS
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

COMMENT ON VIEW v_detalle_guardia_completo IS 'Detalle de guardias con información de liquidación';

-- ============================================================================
-- DATOS INICIALES (SEED)
-- ============================================================================

-- Insertar feriados nacionales 2025 (solo si no existen)
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

-- Tarifas iniciales de ejemplo
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
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
  tabla_count INTEGER;
BEGIN
  -- Contar tablas nuevas creadas
  SELECT COUNT(*) INTO tabla_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'medicos',
      'tarifas_guardia',
      'configuracion_adicionales',
      'liquidaciones_guardia',
      'detalle_guardia',
      'logs_procesamiento'
    );
  
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '📊 Tablas nuevas creadas: %', tabla_count;
  RAISE NOTICE '🔒 RLS habilitado en todas las tablas nuevas';
  RAISE NOTICE '🌱 Datos iniciales insertados (feriados 2025, tarifas ejemplo)';
  RAISE NOTICE '⚠️  IMPORTANTE: La tabla "feriados" es COMPARTIDA con el sistema de Instrumentadores';
  
  IF tabla_count < 6 THEN
    RAISE WARNING '⚠️  Advertencia: Se esperaban 6 tablas nuevas, se crearon %', tabla_count;
  END IF;
END $$;

-- Confirmar transacción
COMMIT;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
