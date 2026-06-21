-- ============================================================
-- VOAZ Checkpoint Semanal — Schema Supabase
-- Execute este SQL no SQL Editor do seu projeto Supabase
-- ============================================================

-- Extensão para UUIDs
create extension if not exists "uuid-ossp";

-- ── USUARIOS ──────────────────────────────────────────────
create table public.usuarios (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  role text not null check (role in ('pm', 'socio')),
  created_at timestamptz default now()
);

alter table public.usuarios enable row level security;

-- Usuário vê apenas o próprio perfil
create policy "usuario_le_proprio" on public.usuarios
  for select using (auth.uid() = auth_id);

-- Sócios veem todos
create policy "socio_le_todos" on public.usuarios
  for select using (
    exists (
      select 1 from public.usuarios u
      where u.auth_id = auth.uid() and u.role = 'socio'
    )
  );

create policy "usuario_atualiza_proprio" on public.usuarios
  for update using (auth.uid() = auth_id);

-- ── OBRAS ──────────────────────────────────────────────────
create table public.obras (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  cliente text not null,
  local text,
  fase text,
  parceiros text,
  pm_id uuid references public.usuarios(id),
  ativa boolean default true,
  created_at timestamptz default now()
);

alter table public.obras enable row level security;

-- PM vê apenas suas obras; sócios veem todas
create policy "pm_le_proprias_obras" on public.obras
  for select using (
    pm_id = (select id from public.usuarios where auth_id = auth.uid())
    or exists (
      select 1 from public.usuarios where auth_id = auth.uid() and role = 'socio'
    )
  );

create policy "pm_cria_obra" on public.obras
  for insert with check (
    pm_id = (select id from public.usuarios where auth_id = auth.uid())
    or exists (
      select 1 from public.usuarios where auth_id = auth.uid() and role = 'socio'
    )
  );

create policy "pm_atualiza_propria_obra" on public.obras
  for update using (
    pm_id = (select id from public.usuarios where auth_id = auth.uid())
    or exists (
      select 1 from public.usuarios where auth_id = auth.uid() and role = 'socio'
    )
  );

-- ── RESPONSAVEIS ───────────────────────────────────────────
create table public.responsaveis (
  id uuid primary key default uuid_generate_v4(),
  obra_id uuid references public.obras(id) on delete cascade,
  nome text not null,
  created_at timestamptz default now()
);

alter table public.responsaveis enable row level security;

create policy "resp_le_da_obra" on public.responsaveis
  for select using (
    exists (
      select 1 from public.obras o
      where o.id = obra_id and (
        o.pm_id = (select id from public.usuarios where auth_id = auth.uid())
        or exists (select 1 from public.usuarios where auth_id = auth.uid() and role = 'socio')
      )
    )
  );

create policy "resp_escreve_da_obra" on public.responsaveis
  for all using (
    exists (
      select 1 from public.obras o
      where o.id = obra_id and (
        o.pm_id = (select id from public.usuarios where auth_id = auth.uid())
        or exists (select 1 from public.usuarios where auth_id = auth.uid() and role = 'socio')
      )
    )
  );

-- ── ATAS ───────────────────────────────────────────────────
create table public.atas (
  id uuid primary key default uuid_generate_v4(),
  obra_id uuid references public.obras(id) on delete cascade,
  tipo text not null check (tipo in ('interno', 'externo')),
  data_reuniao date not null default current_date,
  numero_reuniao int,
  created_by uuid references public.usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.atas enable row level security;

create policy "ata_le_da_obra" on public.atas
  for select using (
    exists (
      select 1 from public.obras o
      where o.id = obra_id and (
        o.pm_id = (select id from public.usuarios where auth_id = auth.uid())
        or exists (select 1 from public.usuarios where auth_id = auth.uid() and role = 'socio')
      )
    )
  );

create policy "ata_escreve_da_obra" on public.atas
  for all using (
    exists (
      select 1 from public.obras o
      where o.id = obra_id and (
        o.pm_id = (select id from public.usuarios where auth_id = auth.uid())
        or exists (select 1 from public.usuarios where auth_id = auth.uid() and role = 'socio')
      )
    )
  );

-- ── GRUPOS ─────────────────────────────────────────────────
create table public.grupos (
  id uuid primary key default uuid_generate_v4(),
  ata_id uuid references public.atas(id) on delete cascade,
  titulo text not null,
  ordem int not null default 0,
  created_at timestamptz default now()
);

alter table public.grupos enable row level security;

create policy "grupo_via_ata" on public.grupos
  for all using (
    exists (
      select 1 from public.atas a
      join public.obras o on o.id = a.obra_id
      where a.id = ata_id and (
        o.pm_id = (select id from public.usuarios where auth_id = auth.uid())
        or exists (select 1 from public.usuarios where auth_id = auth.uid() and role = 'socio')
      )
    )
  );

-- ── ITENS ──────────────────────────────────────────────────
create table public.itens (
  id uuid primary key default uuid_generate_v4(),
  grupo_id uuid references public.grupos(id) on delete cascade,
  ata_id uuid references public.atas(id) on delete cascade,
  obra_id uuid references public.obras(id) on delete cascade,
  assunto text not null,
  data_item date,
  data_limite date,
  responsavel text,
  observacoes text,
  status text not null default 'EM_ANDAMENTO'
    check (status in ('CONCLUIDO','EM_ANDAMENTO','ATRASADO','ALERTA','MONITORAMENTO')),
  ordem int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.itens enable row level security;

create policy "item_via_obra" on public.itens
  for all using (
    exists (
      select 1 from public.obras o
      where o.id = obra_id and (
        o.pm_id = (select id from public.usuarios where auth_id = auth.uid())
        or exists (select 1 from public.usuarios where auth_id = auth.uid() and role = 'socio')
      )
    )
  );

-- ── TRIGGER updated_at ────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger itens_updated_at before update on public.itens
  for each row execute function update_updated_at();

create trigger atas_updated_at before update on public.atas
  for each row execute function update_updated_at();

-- ── VIEW: pendencias (para o dashboard) ───────────────────
create or replace view public.pendencias as
  select
    i.id,
    i.assunto,
    i.responsavel,
    i.observacoes,
    i.status,
    i.data_limite,
    i.updated_at,
    a.tipo as tipo_ata,
    a.data_reuniao,
    o.id as obra_id,
    o.nome as obra_nome,
    o.cliente,
    o.pm_id,
    g.titulo as grupo_titulo,
    u.nome as pm_nome
  from public.itens i
  join public.grupos g on g.id = i.grupo_id
  join public.atas a on a.id = i.ata_id
  join public.obras o on o.id = i.obra_id
  join public.usuarios u on u.id = o.pm_id
  where i.status != 'CONCLUIDO';
