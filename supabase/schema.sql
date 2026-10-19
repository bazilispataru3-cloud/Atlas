-- ATLAS STUDY — schema Postgres/Supabase per la sincronizzazione cloud.
--
-- STATO: predisposto, NON ancora collegato all'app né testato su un progetto
-- Supabase reale. Oggi l'app salva tutto nel browser (localStorage + IndexedDB).
-- Le tabelle rispecchiano le entità di src/lib/store.ts; ogni riga appartiene a
-- un utente autenticato e la Row Level Security impedisce l'accesso ai dati altrui.

-- ── Profilo ─────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  university text not null default '',
  exam_target text not null default 'appello-1' check (exam_target in ('appello-1', 'appello-2')),
  daily_goal_minutes integer not null default 180 check (daily_goal_minutes between 15 and 720),
  levels jsonb not null default '{"biologia":"intermedio","chimica":"intermedio","fisica":"intermedio"}',
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Progressi per argomento (evidenze di recupero, non sola lettura) ──
create table if not exists public.topic_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id text not null,
  minutes real not null default 0,
  sections_read text[] not null default '{}',
  quiz jsonb not null default '[]',    -- [{date, score}]
  recall jsonb not null default '[]',  -- [{date, score}]
  first_studied timestamptz,
  last_studied timestamptz,
  primary key (user_id, topic_id)
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id text not null,
  subject text not null check (subject in ('biologia', 'chimica', 'fisica')),
  mode text not null,
  started_at timestamptz not null,
  minutes real not null check (minutes >= 0)
);
create index if not exists study_sessions_user_started on public.study_sessions (user_id, started_at desc);

-- ── Flashcard e ripetizione dilazionata ─────────────────────
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  front text not null,
  back text not null,
  subject text,
  topic_id text,
  deck text not null,
  origin text not null check (origin in ('atlas', 'manuale', 'ai', 'documento')),
  srs jsonb not null,                  -- {ease, interval, reps, lapses, due, last}
  due_at timestamptz generated always as ((srs ->> 'due')::timestamptz) stored,
  suspended boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists flashcards_user_due on public.flashcards (user_id, due_at) where not suspended;

create table if not exists public.card_reviews (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.flashcards (id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  rating smallint not null check (rating between 1 and 4),
  elapsed_days real not null default 0
);

-- ── Quiz e simulazioni ──────────────────────────────────────
create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('quiz', 'simulazione', 'sessione')),
  subject text,
  title text not null,
  correct integer not null,
  wrong integer not null,
  blank integer not null,
  total integer not null,
  score real not null,
  max_score real not null,
  duration_sec integer not null,
  answers jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ── Piano di studio, note e tecniche ────────────────────────
create table if not exists public.study_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  config jsonb not null,
  items jsonb not null,
  done text[] not null default '{}',
  generated_at timestamptz not null default now()
);

create table if not exists public.cornell_notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id text not null,
  cues text not null default '',
  notes text not null default '',
  summary text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create table if not exists public.memory_palaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  topic_id text,
  placements jsonb not null default '[]',
  walks jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.feynman_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id text not null,
  text text not null,
  score real not null,
  analysis text not null check (analysis in ('ai', 'locale')),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  messages jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  resource_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, resource_id)
);

create table if not exists public.planned_resources (
  user_id uuid not null references auth.users (id) on delete cascade,
  resource_id text not null,
  title text not null,
  url text not null check (url ~ '^https://'),
  added_at timestamptz not null default now(),
  primary key (user_id, resource_id)
);

-- ── Biblioteca personale ────────────────────────────────────
create table if not exists public.library_docs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  mime text not null,
  size bigint not null,
  kind text not null check (kind in ('pdf', 'testo', 'audio', 'altro')),
  subject text,
  pages integer,
  source_url text,
  consent boolean not null check (consent),  -- il caricamento richiede la dichiarazione sui diritti d'uso
  bookmarks integer[] not null default '{}',
  storage_path text not null,                -- <user_id>/<doc_id> nel bucket privato "library"
  created_at timestamptz not null default now()
);

create table if not exists public.doc_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  doc_id uuid not null references public.library_docs (id) on delete cascade,
  page integer not null,
  text text not null,
  color text not null check (color in ('azure', 'gold', 'rose')),
  note text,
  created_at timestamptz not null default now()
);

-- Testo estratto per pagina (per ricerca e RAG con citazione della pagina).
create table if not exists public.doc_pages (
  doc_id uuid not null references public.library_docs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  page integer not null,
  text text not null,
  primary key (doc_id, page)
);

-- ── Row Level Security: ogni utente vede e modifica solo i propri dati ──
do $$
declare t text;
begin
  foreach t in array array[
    'topic_progress', 'study_sessions', 'flashcards', 'card_reviews', 'quiz_results', 'study_plans',
    'cornell_notes', 'memory_palaces', 'feynman_attempts', 'chat_threads', 'favorites', 'planned_resources',
    'library_docs', 'doc_highlights', 'doc_pages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ── Storage privato per i file della biblioteca ─────────────
insert into storage.buckets (id, name, public)
values ('library', 'library', false)
on conflict (id) do nothing;

drop policy if exists "library own files" on storage.objects;
create policy "library own files" on storage.objects for all to authenticated
  using (bucket_id = 'library' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'library' and (storage.foldername(name))[1] = auth.uid()::text);
