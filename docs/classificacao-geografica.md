# Classificação geográfica de candidatos (Gegê)

Documento de referência para o time e para ajuste do prompt da Ana (`whatsapp-bot/ana-prompt.js`).

**Atualizado:** jun/2026 — implementado na conversa WhatsApp 4/5 (La Panata e demais vagas abertas).

---

## Para que serve

Antes de investir tempo na entrevista pelo WhatsApp, queremos saber se **faz sentido** o candidato morar perto da loja da vaga.

Em vez de calcular km/minutos com Google Maps (API paga, e poucos candidatos têm CEP), usamos **regras de região**: cidade + bairro → região macro → comparação com a região da loja.

---

## Três camadas de dados (não confundir)

| Camada | Onde fica | O que guarda | Exemplo |
|--------|-----------|--------------|---------|
| **Endereço bruto** | `candidatos.cidade`, `candidatos.bairro`, `candidatos.cep` | O que veio do CV ou da conversa | Rio de Janeiro / Rocinha |
| **Região do candidato** | `candidatos.regiao` | Macro-região calculada pelo sistema | `zona_sul` |
| **Viabilidade para a vaga** | `candidaturas.viabilidade_geografica` | Perto/limite/longe **em relação à loja desta vaga** | `perto` |

A **região** é do candidato (onde mora). A **viabilidade** é da candidatura (esta vaga específica × esta loja).

---

## De onde vem a localização

| Fonte | Campo `localizacao_fonte` | Regra |
|-------|---------------------------|-------|
| **Currículo (CV)** | `cv` | Cidade, bairro e CEP só entram se estiverem **explícitos** no PDF — a IA não inventa |
| **Conversa WhatsApp** | `whatsapp_conversa` | Só quando o candidato diz **onde mora** (ex.: "moro em", "moro no bairro") — não usar local de trabalho |
| Manual / futuro | `manual` | Reservado |

Campo extra: `localizacao_trecho` — frase curta da conversa que comprovou o endereço (ex.: "moro na estrada da Gávea, rocinha").

**Prioridade:** se a conversa trouxer bairro que o CV não tinha, o WhatsApp **complementa** o perfil. A fonte passa a `whatsapp_conversa` quando há trecho comprovando.

---

## Passo 1 — Bairro/cidade → região (`candidatos.regiao`)

Código: `whatsapp-bot/geo-classificador.js` + `whatsapp-bot/geo/regioes-rj.js` + tabela `geo_bairros`.

Ordem de resolução:

1. **Tabela `geo_bairros`** (bairro + cidade + UF no banco)
2. **Lista estática `BAIRROS_RJ`** (~76 bairros do Rio mapeados)
3. **Match parcial** em bairros compostos (ex.: "Tanque/Jacarepaguá" → Tanque)
4. **Cidade inteira** quando não precisa de bairro (`CIDADE_PARA_REGIAO` — ex.: Nova Iguaçu → `baixada`)
5. Se só "Rio de Janeiro" **sem bairro** → `indefinido`
6. Cidade/bairro desconhecidos → `indefinido`

### Regiões possíveis

| Valor no banco | Significado |
|----------------|-------------|
| `zona_sul` | Copacabana, Ipanema, Rocinha, Gávea, Botafogo… |
| `centro` | Centro, Lapa, Catumbi, São Cristóvão, Rio Comprido… |
| `zona_norte` | Tijuca, Méier, Madureira, Pavuna, Ilha do Governador… |
| `zona_oeste` | Jacarepaguá, Campo Grande, Realengo, Barra, Recreio… |
| `zona_leste` | Irajá, Penha Circular, Cordovil… |
| `baixada` | Nova Iguaçu, Duque de Caxias, Belford Roxo, São Gonçalo, Meriti… |
| `niteroi` | Niterói |
| `indefinido` | Dado insuficiente ou bairro não cadastrado |

### Exemplos práticos (La Panata = loja em Copacabana)

| Candidato mora em | Região |
|-------------------|--------|
| Rocinha | `zona_sul` |
| Gávea | `zona_sul` |
| Catumbi | `centro` |
| Nova Iguaçu | `baixada` |
| Pavuna | `zona_norte` |
| Só "Rio de Janeiro" (sem bairro) | `indefinido` |

---

## Passo 2 — Região candidato × região loja → viabilidade

Código: `classificarViabilidade()` em `geo-classificador.js`.

Hoje existe **matriz completa só para loja na Zona Sul** (`VIABILIDADE_LOJA_ZONA_SUL`). La Panata Copacabana usa essa matriz (`cliente_unidades.regiao = zona_sul`).

### Tags finais (`candidaturas.viabilidade_geografica`)

| Tag | Rótulo na tela | Significado (loja Zona Sul) |
|-----|----------------|----------------------------|
| `perto` | Perto | Candidato na Zona Sul |
| `limite` | Limite | Centro ou Niterói — vale revisar |
| `longe` | Longe | Zona Norte, Oeste, Leste ou Baixada |
| `indefinido` | Indefinido | Não sabemos bairro/região com segurança |

### Matriz (loja em **Zona Sul**, ex. Copacabana)

| Região do candidato | Viabilidade |
|---------------------|-------------|
| `zona_sul` | **perto** |
| `centro` | **limite** |
| `niteroi` | **limite** |
| `zona_norte` | **longe** |
| `zona_oeste` | **longe** |
| `zona_leste` | **longe** |
| `baixada` | **longe** |
| `indefinido` | **indefinido** |

Jobs que rodam isso:

- `node job-classificar-geografia.js --vaga=<uuid>` — classifica todos da vaga
- `node job-extrair-localizacao-conversas.js --vaga=<uuid>` — lê WhatsApp, atualiza bairro/cidade, depois reclassifica

---

## Limitações importantes

1. **Só Rio de Janeiro está mapeado.** Vagas em São Paulo (Tapí Pinheiros, Gegê Biscoitos) ainda ficam em massa como `indefinido` — falta cadastro de bairros SP.
2. **Não usa Google Maps** na classificação atual — é regra de região, não minutos de transporte.
3. **CEP** existe no banco mas **não entra** na classificação por região (só ~40% dos candidatos têm CEP no CV).
4. Se a loja não tiver `regiao` cadastrada, o job assume `zona_sul` por padrão (cuidado em lojas fora do RJ).

---

## O que está errado no `ana-prompt.js` hoje

O prompt da Ana ainda descreve um fluxo **antigo**, que **não bate** com o código nem com o banco:

| Prompt atual (errado) | Realidade no sistema |
|----------------------|----------------------|
| Etapa `confirma_deslocamento` | Código usa `confirma_endereco` (`index.js`) |
| Decide distância por `{{tempo_deslocamento_min}}` (Google, transporte público) | `index.js` **não preenche** esse placeholder — fica literal no prompt |
| Regra: > 60 min → encerra; ≤ 60 min → continua | Classificação é por tag `perto` / `limite` / `longe` / `indefinido` |
| Não menciona `bairro`, `regiao`, `viabilidade_geografica` | Esses campos existem e são a base da triagem |
| Pede tempo de deslocamento quando CEP vazio | Deveria pedir **bairro onde mora** (e salvar via backend) |

Ou seja: a Ana está instruída a usar minutos de Google Maps, mas o produto passou a usar **região + viabilidade**.

---

## Como a Ana **deveria** usar isso na conversa (proposta)

### Dados para injetar no prompt

```
Bairro: {{bairro}}
Cidade: {{cidade}}
Região (calculada): {{regiao}}
Viabilidade para esta vaga: {{viabilidade_geografica}}  (perto | limite | longe | indefinido)
Fonte da localização: {{localizacao_fonte}}  (cv | whatsapp_conversa)
```

### Etapa após interesse na vaga (`confirma_endereco` — alinhar nome no prompt)

| Viabilidade | Comportamento sugerido |
|-------------|------------------------|
| **perto** | Confirma de forma leve ("vi que você mora numa região perto da loja, tudo bem pra você?") → mini entrevista |
| **limite** | Explica que fica numa região intermediária, pergunta se consegue ir até lá com frequência → mini entrevista ou encerramento se disser que não |
| **longe** | Encerramento por distância — **sem** mini entrevista longa |
| **indefinido** | Perguntar: "em qual bairro você mora?" ou confirmar bairro do CV — resposta alimenta extração e reclassificação |

### O que a Ana **não** deve fazer

- Não inventar minutos de deslocamento se o backend não calculou.
- Não usar endereço da **loja onde trabalhou** como se fosse onde **mora**.
- Não dizer "registrei" / "salvei" — o backend persiste.
- Não decidir sozinha reprovar por score; reprovação por distância pode ser automática quando `longe`.

### Perguntas úteis quando `indefinido`

- "em qual bairro você mora hoje?"
- "você mora aqui no Rio mesmo? qual região?"
- (SP) "qual bairro ou região de São Paulo?"

Respostas com "moro em…" são processadas pelo job `job-extrair-localizacao-conversas.js`.

---

## Onde ver no painel

- CRM WhatsApp / lista de candidatos: coluna ou filtro de **viabilidade geográfica** (Perto, Limite, Longe, Indefinido).
- Perfil do candidato: `cidade`, `bairro`, `regiao`, `localizacao_fonte`, `localizacao_trecho`.

---

## Próximo passo técnico (quando for corrigir a Ana)

1. Alinhar nome da etapa: `confirma_endereco` em todo lugar (ou renomear no banco para `confirma_deslocamento`).
2. Remover ou tornar opcional o bloco de `tempo_deslocamento_min` / Google Maps no prompt.
3. Injetar no `index.js`: `bairro`, `regiao`, `viabilidade_geografica`, `localizacao_fonte`.
4. Reescrever a etapa `confirma_deslocamento` usando a tabela de viabilidade acima.
5. (Futuro) Cadastrar bairros de **São Paulo** para Tapí e Gegê.

---

## Referência rápida de arquivos

| Arquivo | Função |
|---------|--------|
| `whatsapp-bot/geo/regioes-rj.js` | Lista de bairros RJ e matriz Zona Sul |
| `whatsapp-bot/geo-classificador.js` | Resolve região e viabilidade |
| `whatsapp-bot/job-classificar-geografia.js` | Job em lote por vaga |
| `whatsapp-bot/job-extrair-localizacao-conversas.js` | Extrai "moro em…" do WhatsApp |
| `supabase/migrations/20260609120000_geo_bairros_classificacao.sql` | Schema região + viabilidade |
| `supabase/migrations/20260609220000_candidatos_localizacao_whatsapp.sql` | Schema fonte + trecho |
