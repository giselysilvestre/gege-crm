/** Lê JSON de fetch sem quebrar quando o servidor devolve HTML (erro 500, login, etc.). */
export async function readJsonResponse<T = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const trimmed = text.trimStart();
    if (trimmed.startsWith("<!") || trimmed.startsWith("<html")) {
      throw new Error(
        res.status >= 500
          ? "Servidor com erro — recarregue a página. Se estiver local, pare e rode npm run dev:fast de novo."
          : `Resposta inválida (${res.status}). Tente fazer login de novo.`
      );
    }
    throw new Error(trimmed.slice(0, 200) || `Erro HTTP ${res.status}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Resposta inválida do servidor.");
  }
}
