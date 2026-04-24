-- À exécuter dans Supabase → SQL Editor (corrige l'erreur "Could not find catalogue_unit_at_sale").
-- Puis : Table Editor → recharger la page ou attendre quelques secondes (cache schéma PostgREST).

alter table public.history_entries
  add column if not exists catalogue_unit_at_sale numeric not null default 0;

comment on column public.history_entries.catalogue_unit_at_sale is 'Prix unitaire catalogue avant offre lot (figé à la vente)';

alter table public.history_entries
  add column if not exists revenue_caption text not null default '';

comment on column public.history_entries.revenue_caption is 'Légende figée ex. 5x3+1x3,60 (ordre de commande)';

alter table public.history_entries
  add column if not exists bundle_offer_label_at_sale text not null default '';

comment on column public.history_entries.bundle_offer_label_at_sale is 'Libellé offre figé (lot X = Y)';
