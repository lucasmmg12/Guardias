SET search_path = public, extensions;
-- Migración 011: Actualizar GRUPO_40 a GRUPO_50
-- Fecha: 2025-12-23
-- Descripción: Actualiza los registros existentes de GRUPO_40 a GRUPO_50 en clinical_groups_config

-- 1. Primero eliminamos el constraint existente para permitir el cambio de valor
-- El nombre suele ser automático si se definió inline en el CREATE TABLE
DO $$ 
BEGIN
    ALTER TABLE clinical_groups_config DROP CONSTRAINT IF EXISTS clinical_groups_config_group_type_check;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- 2. Actualizar registros existentes de GRUPO_40 a GRUPO_50
UPDATE clinical_groups_config 
SET group_type = 'GRUPO_50' 
WHERE group_type = 'GRUPO_40';

-- 3. Volver a crear el constraint permitiendo solo los nuevos valores correctos
ALTER TABLE clinical_groups_config 
ADD CONSTRAINT clinical_groups_config_group_type_check 
CHECK (group_type IN ('GRUPO_70', 'GRUPO_50'));

-- 4. Actualizar comentario
COMMENT ON COLUMN clinical_groups_config.group_type IS 'GRUPO_70 = 70% del bruto, GRUPO_50 = 50% del bruto (anteriormente GRUPO_40)';

