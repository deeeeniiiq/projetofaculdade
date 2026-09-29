create table if not exists public.transacoes (
  id uuid primary key default gen_random_uuid(),
  descricao text not null check (char_length(descricao) between 2 and 80),
  valor numeric(12, 2) not null check (valor > 0),
  tipo text not null check (tipo in ('receita', 'despesa')),
  criado_em timestamptz not null default now()
);

create index if not exists transacoes_criado_em_idx
  on public.transacoes (criado_em desc);

alter table public.transacoes enable row level security;

drop policy if exists "leitura pública acadêmica" on public.transacoes;
drop policy if exists "inserção pública acadêmica" on public.transacoes;

-- Projeto acadêmico sem autenticação: libera leitura e inserção com a anon key.
-- Em produção, substitua por políticas vinculadas a auth.uid().
create policy "leitura pública acadêmica"
  on public.transacoes
  for select
  to anon
  using (true);

create policy "inserção pública acadêmica"
  on public.transacoes
  for insert
  to anon
  with check (true);
