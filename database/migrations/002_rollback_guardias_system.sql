-- ============================================================================
-- ROLLBACK: SISTEMA DE GUARDIAS MÉDICAS
-- ============================================================================
-- Versión: 2.0.0
-- Fecha: 2025-11-25
-- Descripción: Revierte la migración 002_add_guardias_system.sql
--              Elimina SOLO las tablas del sistema de Guardias
--              NO afecta el sistema de Instrumentadores
-- ============================================================================
-- IMPORTANTE: Este script es SEGURO
--             - Solo elimina tablas de Guardias
--             - NO toca tablas de Instrumentadores
--             - NO elimina la tabla 'feriados' (compartida)
-- ============================================================================

-- Iniciar transacción para seguridad
BEGIN;

DO $$
BEGIN
  RAISE NOTICE '⚠️  Iniciando rollback del Sistema de Guardias Médicas...';
  RAISE NOTICE '✅ Este rollback NO afectará el sistema de Instrumentadores';
END $$;

-- ============================================================================
-- ELIMINAR VISTAS
-- ============================================================================

DROP VIEW IF EXISTS v_detalle_guardia_completo CASCADE;
DROP VIEW IF EXISTS v_resumen_liquidaciones_guardia CASCADE;

-- ============================================================================
-- ELIMINAR POLÍTICAS RLS
-- ============================================================================

DROP POLICY IF EXISTS "Permitir todo a autenticados" ON medicos;
DROP POLICY IF EXISTS "Permitir todo a autenticados" ON tarifas_guardia;
DROP POLICY IF EXISTS "Permitir todo a autenticados" ON configuracion_adicionales;
DROP POLICY IF EXISTS "Permitir todo a autenticados" ON liquidaciones_guardia;
DROP POLICY IF EXISTS "Permitir todo a autenticados" ON detalle_guardia;
DROP POLICY IF EXISTS "Permitir lectura a autenticados" ON logs_procesamiento;
DROP POLICY IF EXISTS "Permitir inserción a autenticados" ON logs_procesamiento;

-- ============================================================================
-- ELIMINAR TABLAS (en orden inverso de dependencias)
-- ============================================================================

-- Eliminar tablas que dependen de otras primero
DROP TABLE IF EXISTS logs_procesamiento CASCADE;
DROP TABLE IF EXISTS detalle_guardia CASCADE;
DROP TABLE IF EXISTS liquidaciones_guardia CASCADE;
DROP TABLE IF EXISTS configuracion_adicionales CASCADE;
DROP TABLE IF EXISTS tarifas_guardia CASCADE;
DROP TABLE IF EXISTS medicos CASCADE;

-- IMPORTANTE: NO eliminamos 'feriados' porque es compartida con Instrumentadores
-- DROP TABLE IF EXISTS feriados CASCADE; -- ❌ NO EJECUTAR

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
  tabla_count INTEGER;
  tablas_restantes TEXT;
BEGIN
  -- Verificar que las tablas de Guardias fueron eliminadas
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
  
  IF tabla_count = 0 THEN
    RAISE NOTICE '✅ Rollback completado exitosamente';
    RAISE NOTICE '📊 Todas las tablas del sistema de Guardias fueron eliminadas';
    RAISE NOTICE '✅ El sistema de Instrumentadores NO fue afectado';
    RAISE NOTICE '⚠️  La tabla "feriados" se mantuvo (compartida)';
  ELSE
    RAISE WARNING '⚠️  Advertencia: Aún quedan % tablas de Guardias', tabla_count;
    
    -- Mostrar qué tablas quedaron
    SELECT string_agg(table_name, ', ') INTO tablas_restantes
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
    
    RAISE WARNING 'Tablas restantes: %', tablas_restantes;
  END IF;
END $$;

-- Confirmar transacción
COMMIT;

-- ============================================================================
-- FIN DE ROLLBACK
-- ============================================================================

-- ============================================================================
-- INSTRUCCIONES DE USO
-- ============================================================================
-- 
-- Para ejecutar este rollback:
-- 1. Ir a Supabase Dashboard → SQL Editor
-- 2. Copiar y pegar este script completo
-- 3. Ejecutar
-- 
-- Para verificar que el rollback funcionó:
-- 1. Ir a Table Editor
-- 2. Verificar que NO aparecen las tablas de Guardias
-- 3. Verificar que SÍ aparecen las tablas de Instrumentadores
-- 4. Verificar que la tabla 'feriados' sigue existiendo
-- 
-- Para volver a aplicar la migración después del rollback:
-- 1. Ejecutar nuevamente: 002_add_guardias_system.sql
-- 
-- ============================================================================
