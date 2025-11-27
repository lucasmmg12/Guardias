-- Migración 006: Agregar número de liquidación
-- Fecha: 2025-01-XX
-- Descripción: Agrega campo numero_liquidacion a liquidaciones_guardia y función para calcularlo

-- Agregar campo numero_liquidacion a liquidaciones_guardia
ALTER TABLE liquidaciones_guardia 
ADD COLUMN IF NOT EXISTS numero_liquidacion INTEGER;

-- Crear función para calcular número de liquidación
-- Agosto 2025 = 401, Septiembre 2025 = 402, etc.
CREATE OR REPLACE FUNCTION calcular_numero_liquidacion(p_mes INTEGER, p_anio INTEGER)
RETURNS INTEGER AS $$
DECLARE
  mes_base INTEGER := 8; -- Agosto
  anio_base INTEGER := 2025;
  numero_base INTEGER := 401;
  meses_diferencia INTEGER;
BEGIN
  meses_diferencia := (p_anio - anio_base) * 12 + (p_mes - mes_base);
  RETURN numero_base + meses_diferencia;
END;
$$ LANGUAGE plpgsql;

-- Actualizar registros existentes con el número calculado
UPDATE liquidaciones_guardia
SET numero_liquidacion = calcular_numero_liquidacion(mes, anio)
WHERE numero_liquidacion IS NULL;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_liquidaciones_numero ON liquidaciones_guardia(numero_liquidacion);

-- Crear trigger para calcular automáticamente el número al insertar/actualizar
CREATE OR REPLACE FUNCTION trigger_calcular_numero_liquidacion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_liquidacion IS NULL THEN
    NEW.numero_liquidacion := calcular_numero_liquidacion(NEW.mes, NEW.anio);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger antes de insertar o actualizar
DROP TRIGGER IF EXISTS trigger_auto_numero_liquidacion ON liquidaciones_guardia;
CREATE TRIGGER trigger_auto_numero_liquidacion
  BEFORE INSERT OR UPDATE ON liquidaciones_guardia
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calcular_numero_liquidacion();

COMMENT ON COLUMN liquidaciones_guardia.numero_liquidacion IS 'Número secuencial de liquidación (401 = Agosto 2025, 402 = Septiembre 2025, etc.)';
COMMENT ON FUNCTION calcular_numero_liquidacion IS 'Calcula el número de liquidación basado en mes y año. Agosto 2025 = 401';

