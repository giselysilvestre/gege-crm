alter table public.whatsapp_sessoes
  add column if not exists crm_visualizado_em timestamptz;

comment on column public.whatsapp_sessoes.crm_visualizado_em is
  'Última vez que alguém abriu a conversa no CRM (marca visualizado).';
