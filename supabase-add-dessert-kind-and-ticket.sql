-- À exécuter dans Supabase (SQL Editor) si les colonnes n’existent pas encore.
-- Colonnes : famille produit, ticket de caisse, lien commande.

alter table if exists public.desserts
  add column if not exists product_kind text not null default 'tarte';

alter table if exists public.history_entries
  add column if not exists product_kind text not null default 'tarte',
  add column if not exists order_group_id text,
  add column if not exists source_commande_id text,
  add column if not exists catalogue_unit_at_sale numeric not null default 0,
  add column if not exists revenue_caption text not null default '',
  add column if not exists bundle_offer_label_at_sale text not null default '';

-- Lignes déjà en base : chaque enregistrement = un ticket seul
update public.history_entries
set order_group_id = id::text
where order_group_id is null or order_group_id = '';

comment on column public.desserts.product_kind is 'tarte | flan | tiramisu | autre';
comment on column public.history_entries.product_kind is 'Dénormalisé (figé) au moment de la vente';
comment on column public.history_entries.order_group_id is 'Même id pour toutes les lignes d un même encaissement';
comment on column public.history_entries.source_commande_id is 'Lien optionnel vers commandes.id si vente issue d une livraison';
comment on column public.history_entries.catalogue_unit_at_sale is 'Prix unitaire catalogue avant offre lot (figé à la vente)';
comment on column public.history_entries.revenue_caption is 'Légende figée ex. 5x3+1x3,60 (ordre de commande)';
comment on column public.history_entries.bundle_offer_label_at_sale is 'Offre ex. lot 5p=15e fige a la vente';
