/**
 * Cria repo giselysilvestre/gege-crm via GitHub API usando credencial do Git.
 */
import { spawnSync } from "node:child_process";

function gitCredential() {
  const r = spawnSync("git", ["credential", "fill"], {
    input: "protocol=https\nhost=github.com\n\n",
    encoding: "utf8",
    shell: true,
  });
  if (r.status !== 0) {
    throw new Error(r.stderr || "git credential fill falhou");
  }
  const out = r.stdout;
  const username = out.match(/^username=(.+)$/m)?.[1]?.trim();
  const password = out.match(/^password=(.+)$/m)?.[1]?.trim();
  if (!password) throw new Error("Token/senha GitHub não encontrado no credential helper");
  return { username, token: password };
}

async function main() {
  const { username, token } = gitCredential();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  const check = await fetch("https://api.github.com/repos/giselysilvestre/gege-crm", {
    headers,
  });
  if (check.status === 200) {
    console.log("Repo já existe: https://github.com/giselysilvestre/gege-crm");
    return;
  }
  if (check.status !== 404) {
    const t = await check.text();
    throw new Error(`Erro ao verificar repo (${check.status}): ${t}`);
  }

  const create = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "gege-crm",
      description: "Gegê CRM — WhatsApp conversas",
      private: false,
      auto_init: false,
    }),
  });
  const body = await create.json();
  if (!create.ok) {
    throw new Error(`Erro ao criar repo (${create.status}): ${body.message ?? JSON.stringify(body)}`);
  }
  console.log(`Repo criado: ${body.html_url} (owner: ${username ?? body.owner?.login})`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
