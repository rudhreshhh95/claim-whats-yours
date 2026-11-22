import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const targetArg = process.argv[2] || path.join(ROOT, "data", "schemes_all.json");

function loadRows(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

const rows = loadRows(targetArg);
const seenIds = new Set();
let duplicates = 0;
let missingName = 0;
let missingBenefit = 0;
let truncatedText = 0;
let tamilNaduCount = 0;
let centralCount = 0;

for (const row of rows) {
  const id = String(row.id || row.slug || row.name || "").trim().toLowerCase();
  if (id) {
    if (seenIds.has(id)) duplicates += 1;
    else seenIds.add(id);
  }

  const name = String(row.name || row.scheme_name || row.title || "").trim();
  const benefit = String(row.benefitSummary || row.benefit || row.benefits || "").trim();
  if (!name) missingName += 1;
  if (!benefit) missingBenefit += 1;
  if (benefit.endsWith("...") || benefit.endsWith("…")) truncatedText += 1;

  const stateVal = String(row.state || "").toLowerCase();
  const levelVal = String(row.level || "").toLowerCase();
  if (stateVal.includes("tamil nadu")) tamilNaduCount += 1;
  if (levelVal.includes("central") || stateVal === "all") centralCount += 1;
}

console.log(JSON.stringify({
  file: targetArg,
  totalRows: rows.length,
  uniqueApprox: seenIds.size,
  duplicates,
  missingName,
  missingBenefit,
  truncatedText,
  tamilNaduCount,
  centralCount
}, null, 2));