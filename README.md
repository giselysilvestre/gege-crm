# Gegê CRM

CRM de conversas WhatsApp para recrutamento: lista de candidatos, chat, funil, favoritos, multiselect e ações em lote.

**Produção:** https://gege-crm.vercel.app/whatsapp (após deploy)

## Stack

- Next.js 15 (App Router) + TypeScript
- Supabase (mesmo projeto do Gegê — candidatos, conversas, vagas)
- Kapso (mesmo número WhatsApp do bot Ana)

## Desenvolvimento local

```powershell
cd gege-crm
copy .env.example .env.local
# Preencha Supabase + Kapso + Anthropic (ver .env.example)
npm install
npm run dev
```

Abra http://localhost:3010/whatsapp

### Copiar Kapso do bot (opcional)

Se você ainda tem o repo `gege` no mesmo PC:

```powershell
node scripts/sync-kapso-env.mjs
```

## Deploy

Ver [docs/deploy.md](./docs/deploy.md).

## Arquitetura

Ver [docs/arquitetura.md](./docs/arquitetura.md).

## Repositórios relacionados

| Repo | O quê |
|------|--------|
| **gege-crm** (este) | Interface CRM + APIs `/api/whatsapp/*` |
| [gege](https://github.com/giselysilvestre/gege) | Frontend gege.ia.br, bot, processador de CV |

Supabase e Kapso são **compartilhados** — repo separado isola código e acessos Git, não o banco.
