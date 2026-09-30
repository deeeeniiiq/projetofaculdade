alter table public.transacoes
  add column if not exists destinatario text,
  add column if not exists identificador text,
  add column if not exists metodo text,
  add column if not exists mensagem text,
  add column if not exists categoria text,
  add column if not exists status text default 'Concluída',
  add column if not exists taxa numeric(12, 2) default 0;

