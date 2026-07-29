# Deploy — Gegê CRM

## Vercel (recomendado)

1. Repo: **https://github.com/giselysilvestre/gege-crm**
2. **Root Directory:** `.` (raiz do repo — não é subpasta)
3. Framework: Next.js
4. **Environment Variables** (Production):

| Variável | Onde pegar |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → service_role (segredo) |
| `KAPSO_API_KEY` | Mesmo valor do `whatsapp-bot` |
| `KAPSO_PHONE_NUMBER_ID` | Mesmo valor do `whatsapp-bot` |
| `ANTHROPIC_API_KEY` | Resumo da Gê (opcional) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` |

5. Deploy → acesse **`/whatsapp`** (redireciona para login se não estiver autenticado)

### Supabase Auth (login)

No Supabase → **Authentication → URL Configuration**, inclua em **Redirect URLs**:

- `https://gege-crm.vercel.app/auth/callback`
- `http://localhost:3010/auth/callback`

O CRM usa a **mesma conta** do gege.ia.br (email + senha Supabase).

### CLI

```powershell
cd gege-crm
npx vercel login
npx vercel --prod
```

Copiar env vars do `.env.local`:

```powershell
node scripts/push-vercel-env.mjs
npx vercel --prod
```

## Antes de subir

```powershell
npm run build
```

Tem que terminar sem erro.

## Domínio customizado (opcional)

Vercel → Project → Settings → Domains → ex.: `crm.gege.ia.br`

## Nota sobre o projeto antigo

O CRM foi migrado de `gege/whatsapp-analytics`. O projeto Vercel `whatsapp-analytics` pode ser removido depois de validar o `gege-crm`.
