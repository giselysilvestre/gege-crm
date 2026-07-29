/**
 * Copia KAPSO_API_KEY e KAPSO_PHONE_NUMBER_ID para gege-crm/.env.local
 *
 * Procura o .env do bot nesta ordem:
 * 1. ../gege/whatsapp-bot/.env (monorepo local)
 * 2. ../../gege/whatsapp-bot/.env
 * 3. KAPSO_BOT_ENV (caminho absoluto no seu PC)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const crmRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  process.env.KAPSO_BOT_ENV,
  path.join(crmRoot, "../gege/whatsapp-bot/.env"),
  path.join(crmRoot, "../../gege/whatsapp-bot/.env"),
].filter(Boolean);

const botEnvPath = candidates.find((p) => fs.existsSync(p));
if (!botEnvPath) {
  console.error(
    "Não achei whatsapp-bot/.env. Defina KAPSO_BOT_ENV ou copie as chaves Kapso manualmente para .env.local"
  );
  process.exit(1);
}

const botEnv = fs.readFileSync(botEnvPath, "utf8");
const pick = (k) => {
  const m = botEnv.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim() : "";
};
const key = pick("KAPSO_API_KEY");
const phone = pick("KAPSO_PHONE_NUMBER_ID");
if (!key || !phone) {
  console.error(`Kapso não encontrado em ${botEnvPath}`);
  process.exit(1);
}

const target = path.join(crmRoot, ".env.local");
let text = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
for (const [k, v] of [
  ["KAPSO_API_KEY", key],
  ["KAPSO_PHONE_NUMBER_ID", phone],
]) {
  if (new RegExp(`^${k}=`, "m").test(text)) {
    text = text.replace(new RegExp(`^${k}=.*$`, "m"), `${k}=${v}`);
  } else {
    text = `${text.trimEnd()}\n${k}=${v}\n`;
  }
}
fs.writeFileSync(target, text);
console.log(`Ok — Kapso copiado de ${botEnvPath}. Reinicie: cd gege-crm && npm run dev`);
