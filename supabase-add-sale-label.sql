-- Exécuter dans Supabase si la colonne n’existe pas encore.
-- Libellé compta (caisse) — figé sur chaque ligne du ticket.

alter table if exists public.history_entries
  add column if not exists sale_label text not null default '';

comment on column public.history_entries.sale_label is
  'Libre (caisse), même texte sur toutes les lignes du même order_group_id';
