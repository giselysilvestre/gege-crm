# Funil de status — Gegê CRM

Fonte da verdade: **`candidaturas.status`** (status detalhado).  
Kanban/filtro: **etapa-mãe** (prefixo do status).

## Etapas-mãe (simples)

1. Inscrito  
2. Abordado  
3. Qualificado  
4. Encaminhado  
5. Contratado  

## Status detalhado + critério

| Status | Critério |
|--------|----------|
| `inscrito_aguardando_disparo` | Entrou na vaga, sem disparo |
| `inscrito_avancar` | Score CV ≥ corte |
| `inscrito_reprovado` | Score CV < corte |
| `inscrito_falha` | Sem telefone / número inválido |
| `abordado_sem_resposta` | Disparo enviado, sem resposta (janela FUP) |
| `abordado_em_conversa` | Candidato respondeu |
| `abordado_avancar` | Disse sim (interesse + proximidade) |
| `abordado_reprovado_sem_resposta` | Esgotou FUP (padrão: 3 dias) |
| `abordado_negativa` | Recusou ativamente |
| `qualificado_avancar` | Interessado + CV ≥ corte + entrevista ≥ corte (sem nota passa se corte = 0) |
| `qualificado_reprovado_entrevista` | Entrevista < corte ou eliminatório |
| `encaminhado_aguardando` | Humano enviou dossiê |
| `encaminhado_avancar` | Cliente aprovou (humano) |
| `encaminhado_reprovado` | Cliente recusou (humano) |
| `contratado` | Contratação confirmada (humano) |

**Removido:** `qualificado_pendente_entrevista` (interessado já pode virar qualificado).

## Cortes (configuráveis)

Tabela `crm_funil_config` (id=1):

- `score_cv_min` (padrão **0**)
- `score_entrevista_min` (padrão **0**)
- `fup_abordagem_horas`, `fup_interesse_antes_24h`, `fup_silencio_dias` (preparados p/ painel)

API: `GET/PUT /api/whatsapp/funil-config`  
Mudar cortes com `reclassificar: true` (padrão) reaplica nas candidaturas elegíveis.

## Quem grava

| Evento | Onde |
|--------|------|
| Disparo | `whatsapp-bot/disparo-tapi.js` → `abordado_sem_resposta` |
| Resposta / interesse / recusa | `whatsapp-bot/index.js` via `lib/classificar-candidatura.js` |
| Kanban / avançar / reprovar | `gege-crm` → `acoes/route.ts` + `classificarCandidatura.ts` |
| Mover vaga | Nova candidatura em `inscrito_aguardando_disparo`; sessão `etapa_funil=inscrito` |

## Espelho na sessão

`whatsapp_sessoes.etapa_funil` guarda só a **etapa-mãe** (compat). UI lê o detalhado de `candidaturas.status`.
