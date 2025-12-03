-- Migración 007: Agregar campos para cálculo de adicionales con porcentaje
-- Fecha: 2025-01-XX
-- Descripción: Agrega campos monto_base_adicional y porcentaje_pago_medico a configuracion_adicionales
--              para permitir calcular el monto que recibe el médico basado en un porcentaje del monto base

-- Agregar campo monto_base_adicional (el monto total del adicional, ej: $10,000)
ALTER TABLE configuracion_adicionales 
ADD COLUMN IF NOT EXISTS monto_base_adicional DECIMAL(10, 2);

-- Agregar campo porcentaje_pago_medico (el porcentaje que se paga al médico, ej: 50%)
ALTER TABLE configuracion_adicionales 
ADD COLUMN IF NOT EXISTS porcentaje_pago_medico DECIMAL(5, 2);

-- Comentarios explicativos
COMMENT ON COLUMN configuracion_adicionales.monto_base_adicional IS 'Monto total del adicional (ej: $10,000 para DAMSU/PROVINCIA). Se usa junto con porcentaje_pago_medico para calcular monto_adicional';
COMMENT ON COLUMN configuracion_adicionales.porcentaje_pago_medico IS 'Porcentaje del monto base que se paga al médico (ej: 50). Fórmula: monto_adicional = monto_base_adicional * (porcentaje_pago_medico / 100)';

-- Si monto_base_adicional y porcentaje_pago_medico están definidos, calcular monto_adicional automáticamente
-- Nota: Esto se puede hacer con un trigger o en la aplicación
-- Por ahora, se calculará en la aplicación al procesar

