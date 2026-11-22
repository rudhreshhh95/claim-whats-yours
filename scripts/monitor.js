import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const verifiedPath = path.join(ROOT, "data", "schemes_verified.json");

const raw = fs.readFileSync(verifiedPath, "utf8").replace(/^\uFEFF/, "");
const schemes = JSON.parse(raw);

async function runMonitor() {
  const report = [];
  for (const s of schemes.slice(0, 5)) {
    if (!s.officialUrl) continue;
    try {
      const res = await fetch(s.officialUrl, { signal: AbortSignal.timeout(5000) });
      const text = await res.text();
      const hash = crypto.createHash("sha256").update(text).digest("hex").slice(0, 12);
      report.push({ id: s.id, status: res.status, hash });
    } catch (err) {
      report.push({ id: s.id, error: err.message });
    }
  }
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), report }, null, 2));
}

runMonitor();