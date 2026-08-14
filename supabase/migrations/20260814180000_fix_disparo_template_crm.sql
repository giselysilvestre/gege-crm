-- Abordagem enviada pelo CRM deixava etapa_atual em "abertura".
-- A Ana só manda os detalhes da vaga quando a sessão está em disparo_template.

UPDATE whatsapp_sessoes s
SET
  etapa_atual = 'disparo_template',
  tipo_fluxo = 'candidatura',
  atualizado_em = now()
WHERE s.status = 'ativo'
  AND s.candidatura_id IS NOT NULL
  AND coalesce(s.etapa_atual, 'abertura') = 'abertura'
  AND EXISTS (
    SELECT 1
    FROM whatsapp_eventos e
    WHERE e.sessao_id = s.id
      AND e.direcao = 'outbound'
      AND (
        e.tipo_mensagem = 'disparo_inicial'
        OR e.conteudo LIKE '%[template:gege_abordagem_vaga]%'
        OR e.conteudo LIKE '%[template:abordagem_candidatura_gege]%'
      )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM whatsapp_eventos e2
    WHERE e2.sessao_id = s.id
      AND e2.direcao = 'outbound'
      AND (
        lower(e2.conteudo) LIKE '%tem interesse pela vaga%'
        OR lower(e2.conteudo) LIKE '%que otimo!%'
      )
  );
