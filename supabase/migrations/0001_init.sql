-- =====================================================================
--  Arkania Card Wars — schema inicial (Supabase / Postgres)
--  Aplicar: painel Supabase → SQL Editor → colar tudo → Run
--  (ou:  supabase db push  com a CLI depois de `supabase link`)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
create type card_rarity  as enum ('comum','incomum','raro','epico','mitica','lendario');
create type card_type    as enum ('HERO','SUPP');
create type card_dom     as enum ('FOR','VEL','INT','DEF');
create type match_status as enum ('aguardando','em_andamento','finalizada','abandonada');

-- ----------------------------------------------- trigger de updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- =====================================================================
--  profiles  (1:1 com auth.users)
-- =====================================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  foto_card   text,                              -- id da carta usada como avatar
  bio         text not null default '' check (char_length(bio) <= 240),
  moedas      integer not null default 0 check (moedas >= 0),
  partidas    integer not null default 0,
  vitorias    integer not null default 0,
  derrotas    integer not null default 0,
  uso_cartas  jsonb   not null default '{}'::jsonb,   -- { "<cardId>": nUsos }
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- cria o profile automaticamente no signup (bypass de RLS via security definer)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'Duelista-' || substr(new.id::text, 1, 8))
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
--  cards  (CATÁLOGO — fonte da verdade; editável no admin/service_role)
-- =====================================================================
create table public.cards (
  id          text primary key,                  -- slug: 'mago-negro'
  base        text not null,                     -- personagem: 'mago'
  nome        text not null,
  variante    text not null default 'Padrão',
  raridade    card_rarity not null,
  tipo        card_type   not null default 'HERO',
  dom         card_dom    not null,
  emoji       text,
  arte        text,                              -- arquivo da arte (null = usa emoji)
  stats       jsonb not null,                    -- { ATA,DEF,FOR,VEL,ENE,VID }
  habilidades jsonb not null default '[]'::jsonb,
  ativa       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_cards_updated before update on public.cards
  for each row execute function public.set_updated_at();

-- =====================================================================
--  player_cards  (posse de cartas por jogador)
-- =====================================================================
create table public.player_cards (
  player_id  uuid not null references public.profiles(id) on delete cascade,
  card_id    text not null references public.cards(id)   on delete cascade,
  quantidade integer not null default 1 check (quantidade >= 0),
  obtido_em  timestamptz not null default now(),
  primary key (player_id, card_id)
);
create index idx_player_cards_player on public.player_cards(player_id);

-- =====================================================================
--  decks  (deckbuilding — substitui arkania.decks.v1 do localStorage)
-- =====================================================================
create table public.decks (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references public.profiles(id) on delete cascade,
  slot       smallint not null,                 -- posição do deck (0..N-1)
  nome       text not null default 'Deck',
  cartas     text[] not null default '{}',      -- ids das cartas
  ativo      boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (player_id, slot)
);
create index idx_decks_player on public.decks(player_id);
create trigger trg_decks_updated before update on public.decks
  for each row execute function public.set_updated_at();

-- =====================================================================
--  matches  (duelos online)
-- =====================================================================
create table public.matches (
  id         uuid primary key default gen_random_uuid(),
  player1    uuid not null references public.profiles(id) on delete cascade,
  player2    uuid references public.profiles(id) on delete set null,
  vencedor   uuid references public.profiles(id) on delete set null,
  status     match_status not null default 'aguardando',
  deck1      text[] not null default '{}',
  deck2      text[] not null default '{}',
  estado     jsonb  not null default '{}'::jsonb, -- estado/log do duelo (turnos, apostas)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_matches_p1     on public.matches(player1);
create index idx_matches_p2     on public.matches(player2);
create index idx_matches_status on public.matches(status);
create trigger trg_matches_updated before update on public.matches
  for each row execute function public.set_updated_at();

-- =====================================================================
--  match_queue  (fila de matchmaking)
-- =====================================================================
create table public.match_queue (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  deck_slot smallint,
  rating    integer not null default 1000,
  entrou_em timestamptz not null default now()
);

-- =====================================================================
--  duel_pass  (Passe do Duelista)
-- =====================================================================
create table public.duel_pass (
  player_id  uuid not null references public.profiles(id) on delete cascade,
  temporada  text not null,
  xp         integer not null default 0,
  nivel      integer not null default 1,
  premium    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (player_id, temporada)
);
create trigger trg_pass_updated before update on public.duel_pass
  for each row execute function public.set_updated_at();

-- =====================================================================
--  RLS (Row Level Security)
-- =====================================================================
alter table public.profiles     enable row level security;
alter table public.cards        enable row level security;
alter table public.player_cards enable row level security;
alter table public.decks        enable row level security;
alter table public.matches      enable row level security;
alter table public.match_queue  enable row level security;
alter table public.duel_pass    enable row level security;

-- profiles: leitura pública (oponentes/ranking), edição só do dono
create policy "profiles_select_all"  on public.profiles for select using (true);
create policy "profiles_update_self" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- cards: catálogo público; escrita apenas via service_role (bypassa RLS)
create policy "cards_select_all" on public.cards for select using (true);

-- player_cards: cada jogador vê/gerencia só as suas
create policy "player_cards_select_self" on public.player_cards for select
  using (auth.uid() = player_id);
create policy "player_cards_write_self"  on public.player_cards for all
  using (auth.uid() = player_id) with check (auth.uid() = player_id);

-- decks: só do dono
create policy "decks_select_self" on public.decks for select using (auth.uid() = player_id);
create policy "decks_write_self"  on public.decks for all
  using (auth.uid() = player_id) with check (auth.uid() = player_id);

-- matches: só os participantes leem/atualizam; cria como player1
create policy "matches_select_parts" on public.matches for select
  using (auth.uid() = player1 or auth.uid() = player2);
create policy "matches_update_parts" on public.matches for update
  using (auth.uid() = player1 or auth.uid() = player2);
create policy "matches_insert_self"  on public.matches for insert
  with check (auth.uid() = player1);

-- fila: cada jogador gerencia só a própria entrada
create policy "queue_write_self" on public.match_queue for all
  using (auth.uid() = player_id) with check (auth.uid() = player_id);

-- passe: leitura do próprio (escrita fica a cargo de service_role / edge function)
create policy "pass_select_self" on public.duel_pass for select using (auth.uid() = player_id);

-- =====================================================================
--  Realtime — expõe as tabelas do duelo/fila ao Supabase Realtime
-- =====================================================================
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_queue;

-- NOTA: mutações de partida (estado do duelo, resultado, moedas, passe) devem
-- passar por Edge Functions com service_role para evitar trapaça client-side.
-- As policies acima liberam o mínimo para o protótipo online funcionar.
