import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const inputArg = process.argv[2] || path.join(ROOT, "data", "schemes_all.json");
const outputArg = process.argv[3] || path.join(ROOT, "data", "schemes_all.json");

const raw = fs.readFileSync(inputArg, "utf8").replace(/^\uFEFF/, "");
const rows = JSON.parse(raw);
if (!Array.isArray(rows)) {
  throw new Error("Input dataset must be a JSON array");
}

const filtered = rows.filter((row) => {
  const level = String(row.level || "").toLowerCase();
  const state = String(row.state || "ALL").toLowerCase();
  const isCentral = level === "central" || state === "all";
  const isTamilNadu = state === "tamil nadu" || state === "tn";
  return isCentral || isTamilNadu;
});

fs.writeFileSync(outputArg, JSON.stringify(filtered, null, 2), "utf8");
console.log(`Filtered ${filtered.length} central/Tamil Nadu schemes from ${rows.length} rows -> ${outputArg}`);