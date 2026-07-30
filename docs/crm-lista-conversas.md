# Lista Conversas — regras de UI (fixas)

**Arquivo de código:** `src/lib/crm/listaConversasUi.ts`  
**Componente:** `ListaConversaItem` em `WhatsappCrmClient.tsx`

Não reintroduzir comportamentos removidos (ex.: pill `Ana`, tag `handoff`, status detalhado na lista).

## Layout de cada card

1. **Estrela de favorito** — sempre à **esquerda**, antes do nome (primeiro item da linha do nome).
2. **Nome** — ao lado da estrela.
3. **Pills** — ordem fixa:
   - **Status** — sempre etapa-mãe (`ETAPA_LABELS`: inscrito, abordado, qualificado, encaminhado, contratado). **Nunca** status detalhado (`reprovado (sem resposta)`, `cliente recusou`, etc.).
   - **Interlocutor humano** — só se `candidaturas.contato_humano_por` preenchido (pill com primeiro nome de quem marcou **Em contato**). Por vaga.
4. **Horário** — canto direito da linha.

## O que NÃO mostrar na lista

| Removido | Motivo |
|----------|--------|
| Pill **Ana** | Ana é o default; todas as conversas são Ana salvo ação humana explícita. |
| Tag **handoff** | Removido — não usar pill handoff na lista. |

## Ordenação padrão

**Mais recente** = data da **última mensagem** (`ultima_data`), igual ao horário no canto direito do card.  
Não usar `candidatura_atualizado_em` (atualização de status no funil) — senão a lista fica “desordenada” em relação à data exibida.

## Cor de fundo do card

Só **duas** cores:

| Cor | Quando |
|-----|--------|
| **Branco** | Conversa já aberta neste navegador, ou aberta agora |
| **Verde claro** | Ainda **não abriu** e candidato mandou a última msg (**sem resposta nossa**) |

Ao clicar e abrir → vira **branco** (salvo em `localStorage`).

Sem amarelo de favorito, seleção ou “pendente” no fundo. Selecionado = barra lateral rosa, fundo igual (branco ou verde).

## Chat — balões outbound (Ana)

Candidato vê tudo como **Ana**. No CRM:

| Tipo | Balão | Nome | Ícone no rodapé |
|------|-------|------|-----------------|
| Bot / template | Verde `#d9fdd3` | Ana | Robô |
| Humano (`manual_crm`) | **Mesmo verde** | Ana | Pessoa |

Única diferença visual: ícone robô vs pessoa. **Nunca** “Você”, azul ou roxo.

## Bolinha no avatar

- **Verde** — janela WhatsApp 24h aberta (`ultima_inbound_at` &lt; 24h).
- **Cinza** — janela fechada.

## Status detalhado

Usar `candidaturas.status` detalhado **no backend, filtros avançados e header expandido se necessário** — **não** na pill da lista lateral.
