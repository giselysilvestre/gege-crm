-- Corrige reprovações indevidas na vaga Atendente Tapí Botafogo (lote multiselect).
-- 1) inscrito_reprovado sem nenhuma msg WhatsApp (dado errado de 10/ago)
-- 2) abordado_negativa indevido (Ana interpretou "Não" em pergunta operacional como recusa)

UPDATE candidaturas c
SET status = 'inscrito_aguardando_disparo'::status_candidatura,
    motivo_reprovacao = NULL,
    atualizado_em = now()
FROM whatsapp_sessoes ws
WHERE ws.candidatura_id = c.id
  AND ws.status = 'ativo'
  AND c.arquivada = false
  AND c.status::text = 'inscrito_reprovado'
  AND NOT EXISTS (
    SELECT 1 FROM whatsapp_eventos e WHERE e.sessao_id = ws.id
  );

UPDATE candidaturas c
SET status = 'abordado_avancar'::status_candidatura,
    motivo_reprovacao = NULL,
    atualizado_em = now()
WHERE c.id IN (
  SELECT c2.id
  FROM candidaturas c2
  JOIN candidatos cand ON cand.id = c2.candidato_id
  JOIN whatsapp_sessoes ws ON ws.candidatura_id = c2.id AND ws.status = 'ativo'
  WHERE c2.arquivada = false
    AND c2.status::text = 'abordado_negativa'
    AND cand.nome IN (
      'Michel Alves dos Santos',
      'Raquel da Silva Lima',
      'Raquel Louza de Lima'
    )
    AND EXISTS (
      SELECT 1 FROM whatsapp_eventos e
      WHERE e.sessao_id = ws.id
        AND e.direcao = 'outbound'
        AND e.conteudo ILIKE '%passar seu perfil%'
    )
);

UPDATE candidaturas c
SET status = 'abordado_em_conversa'::status_candidatura,
    motivo_reprovacao = NULL,
    atualizado_em = now()
FROM candidaturas c2
JOIN candidatos cand ON cand.id = c2.candidato_id
WHERE c.id = c2.id
  AND c2.arquivada = false
  AND c2.status::text = 'abordado_negativa'
  AND cand.nome = 'Paulo Alexandre';

UPDATE whatsapp_sessoes ws
SET etapa_funil = CASE
      WHEN c.status::text LIKE 'inscrito%' THEN 'inscrito'
      WHEN c.status::text LIKE 'abordado%' THEN 'abordado'
      WHEN c.status::text LIKE 'qualificado%' THEN 'qualificado'
      ELSE ws.etapa_funil
    END,
    atualizado_em = now()
FROM candidaturas c
WHERE c.id = ws.candidatura_id
  AND ws.status = 'ativo'
  AND c.atualizado_em >= now() - interval '10 minutes';
