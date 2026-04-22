-- Migration Pro / Particulier
-- A executer sur la base Supabase existante.

alter table if exists desserts
  add column if not exists sell_price_particulier numeric,
  add column if not exists sell_price_pro numeric;

update desserts
set
  sell_price_particulier = coalesce(sell_price_particulier, sell_price, 0),
  sell_price_pro = coalesce(sell_price_pro, sell_price, 0);

alter table if exists desserts
  alter column sell_price_particulier set default 0,
  alter column sell_price_particulier set not null,
  alter column sell_price_pro set default 0,
  alter column sell_price_pro set not null;

alter table if exists history_entries
  add column if not exists customer_type text not null default 'particulier';

alter table if exists history_entries
  drop constraint if exists history_entries_customer_type_check;

alter table if exists history_entries
  add constraint history_entries_customer_type_check
  check (customer_type in ('particulier', 'pro'));

alter table if exists commandes
  add column if not exists customer_type text not null default 'particulier';

alter table if exists commandes
  drop constraint if exists commandes_customer_type_check;

alter table if exists commandes
  add constraint commandes_customer_type_check
  check (customer_type in ('particulier', 'pro'));
