-- Candidaturas marcadas como abordado* sem nenhuma msg na sessão WhatsApp → inscrito.
UPDATE candidaturas c
SET
  status = 'inscrito_aguardando_disparo',
  atualizado_em = now()
FROM whatsapp_sessoes ws
WHERE ws.candidatura_id = c.id
  AND c.status::text LIKE 'abordado_%'
  AND ws.ultima_inbound_at IS NULL
  AND ws.ultima_outbound_at IS NULL
  AND ws.primeira_resposta_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM whatsapp_eventos e WHERE e.sessao_id = ws.id
  );

UPDATE whatsapp_sessoes ws
SET
  etapa_funil = 'inscrito',
  atualizado_em = now()
FROM candidaturas c
WHERE ws.candidatura_id = c.id
  AND c.status = 'inscrito_aguardando_disparo'
  AND ws.etapa_funil IS DISTINCT FROM 'inscrito'
  AND ws.ultima_inbound_at IS NULL
  AND ws.ultima_outbound_at IS NULL
  AND ws.primeira_resposta_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM whatsapp_eventos e WHERE e.sessao_id = ws.id
  );
