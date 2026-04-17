-- Active l'extension pour générer des UUID
create extension if not exists "uuid-ossp";

-- 1. Raw Ingredients (Matières Premières)
create table raw_ingredients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  name text not null,
  price_per_kg numeric not null default 0,
  unit text not null check (unit in ('kg', 'L', 'u')),
  category text not null,
  emoji text not null,
  purchase_label text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Bases (Préparations Maison)
create table bases (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  name text not null,
  category text not null,
  emoji text not null,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Table de liaison (Composition des bases)
create table base_components (
  id uuid default uuid_generate_v4() primary key,
  base_id uuid references bases(id) on delete cascade not null,
  ingredient_id uuid references raw_ingredients(id) on delete restrict not null,
  quantity numeric not null check (quantity > 0),
  unique(base_id, ingredient_id)
);

-- 3. Desserts (Produits finis / Fiches Techniques)
create table desserts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  name text not null,
  emoji text not null,
  sell_price numeric not null default 0,
  servings integer not null default 1,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Table de liaison (Composition des desserts)
-- Note: 'ingredient_id' ou 'base_id' est rempli selon le type.
create table dessert_components (
  id uuid default uuid_generate_v4() primary key,
  dessert_id uuid references desserts(id) on delete cascade not null,
  type text not null check (type in ('ingredient', 'base')),
  ingredient_id uuid references raw_ingredients(id) on delete restrict,
  base_id uuid references bases(id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  
  -- Contrainte assurant que si c'est un ingrédient, la colonne ingrédient est non-nulle et l'autre est nulle.
  constraint chk_component_ref check (
    (type = 'ingredient' and ingredient_id is not null and base_id is null) or
    (type = 'base' and base_id is not null and ingredient_id is null)
  ),
  unique(dessert_id, ingredient_id, base_id)
);

-- 4. History Entries (Dashboard et Comptabilité)
create table history_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  date timestamptz default now() not null,
  dessert_id uuid references desserts(id) on delete set null,
  dessert_name text not null,
  dessert_emoji text not null,
  quantity_sold integer not null,
  unit_cost numeric not null,
  unit_price numeric not null,
  total_revenue numeric not null,
  total_cost numeric not null,
  total_profit numeric not null,
  margin_rate numeric not null,
  -- Les lignes de recette sont figées en JSONB (Snapshot) à la vente.
  lines_snapshot jsonb not null default '[]'::jsonb 
);

-- 5. TRiggers: Mise à jour automatique de la colonne updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_raw_ingredients_modtime
  before update on raw_ingredients for each row execute procedure update_updated_at_column();
create trigger update_bases_modtime
  before update on bases for each row execute procedure update_updated_at_column();
create trigger update_desserts_modtime
  before update on desserts for each row execute procedure update_updated_at_column();

-- ==========================================
-- SÉCURITÉ ET POLITIQUES (ROW LEVEL SECURITY)
-- ==========================================
alter table raw_ingredients enable row level security;
alter table bases enable row level security;
alter table base_components enable row level security;
alter table desserts enable row level security;
alter table dessert_components enable row level security;
alter table history_entries enable row level security;

-- Par défaut, un utilisateur ne peut voir et modifier que ses propres données.
create policy "Users manage own raw_ingredients" on raw_ingredients for all using (auth.uid() = user_id);
create policy "Users manage own bases" on bases for all using (auth.uid() = user_id);
create policy "Users manage own desserts" on desserts for all using (auth.uid() = user_id);
create policy "Users manage own history_entries" on history_entries for all using (auth.uid() = user_id);

-- La gestion des tables de liaison se fait par la vérification du parent (Base ou Dessert)
create policy "Users manage own base_components" on base_components for all using (
  exists (select 1 from bases where bases.id = base_components.base_id and bases.user_id = auth.uid())
);

create policy "Users manage own dessert_components" on dessert_components for all using (
  exists (select 1 from desserts where desserts.id = dessert_components.dessert_id and desserts.user_id = auth.uid())
);
