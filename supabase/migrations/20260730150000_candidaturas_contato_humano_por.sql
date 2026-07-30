-- Quem marcou contato humano nesta candidatura (por vaga). Ana/disparo automático não preenche.

alter table public.candidaturas
  add column if not exists contato_humano_por text;

comment on column public.candidaturas.contato_humano_por is
  'Primeiro nome do recrutador que marcou Em contato no CRM (manual, por vaga).';

create index if not exists candidaturas_contato_humano_por_idx
  on public.candidaturas (contato_humano_por)
  where contato_humano_por is not null;
