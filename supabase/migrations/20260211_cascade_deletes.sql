
-- Add cascade delete to detalle_guardia
ALTER TABLE detalle_guardia
DROP CONSTRAINT IF EXISTS detalle_guardia_liquidacion_id_fkey;

ALTER TABLE detalle_guardia
ADD CONSTRAINT detalle_guardia_liquidacion_id_fkey
FOREIGN KEY (liquidacion_id)
REFERENCES liquidaciones_guardia(id)
ON DELETE CASCADE;

-- Add cascade delete to detalle_horas_guardia (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'detalle_horas_guardia') THEN
        ALTER TABLE detalle_horas_guardia
        DROP CONSTRAINT IF EXISTS detalle_horas_guardia_liquidacion_id_fkey;

        ALTER TABLE detalle_horas_guardia
        ADD CONSTRAINT detalle_horas_guardia_liquidacion_id_fkey
        FOREIGN KEY (liquidacion_id)
        REFERENCES liquidaciones_guardia(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add cascade delete to logs_procesamiento if linked to liquidacion
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'logs_procesamiento' AND column_name = 'liquidacion_id') THEN
        ALTER TABLE logs_procesamiento
        DROP CONSTRAINT IF EXISTS logs_procesamiento_liquidacion_id_fkey;

        ALTER TABLE logs_procesamiento
        ADD CONSTRAINT logs_procesamiento_liquidacion_id_fkey
        FOREIGN KEY (liquidacion_id)
        REFERENCES liquidaciones_guardia(id)
        ON DELETE CASCADE;
    END IF;
END $$;
