-- Presupeitor2000 — Supabase Postgres schema
--
-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL
-- Editor → New query → paste → Run) after creating the project. See
-- DIST.md → "Supabase setup" for the full walkthrough.
--
-- Every table is scoped to the signed-in user via `user_id` + Row Level
-- Security: a user can only ever see/modify their own rows, enforced by
-- Postgres itself (not just app code), even though this is a plain Postgres
-- database, not something Supabase-Auth-specific.
--
-- Nested presentation config (Template's page/typography/colors/cover/
-- header/footer/table/finalPage, and Estimate.templateOverrides) is stored
-- as jsonb rather than one column per field — it mirrors the single JSON
-- blob these already were in the previous localStorage-backed persistence,
-- and keeps this schema from having to change every time TemplateConfig
-- gains a field. Core queryable/numeric fields (amounts, ids, ordering)
-- still get real typed columns per AGENTS.md "Data Integrity".

-- ── customers ────────────────────────────────────────────────────────────
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  tax_id text not null default '',
  notes text not null default ''
);
create index if not exists customers_user_id_idx on customers(user_id);

-- ── item_categories ──────────────────────────────────────────────────────
create table if not exists item_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  "order" integer not null
);
create index if not exists item_categories_user_id_idx on item_categories(user_id);

-- ── items (library) ──────────────────────────────────────────────────────
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null default '',
  description text not null default '',
  unit text not null default '',
  default_price numeric not null default 0,
  category_id uuid references item_categories(id) on delete set null,
  keywords text not null default ''
);
create index if not exists items_user_id_idx on items(user_id);

-- ── templates ─────────────────────────────────────────────────────────────
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  is_default boolean not null default false,
  config jsonb not null default '{}'::jsonb
);
create index if not exists templates_user_id_idx on templates(user_id);

-- ── estimates ─────────────────────────────────────────────────────────────
create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  estimate_number text not null default '',
  year integer not null,
  customer_id uuid references customers(id) on delete set null,
  subject text not null default '',
  site text not null default '',
  creation_date timestamptz not null default now(),
  status text not null default 'draft',
  tax_rate numeric not null default 0,
  introduction text not null default '',
  template_id uuid references templates(id) on delete set null,
  final_note_title text not null default '',
  final_note_content text not null default '',
  template_overrides jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists estimates_user_id_idx on estimates(user_id);

-- ── chapters ──────────────────────────────────────────────────────────────
create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  estimate_id uuid not null references estimates(id) on delete cascade,
  title text not null default '',
  "order" integer not null default 0
);
create index if not exists chapters_user_id_idx on chapters(user_id);
create index if not exists chapters_estimate_id_idx on chapters(estimate_id);

-- ── line_items ────────────────────────────────────────────────────────────
create table if not exists line_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  code text not null default '',
  description text not null default '',
  unit text not null default '',
  quantity numeric not null default 0,
  unit_price numeric not null default 0,
  amount numeric not null default 0,
  "order" integer not null default 0
);
create index if not exists line_items_user_id_idx on line_items(user_id);
create index if not exists line_items_chapter_id_idx on line_items(chapter_id);

-- ── company_profile (one row per user) ───────────────────────────────────
create table if not exists company_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  creation_location text not null default ''
);

-- ── app_settings (one row per user) ──────────────────────────────────────
create table if not exists app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_tax_rate numeric not null default 0
);

-- ── Row Level Security ────────────────────────────────────────────────────
-- Every table gets the same policy shape: a user may select/insert/update/
-- delete only rows whose user_id is their own auth.uid(). Run this whole
-- file again after adding a new table and it stays idempotent.
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'customers', 'item_categories', 'items', 'templates',
      'estimates', 'chapters', 'line_items',
      'company_profile', 'app_settings'
    ])
  loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format(
      'create policy %I on %I for select using (auth.uid() = user_id)',
      t || '_select', t
    );

    execute format('drop policy if exists %I on %I', t || '_insert', t);
    execute format(
      'create policy %I on %I for insert with check (auth.uid() = user_id)',
      t || '_insert', t
    );

    execute format('drop policy if exists %I on %I', t || '_update', t);
    execute format(
      'create policy %I on %I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_update', t
    );

    execute format('drop policy if exists %I on %I', t || '_delete', t);
    execute format(
      'create policy %I on %I for delete using (auth.uid() = user_id)',
      t || '_delete', t
    );
  end loop;
end $$;
