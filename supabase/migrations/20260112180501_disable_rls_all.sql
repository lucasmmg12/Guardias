-- Migración: Desactivación total de RLS y permisos abiertos
-- Objetivo: Eliminar cualquier bloqueo de "Permission Denied" para la aplicación

SET search_path = public, extensions;

DO $$
DECLARE
    t text;
    tables_to_fix text[] := ARRAY[
        'medicos', 
        'tarifas_guardia', 
        'configuracion_adicionales', 
        'liquidaciones_guardia', 
        'detalle_guardia', 
        'feriados', 
        'logs_procesamiento',
        'valores_consultas_obra_social',
        'clinical_groups_config',
        'clinical_values_config',
        'pediatric_groups_config',
        'detalle_horas_guardia'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_fix LOOP
        -- 1. Desactivar RLS (esto mata cualquier política restrictiva)
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
        
        -- 2. Otorgar todos los permisos a los roles de la web
        EXECUTE format('GRANT ALL ON TABLE %I TO anon', t);
        EXECUTE format('GRANT ALL ON TABLE %I TO authenticated', t);
        EXECUTE format('GRANT ALL ON TABLE %I TO service_role', t);
        
        -- 3. Por las dudas, otorgar permisos en las secuencias si las hay
        -- (aunque estamos usando UUIDs, es buena práctica)
    END LOOP;
    
    -- Otorgar permisos de uso del esquema
    GRANT USAGE ON SCHEMA public TO anon;
    GRANT USAGE ON SCHEMA public TO authenticated;
END $$;
