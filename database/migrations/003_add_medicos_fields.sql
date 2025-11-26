-- ============================================================================
-- MIGRACIÓN: Agregar campos adicionales a tabla medicos
-- ============================================================================
-- Versión: 3.0.0
-- Fecha: 2025-01-XX
-- Descripción: Agrega campos CUIT, Grupo Persona, Perfil y Matrícula Provincial
--              para compatibilidad con el sistema de prestadores
-- ============================================================================

BEGIN;

-- Agregar nuevos campos a la tabla medicos
ALTER TABLE medicos
  ADD COLUMN IF NOT EXISTS cuit VARCHAR(20),
  ADD COLUMN IF NOT EXISTS grupo_persona VARCHAR(100),
  ADD COLUMN IF NOT EXISTS perfil VARCHAR(100),
  ADD COLUMN IF NOT EXISTS matricula_provincial VARCHAR(50);

-- Aumentar límites de campos existentes si es necesario
ALTER TABLE medicos
  ALTER COLUMN especialidad TYPE VARCHAR(200);

-- Crear índices para los nuevos campos
CREATE INDEX IF NOT EXISTS idx_medicos_cuit ON medicos(cuit);
CREATE INDEX IF NOT EXISTS idx_medicos_grupo_persona ON medicos(grupo_persona);
CREATE INDEX IF NOT EXISTS idx_medicos_perfil ON medicos(perfil);
CREATE INDEX IF NOT EXISTS idx_medicos_matricula_provincial ON medicos(matricula_provincial);

-- Agregar comentarios
COMMENT ON COLUMN medicos.cuit IS 'CUIT del médico (Clave Única de Identificación Tributaria)';
COMMENT ON COLUMN medicos.grupo_persona IS 'Grupo de persona (ej: Médico, Enfermero, etc.)';
COMMENT ON COLUMN medicos.perfil IS 'Perfil del médico (ej: DOCTOR, RESIDENTE, etc.)';
COMMENT ON COLUMN medicos.matricula_provincial IS 'Matrícula provincial del médico';

-- Si matricula_provincial está vacía, copiar el valor de matricula
UPDATE medicos
SET matricula_provincial = matricula
WHERE matricula_provincial IS NULL OR matricula_provincial = '';

COMMIT;

