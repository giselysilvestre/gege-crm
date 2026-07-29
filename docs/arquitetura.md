# Arquitetura — Gegê CRM

## Papel no ecossistema Gegê

```
Candidato ←WhatsApp→ Kapso ←→ whatsapp-bot (Ana)
                              ↓
                         Supabase (PostgreSQL)
                              ↑
                         gege-crm (este repo)
                              ↑
                         Recrutador (browser)
```

- **gege-crm** — painel para ler conversas, mudar etapa, favoritar, copiar contatos, enviar mensagens manuais.
- **whatsapp-bot** — respostas automáticas da Ana (repo `gege`, pasta `whatsapp-bot/`).
- **frontend** — gege.ia.br, vagas e candidatos (repo `gege`, pasta `frontend/`).
- **Supabase** — fonte única de verdade (candidatos, sessões, mensagens, vagas).
- **Kapso** — API WhatsApp; CRM e bot usam as **mesmas credenciais**.

Repo separado **não** duplica banco nem número — só isola **código e permissões Git**.

## Rotas principais

| Rota | Função |
|------|--------|
| `/whatsapp` | Conversas (CRM principal) |
| `/visao-geral` | Dashboard métricas |
| `/pipeline` | Funil |
| `/api/whatsapp/crm` | Dados da lista + chat |
| `/api/whatsapp/acoes` | Favoritar, etapa, vaga, mensagem, etc. |

## Variáveis de ambiente

Ver `.env.example`. Service role **só no servidor** (rotas `app/api/*`).

## Desenvolvimento

Porta local: **3010** (`npm run dev`).

Cache do CRM no browser usa `localStorage` com prefixo `gege-crm-*`.

## Docs relacionados

- [deploy.md](./deploy.md)
- [classificacao-geografica.md](./classificacao-geografica.md) — viabilidade geográfica (feature compartilhada com bot)
