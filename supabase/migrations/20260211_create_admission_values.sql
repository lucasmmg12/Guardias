
create table if not exists admission_values_config (
  id uuid default gen_random_uuid() primary key,
  mes integer not null,
  anio integer not null,
  valor_admision numeric not null default 12000,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(mes, anio)
);

alter table admission_values_config enable row level security;

create policy "Enable read access for all users" on admission_values_config
  for select using (true);

create policy "Enable insert access for all users" on admission_values_config
  for insert with check (true);

create policy "Enable update access for all users" on admission_values_config
  for update using (true);

create policy "Enable delete access for all users" on admission_values_config
  for delete using (true);
