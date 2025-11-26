-- Migración 004: Sistema de Estadísticas por Obra Social y Mes
-- Fecha: 2025-01-XX
-- Descripción: Crea tabla y vistas para estadísticas de consultas por obra social y mes

-- Tabla para almacenar estadísticas de obra social por mes
CREATE TABLE IF NOT EXISTS estadisticas_obra_social (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes INTEGER NOT NULL,
  anio INTEGER NOT NULL,
  especialidad VARCHAR(50) NOT NULL,
  obra_social VARCHAR(100) NOT NULL,
  cantidad_consultas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint único: no puede haber duplicados de la misma combinación
  CONSTRAINT estadisticas_obra_social_unique UNIQUE (mes, anio, especialidad, obra_social)
);

-- Índices para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_estadisticas_mes_anio ON estadisticas_obra_social(mes, anio);
CREATE INDEX IF NOT EXISTS idx_estadisticas_especialidad ON estadisticas_obra_social(especialidad);
CREATE INDEX IF NOT EXISTS idx_estadisticas_obra_social ON estadisticas_obra_social(obra_social);
CREATE INDEX IF NOT EXISTS idx_estadisticas_completo ON estadisticas_obra_social(mes, anio, especialidad, obra_social);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_estadisticas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_estadisticas_updated_at
  BEFORE UPDATE ON estadisticas_obra_social
  FOR EACH ROW
  EXECUTE FUNCTION update_estadisticas_updated_at();

-- Vista para obtener estadísticas consolidadas
CREATE OR REPLACE VIEW v_estadisticas_obra_social_consolidado AS
SELECT 
  mes,
  anio,
  especialidad,
  obra_social,
  cantidad_consultas,
  ROUND(
    (cantidad_consultas::DECIMAL / NULLIF(SUM(cantidad_consultas) OVER (PARTITION BY mes, anio, especialidad), 0)) * 100,
    2
  ) AS porcentaje_del_total,
  SUM(cantidad_consultas) OVER (PARTITION BY mes, anio, especialidad) AS total_consultas_mes,
  created_at,
  updated_at
FROM estadisticas_obra_social
ORDER BY mes DESC, anio DESC, cantidad_consultas DESC;

-- Vista para resumen mensual por especialidad
CREATE OR REPLACE VIEW v_resumen_mensual_obra_social AS
SELECT 
  mes,
  anio,
  especialidad,
  COUNT(DISTINCT obra_social) AS cantidad_obras_sociales,
  SUM(cantidad_consultas) AS total_consultas,
  MAX(cantidad_consultas) AS max_consultas_obra_social,
  MIN(cantidad_consultas) AS min_consultas_obra_social,
  ROUND(AVG(cantidad_consultas), 2) AS promedio_consultas_por_obra_social
FROM estadisticas_obra_social
GROUP BY mes, anio, especialidad
ORDER BY anio DESC, mes DESC, especialidad;

-- Función para calcular y actualizar estadísticas desde detalle_guardia
CREATE OR REPLACE FUNCTION calcular_estadisticas_obra_social(
  p_mes INTEGER,
  p_anio INTEGER,
  p_especialidad VARCHAR(50)
)
RETURNS TABLE(
  obra_social VARCHAR(100),
  cantidad_consultas BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(d.obra_social, '042 - PARTICULARES') AS obra_social,
    COUNT(*) AS cantidad_consultas
  FROM detalle_guardia d
  INNER JOIN liquidaciones_guardia l ON d.liquidacion_id = l.id
  WHERE 
    l.mes = p_mes
    AND l.anio = p_anio
    AND l.especialidad = p_especialidad
    AND l.estado = 'finalizada'
  GROUP BY COALESCE(d.obra_social, '042 - PARTICULARES')
  ORDER BY cantidad_consultas DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para sincronizar estadísticas desde detalle_guardia
CREATE OR REPLACE FUNCTION sincronizar_estadisticas_obra_social(
  p_mes INTEGER,
  p_anio INTEGER,
  p_especialidad VARCHAR(50)
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_obra_social VARCHAR(100);
  v_cantidad BIGINT;
BEGIN
  -- Eliminar estadísticas existentes para este mes/año/especialidad
  DELETE FROM estadisticas_obra_social
  WHERE mes = p_mes AND anio = p_anio AND especialidad = p_especialidad;
  
  -- Insertar nuevas estadísticas calculadas desde detalle_guardia
  FOR v_obra_social, v_cantidad IN 
    SELECT * FROM calcular_estadisticas_obra_social(p_mes, p_anio, p_especialidad)
  LOOP
    INSERT INTO estadisticas_obra_social (mes, anio, especialidad, obra_social, cantidad_consultas)
    VALUES (p_mes, p_anio, p_especialidad, v_obra_social, v_cantidad)
    ON CONFLICT (mes, anio, especialidad, obra_social) 
    DO UPDATE SET 
      cantidad_consultas = EXCLUDED.cantidad_consultas,
      updated_at = NOW();
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Comentarios en la tabla
COMMENT ON TABLE estadisticas_obra_social IS 'Estadísticas de consultas por obra social, mes, año y especialidad';
COMMENT ON COLUMN estadisticas_obra_social.mes IS 'Mes de las estadísticas (1-12)';
COMMENT ON COLUMN estadisticas_obra_social.anio IS 'Año de las estadísticas';
COMMENT ON COLUMN estadisticas_obra_social.especialidad IS 'Especialidad (Pediatría, Ginecología, etc.)';
COMMENT ON COLUMN estadisticas_obra_social.obra_social IS 'Nombre de la obra social o "042 - PARTICULARES"';
COMMENT ON COLUMN estadisticas_obra_social.cantidad_consultas IS 'Cantidad de consultas para esta obra social en el mes';

-- Comentarios en las vistas
COMMENT ON VIEW v_estadisticas_obra_social_consolidado IS 'Vista consolidada de estadísticas con porcentajes del total';
COMMENT ON VIEW v_resumen_mensual_obra_social IS 'Resumen mensual de estadísticas por especialidad';

-- Comentarios en las funciones
COMMENT ON FUNCTION calcular_estadisticas_obra_social IS 'Calcula estadísticas de obra social desde detalle_guardia para un mes/año/especialidad específico';
COMMENT ON FUNCTION sincronizar_estadisticas_obra_social IS 'Sincroniza estadísticas desde detalle_guardia, eliminando y recalculando para un mes/año/especialidad específico';

