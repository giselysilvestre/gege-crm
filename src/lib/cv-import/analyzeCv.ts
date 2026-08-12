import Anthropic from "@anthropic-ai/sdk";

/** Prompt oficial Gegê — mesma versão do gege-cv-processor (prompt-cv-gege.js). */
export const CV_PROMPT_VERSION = "gege-compact-v2";
const CV_ANALYSIS_MODEL =
  process.env.CLAUDE_MODEL || process.env.CV_ANALYSIS_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const CV_ANALYSIS_MAX_TOKENS = Number(process.env.CV_ANALYSIS_MAX_TOKENS) || 1800;
const CV_MAX_INPUT_CHARS = Number(process.env.CV_MAX_INPUT_CHARS) || 10000;
const CV_PROMPT_VARIANT = String(process.env.CV_PROMPT_VARIANT || "compact").toLowerCase();
const CV_USE_PROMPT_CACHE = process.env.CV_USE_PROMPT_CACHE !== "false";

export type CvExtracted = {
  candidato: Record<string, unknown>;
  experiencias: Record<string, unknown>[];
  analise: Record<string, unknown>;
};

function hojePtBr() {
  return new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function normalizeCvText(cvText: string, maxChars?: number): string {
  const limit = maxChars ?? CV_MAX_INPUT_CHARS;
  const raw = String(cvText || "");
  if (limit > 0) return raw.slice(0, limit);
  return raw;
}

function buildCvAnalysisInstructionsFull(hoje: string) {
  return `A data de hoje é ${hoje}. Use como referência absoluta para calcular durações, identificar empregos atuais e avaliar se datas são passadas ou futuras.

Você é recrutador sênior em food service. Retorne APENAS JSON válido, sem markdown.

{
  "candidato": {
    "nome": "Capitalizar cada palavra exceto preposições (da, de, do, dos, das, e)",
    "telefone": "Formato +55 DD 9XXXX-XXXX ou null se incompleto/sem DDD",
    "email": "minúsculo sem espaços ou null",
    "cargo_principal": "cargo do último emprego ou null",
    "cidade": "apenas se explícito ou null",
    "bairro": "apenas se explícito ou null",
    "cep": "formato 00000-000, apenas se explícito, não inferir, ou null",
    "escolaridade": "nível mais alto concluído ou em andamento ou null",
    "genero": "Masculino | Feminino | Não informado (inferir pelo primeiro nome)",
    "data_nascimento": "YYYY-MM-DD se explícito, não inferir, ou null",
    "situacao_emprego": "Empregado se: último emprego sem data de fim OU texto contém 'atual', 'atualmente', 'presente', 'até o momento'. Desempregado se último emprego tem data de fim anterior a hoje. null se não inferível."
  },
  "experiencias": [
    {
      "empresa": "nome da empresa",
      "cargo": "cargo exercido ou null",
      "setor": "alimentacao (restaurantes, catering, food service industrial, lanchonetes) | cozinha (função específica de preparo de alimentos) | atendimento (atendimento ao cliente DENTRO de food service — NÃO contar telemarketing, call center, banco, varejo geral) | lideranca (gestão de pessoas em food service) | outro (tudo fora de food service)",
      "data_inicio": "YYYY-MM-DD ou null",
      "data_fim": "YYYY-MM-DD ou null se emprego atual",
      "meses": "calcular pelas datas usando hoje como referência para empregos sem data_fim. Estimar pelo texto se datas ausentes.",
      "eh_lideranca": "true só se cargo envolve gestão direta de pessoas com evidência no texto (supervisor, gerente, coordenador com equipe descrita). false caso contrário.",
      "crescimento_interno": "true só se houve mudança de cargo com escopo CRESCENTE na mesma empresa — títulos diferentes e progressão clara. NÃO marcar true para contratos distintos na mesma empresa sem progressão de cargo."
    }
  ],
  "analise": {
    "perfil_resumo": "cargo predominante + tempo total de experiência relevante em food service",
    "pontos_fortes": "Texto corrido em linguagem natural, sem labels ou categorias em maiúsculo. Liste apenas evidências rastreáveis no CV, priorizando: permanência longa em food service (>18 meses = relevante, >36 meses = forte), empresa reconhecida do setor (Novotel, Accor, Outback, Coco Bambu, Madero, Fogo de Chão, Spoleto, Starbucks, Eataly, Fasano, McDonald's, Bob's, Subway, Sodexo, Compass), responsabilidades específicas descritas com verbos concretos, conquistas mensuráveis, progressão real de cargo, formação técnica com instituição identificável, iniciativa comprovada. NÃO aceitar autodeclaração, listas de habilidades ou objetivos profissionais. null se nenhuma evidência real.",
    "red_flags": "Texto corrido em linguagem natural, sem labels ou categorias em maiúsculo. Liste apenas fatos concretos com trecho literal entre aspas quando disponível, priorizando por severidade: linguagem de conflito ou rescisão negociada (ex: 'fiz acordo', 'pedi pra sair pq'), inconsistência factual de datas, tenure médio abaixo de 6 meses em 2 ou mais empregos consecutivos, gap não explicado acima de 12 meses, CV sem nenhuma data, erros graves de português, mistura de setores sem fio condutor, zero experiência em food service. null se nenhum identificado.",
    "fit_food_service": "Alto: experiência direta em food service com permanência acima de 12 meses. Médio: formação técnica específica em gastronomia com instituição identificável, OU experiência em atendimento dentro de food service. Baixo: sem experiência ou formação relevante para o setor.",
    "analise_completa": "[Nome] é [cargo predominante] com [tempo de experiência relevante].

O que chama atenção positivamente: [escolha O ÚNICO fato mais relevante dos pontos_fortes — não repita todos].
O que preocupa: [escolha O ÚNICO fato mais grave dos red_flags — não repita todos].
Recomendação: Chamar para triagem | Triagem com ressalva | Não priorizar — [fator decisivo em 1 linha direta, sem repetir o que já foi dito acima].",
    "score_ia": "0-100 sem ancoragem em valores anteriores. Critérios: experiência direta e relevante em food service com permanência (40%), estabilidade dos vínculos (30%), evidências comportamentais positivas rastreáveis no texto (30%). Escala: 0-20 sem relevância, 21-40 baixa, 41-60 média, 61-80 boa aderência, 81-100 candidato forte.",
    "ultima_experiencia": "Empresa — cargo, duração. Ex: Gastroservice — Cozinheira, 8 anos e 7 meses"
  }
}

CV:`;
}

function buildCvAnalysisInstructionsCompact(hoje: string) {
  return `Hoje: ${hoje}. Use como referência para durações, emprego atual e datas passadas/futuras.
Recrutador sênior em food service. Retorne APENAS JSON válido, sem markdown.

REGRAS (obrigatórias):
- candidato: só explícito; nome capitalizado (preposições da/de/do/dos/das/e minúsculas); telefone +55 DD 9XXXX-XXXX ou null; email minúsculo ou null; cep/cidade/bairro/data_nascimento não inferir; genero inferir pelo primeiro nome ou Não informado
- situacao_emprego: Empregado se último emprego sem fim ou texto "atual/atualmente/presente/até o momento"; Desempregado se fim anterior a hoje; senão null
- setor: alimentacao (restaurante/catering/lanchonete) | cozinha (preparo) | atendimento (cliente DENTRO de FS — NÃO telemarketing/call center/banco/varejo) | lideranca (gestão em FS) | outro
- meses: calcular pelas datas usando hoje se emprego atual; estimar só se datas ausentes
- eh_lideranca: true só com gestão de pessoas com evidência (supervisor/gerente/coordenador + equipe); senão false
- crescimento_interno: true só progressão de cargo com escopo crescente na mesma empresa (títulos diferentes); false para contratos distintos sem progressão
- perfil_resumo: cargo predominante + tempo total relevante em food service
- pontos_fortes: texto corrido, sem labels em maiúsculo; só evidência rastreável; priorizar permanência FS >18m/>36m, marcas do setor (Outback, Madero, McDonald's, Starbucks, Sodexo, Accor, Coco Bambu…), verbos/conquistas mensuráveis, progressão de cargo, formação com instituição, iniciativa comprovada; NÃO soft skills autodeclaradas, listas de habilidades ou objetivo; null se vazio
- red_flags: texto corrido, sem labels em maiúsculo; fatos concretos + trecho literal entre aspas; severidade: conflito/rescisão (ex. "fiz acordo"), datas inconsistentes, 2+ vínculos <6m consecutivos, gap >12m, CV sem datas, PT grave, mistura de setores sem fio, zero FS; null se nenhum
- fit_food_service: Alto = FS direto >12m; Médio = formação gastronomia identificável OU atendimento FS; Baixo = resto
- analise_completa: "[Nome] é [cargo] com [tempo].\\nO que chama atenção positivamente: [1 fato, o mais relevante].\\nO que preocupa: [1 fato, o mais grave].\\nRecomendação: Chamar para triagem | Triagem com ressalva | Não priorizar — [motivo em 1 linha, sem repetir acima]"
- score_ia: 0-100 sem ancoragem; 40% exp FS+permanência, 30% estabilidade, 30% evidências no texto; escala 0-20/21-40/41-60/61-80/81-100
- ATENDENTE (vaga operacional de salão/balcão): bar baixo — não exige formação nem histórico brilhante. Piso 60-65 se não houver instabilidade. Penalizar forte (≤40) só com 2+ vínculos consecutivos <4 meses ou conflito/rescisão negativa explícita. Não penalizar CV sem datas, experiência fora de FS ou falta de marcas premium
- ultima_experiencia: "Empresa — cargo, duração"

{
  "candidato": { "nome", "telefone", "email", "cargo_principal", "cidade", "bairro", "cep", "escolaridade", "genero", "data_nascimento", "situacao_emprego" },
  "experiencias": [{ "empresa", "cargo", "setor", "data_inicio", "data_fim", "meses", "eh_lideranca", "crescimento_interno" }],
  "analise": { "perfil_resumo", "pontos_fortes", "red_flags", "fit_food_service", "analise_completa", "score_ia", "ultima_experiencia" }
}

EXEMPLO DE SAÍDA (fictício — imite estrutura e rigor; substitua pelos dados reais do CV):
{
  "candidato": {
    "nome": "Maria da Silva",
    "telefone": "+55 21 98765-4321",
    "email": "maria.silva@email.com",
    "cargo_principal": "Supervisora de Salão",
    "cidade": "Rio de Janeiro",
    "bairro": null,
    "cep": null,
    "escolaridade": "Ensino Médio completo",
    "genero": "Feminino",
    "data_nascimento": null,
    "situacao_emprego": "Empregado"
  },
  "experiencias": [
    {
      "empresa": "Outback Steakhouse",
      "cargo": "Supervisora de Salão",
      "setor": "lideranca",
      "data_inicio": "2021-03-01",
      "data_fim": null,
      "meses": 38,
      "eh_lideranca": true,
      "crescimento_interno": true
    },
    {
      "empresa": "McDonald's",
      "cargo": "Atendente",
      "setor": "atendimento",
      "data_inicio": "2019-01-01",
      "data_fim": "2021-02-28",
      "meses": 26,
      "eh_lideranca": false,
      "crescimento_interno": false
    }
  ],
  "analise": {
    "perfil_resumo": "Supervisora de salão com cerca de 5 anos em food service",
    "pontos_fortes": "Permanência de 38 meses na Outback como supervisora, com progressão interna a partir do McDonald's.",
    "red_flags": null,
    "fit_food_service": "Alto",
    "analise_completa": "Maria da Silva é supervisora de salão com cerca de 5 anos em food service.\\nO que chama atenção positivamente: progressão interna Outback após 26 meses no McDonald's.\\nO que preocupa: nenhum fato grave identificado.\\nRecomendação: Chamar para triagem — experiência direta e estável em marcas reconhecidas.",
    "score_ia": 78,
    "ultima_experiencia": "Outback Steakhouse — Supervisora de Salão, 3 anos e 2 meses"
  }
}

CV:`;
}

function buildCvAnalysisInstructions() {
  const hoje = hojePtBr();
  if (CV_PROMPT_VARIANT === "full") return buildCvAnalysisInstructionsFull(hoje);
  return buildCvAnalysisInstructionsCompact(hoje);
}

function buildCvAnalysisPrompt(cvText: string, maxChars?: number) {
  const text = normalizeCvText(cvText, maxChars);
  return `${buildCvAnalysisInstructions()}\n"""${text}"""`;
}

function buildCvAnalysisMessageContent(cvText: string, maxChars?: number) {
  const text = normalizeCvText(cvText, maxChars);
  return [
    {
      type: "text" as const,
      text: buildCvAnalysisInstructions(),
      cache_control: { type: "ephemeral" as const },
    },
    {
      type: "text" as const,
      text: `\n"""${text}"""`,
    },
  ];
}

function unwrapJsonOnly(text: string): string {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("Resposta vazia do Claude.");
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) return raw.slice(first, last + 1);
  throw new Error("Claude não retornou JSON válido.");
}

function parseCvAnalysisResponse(text: string, stopReason?: string | null): CvExtracted {
  const jsonText = unwrapJsonOnly(text);
  try {
    const parsed = JSON.parse(jsonText) as CvExtracted;
    if (!parsed.candidato || typeof parsed.candidato !== "object") {
      throw new Error("JSON sem bloco candidato");
    }
    return parsed;
  } catch (err) {
    if (stopReason === "max_tokens") {
      throw new SyntaxError(`JSON truncado (max_tokens): ${(err as Error).message}`);
    }
    throw err;
  }
}

function computeAnalysisMaxTokens(cvText: string, override?: number) {
  if (override != null && Number.isFinite(Number(override))) return Number(override);
  const len = String(cvText || "").length;
  if (len > 5500) return Math.max(CV_ANALYSIS_MAX_TOKENS, 4096);
  if (len > 4000) return Math.max(CV_ANALYSIS_MAX_TOKENS, 2800);
  return CV_ANALYSIS_MAX_TOKENS;
}

function msgStopReasonIsMaxTokens(err: unknown) {
  return /JSON truncado \(max_tokens\)/i.test(String((err as Error)?.message || err));
}

function isRetryableCvError(err: unknown) {
  const msg = String((err as { message?: string })?.message || err);
  if (/credit balance is too low/i.test(msg)) return false;
  const status = (err as { status?: number; statusCode?: number })?.status || (err as { statusCode?: number })?.statusCode;
  if ([429, 500, 503, 529].includes(Number(status))) return true;
  if (/overloaded|rate.?limit|timeout|econnreset|529|503|500|429/i.test(msg)) return true;
  if (err instanceof SyntaxError) return true;
  if (/JSON|Unexpected token|position \d+/i.test(msg)) return true;
  return false;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function getCvAnalysisModelLabel(): string {
  const variant = CV_PROMPT_VARIANT === "full" ? "full-legacy" : CV_PROMPT_VERSION;
  const cacheTag = CV_USE_PROMPT_CACHE ? "cached" : "nocache";
  return `${CV_ANALYSIS_MODEL}:${variant}:${cacheTag}`;
}

export async function analyzeCvWithClaude(cvText: string): Promise<CvExtracted> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("ANTHROPIC_API_KEY não configurada no servidor");
  }

  const anthropic = new Anthropic({ apiKey });
  const useCache = CV_USE_PROMPT_CACHE;
  const content = useCache ? buildCvAnalysisMessageContent(cvText) : buildCvAnalysisPrompt(cvText);
  const maxRetries = Number(process.env.CV_API_MAX_RETRIES) || 5;
  const baseDelayMs = Number(process.env.CV_API_RETRY_BASE_MS) || 5000;
  let maxTokens = computeAnalysisMaxTokens(cvText);

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const msg = await anthropic.messages.create({
        model: CV_ANALYSIS_MODEL,
        max_tokens: maxTokens,
        temperature: 0,
        messages: [{ role: "user", content }],
      });

      const text = (msg.content || [])
        .filter((c) => c.type === "text")
        .map((c) => (c.type === "text" ? c.text : ""))
        .join("\n");

      return parseCvAnalysisResponse(text, msg.stop_reason);
    } catch (err) {
      lastErr = err;
      if (msgStopReasonIsMaxTokens(err) && maxTokens < 8192) {
        maxTokens = Math.min(maxTokens * 2, 8192);
        continue;
      }
      if (!isRetryableCvError(err) || attempt >= maxRetries) throw err;
      await sleep(baseDelayMs * Math.pow(2, attempt));
    }
  }
  throw lastErr;
}
