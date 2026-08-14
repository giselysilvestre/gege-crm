-- Status "contratado" legado/errado em candidaturas ainda no funil de abordagem.
-- Mantém só quem está de fato encerrado como contratado (ex.: Luara Barbosa).

UPDATE candidaturas c
SET
  status = CASE
    WHEN ws.ultima_inbound_at IS NOT NULL THEN 'abordado_em_conversa'::status_candidatura
    WHEN ws.ultima_outbound_at IS NOT NULL THEN 'abordado_sem_resposta'::status_candidatura
    ELSE 'inscrito_aguardando_disparo'::status_candidatura
  END,
  atualizado_em = now()
FROM whatsapp_sessoes ws
WHERE ws.candidatura_id = c.id
  AND ws.status = 'ativo'
  AND c.arquivada = false
  AND c.status::text = 'contratado'
  AND coalesce(ws.etapa_atual, '') <> 'encerramento'
  AND coalesce(ws.etapa_funil, '') <> 'contratado';

UPDATE whatsapp_sessoes ws
SET
  etapa_funil = CASE
    WHEN ws.ultima_inbound_at IS NOT NULL THEN 'abordado'
    WHEN ws.ultima_outbound_at IS NOT NULL THEN 'abordado'
    ELSE 'inscrito'
  END,
  atualizado_em = now()
FROM candidaturas c
WHERE c.id = ws.candidatura_id
  AND ws.status = 'ativo'
  AND c.arquivada = false
  AND c.status::text IN (
    'abordado_em_conversa',
    'abordado_sem_resposta',
    'inscrito_aguardando_disparo'
  )
  AND c.atualizado_em >= now() - interval '5 minutes';

UPDATE candidaturas c
SET status = 'inscrito_aguardando_disparo'::status_candidatura, atualizado_em = now()
WHERE c.arquivada = false
  AND c.status::text = 'contratado'
  AND NOT EXISTS (
    SELECT 1 FROM whatsapp_sessoes ws
    WHERE ws.candidatura_id = c.id AND ws.status = 'ativo'
  );
