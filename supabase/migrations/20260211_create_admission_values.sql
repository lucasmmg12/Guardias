-- Drop existing policies if they exist (prevent conflicts)
DROP POLICY IF EXISTS "Enable read access for all users" ON admission_values_config;
DROP POLICY IF EXISTS "Enable insert access for all users" ON admission_values_config;
DROP POLICY IF EXISTS "Enable update access for all users" ON admission_values_config;
DROP POLICY IF EXISTS "Enable delete access for all users" ON admission_values_config;

-- Create table
CREATE TABLE IF NOT EXISTS admission_values_config (
  id uuid default gen_random_uuid() primary key,
  mes integer not null,
  anio integer not null,
  valor_admision numeric not null default 12000,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(mes, anio)
);

-- Enable RLS
ALTER TABLE admission_values_config ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Enable read access for all users" ON admission_values_config
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON admission_values_config
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON admission_values_config
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON admission_values_config
  FOR DELETE USING (true);

-- Grant access to anon and authenticated roles
GRANT ALL ON admission_values_config TO anon;
GRANT ALL ON admission_values_config TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
