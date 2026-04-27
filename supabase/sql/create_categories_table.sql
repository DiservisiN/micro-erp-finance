-- Create categories table for inventory and expense management
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null check (type in ('inventory', 'expense')),
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(name, type)
);

-- Create index on name and type for faster lookups
create index if not exists categories_name_type_idx on public.categories(name, type);
create index if not exists categories_type_idx on public.categories(type);

-- Enable RLS
alter table public.categories enable row level security;

-- Create policy to allow authenticated users to read categories
create policy "Allow authenticated users to read categories"
  on public.categories for select
  to authenticated
  using (true);

-- Create policy to allow authenticated users to insert categories
create policy "Allow authenticated users to insert categories"
  on public.categories for insert
  to authenticated
  with check (true);

-- Create policy to allow authenticated users to update categories
create policy "Allow authenticated users to update categories"
  on public.categories for update
  to authenticated
  using (true)
  with check (true);

-- Create policy to allow authenticated users to delete categories
create policy "Allow authenticated users to delete categories"
  on public.categories for delete
  to authenticated
  using (true);

-- Create trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.categories
  for each row
  execute procedure public.handle_updated_at();

-- Insert default categories if they don't exist
insert into public.categories (name, type, description)
values 
  ('Electronics', 'inventory', 'Electronic devices and components'),
  ('Accessories', 'inventory', 'Phone accessories and peripherals'),
  ('Consumables', 'inventory', 'Consumable items like cables, adapters'),
  ('Operational', 'expense', 'Rent, Utilities, Internet, etc.'),
  ('Supplies', 'expense', 'Office supplies, Equipment, etc.'),
  ('Personnel', 'expense', 'Salaries, Bonuses, etc.'),
  ('Marketing', 'expense', 'Ads, Promotions, etc.'),
  ('Transportation', 'expense', 'Fuel, Maintenance, etc.'),
  ('Miscellaneous', 'expense', 'Other expenses')
on conflict (name, type) do nothing;
