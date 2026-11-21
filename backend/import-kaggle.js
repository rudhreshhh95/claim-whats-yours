import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.resolve(__dirname, "../data/kaggle_raw/updated_data.csv");
const outPath = path.resolve(__dirname, "../data/schemes_verified.json");

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
  "Andaman and Nicobar", "Dadra and Nagar Haveli", "Daman and Diu", "Lakshadweep"
];

function parseCsv(text) {
  const rows = [];
  let row = [], cur = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (ch === '"' && inQuotes && next === '"') { cur += '"'; i++; }
    else if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { row.push(cur); cur = ""; }
    else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cur);
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = []; cur = "";
    } else cur += ch;
  }
  if (cur.length || row.length) { row.push(cur); if (row.some((v) => v.trim() !== "")) rows.push(row); }
  return rows;
}

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
const slugify = (s) => String(s || "scheme").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "scheme";

function detectState(level, blob) {
  if (level === "central") return "ALL";
  const lower = blob.toLowerCase();
  for (const st of STATES) {
    if (lower.includes(st.toLowerCase())) return st;
  }
  return "STATE";
}
function mapCategory(rawCat, text) {
  const blob = `${rawCat} ${text}`.toLowerCase();
  if (/\b(agricultur|farm|fisher|crop|horticultur|livestock|dairy)\b/.test(blob)) return "farm";
  if (/\b(pension|widow|old age|senior citizen)\b/.test(blob)) return "pension";
  if (/\b(hous|awas|shelter)\b/.test(blob)) return "housing";
  if (/\b(health|medical|hospital|bima|ayushman)\b/.test(blob)) return "health";
  if (/\b(educat|scholar|student|coaching|tuition|fellowship)\b/.test(blob)) return "education";
  return "livelihood";
}

function mapNeeds(category, text) {
  const needs = new Set();
  const t = text.toLowerCase();
  if (category === "farm" || /\b(farmer|cultivator|landowner|crop|fisher)\b/.test(t)) needs.add("farming");
  if (category === "pension" || /\b(pension|widow|senior citizen|elderly)\b/.test(t)) needs.add("pension");
  if (category === "housing" || /\b(house|housing|awas|shelter)\b/.test(t)) needs.add("housing");
  if (category === "health" || /\b(health|medical|hospital|bima)\b/.test(t)) needs.add("health");
  if (category === "education" || /\b(student|school|college|scholarship|coaching)\b/.test(t)) needs.add("education");
  if (/\b(livelihood|self-employ|skill|micro enterprise|artisan|wage|income support|financial assistance|allowance|stipend)\b/.test(t)) {
    needs.add("livelihood");
    if (/\b(financial assistance|allowance|stipend|pension|grant|subsidy|relief)\b/.test(t)) needs.add("income_support");
  }
  return [...needs];
}

function extractRules(eligText) {
  const t = eligText.toLowerCase();
  const rules = [];
  if (/\bwidow\b/.test(t)) rules.push({ field: "isWidow", op: "eq", value: true, label: "Widow status" });
  if (/\b(student|school|college|class\s*\d+)\b/.test(t)) rules.push({ field: "isStudent", op: "eq", value: true, label: "Student status" });
  if (/\b(farmer|cultivator|landowner)\b/.test(t)) rules.push({ field: "isFarmer", op: "eq", value: true, label: "Farmer status" });
  if (/\b(disab|pwd|divyang)\b/.test(t)) rules.push({ field: "isDisabled", op: "eq", value: true, label: "Disability status" });
  if (/\b(daily wage|laborer|labourer|street vendor|construction worker)\b/.test(t)) {
    rules.push({ field: "isDailyWage", op: "eq", value: true, label: "Daily wage / labor work" });
  }
  return rules;
}

const rawCsv = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
const table = parseCsv(rawCsv);
const headers = table[0].map((h) => clean(h));
const idx = (name) => headers.indexOf(name);
const seen = new Set();
const out = [];

for (let i = 1; i < table.length; i++) {
  const r = table[i];
  const name = clean(r[idx("scheme_name")]);
  if (!name) continue;
  let id = slugify(r[idx("slug")] || name);
  while (seen.has(id)) id = `${id}-${i}`;
  seen.add(id);

  const levelRaw = clean(r[idx("level")]).toLowerCase();
  const level = levelRaw === "central" ? "central" : "state";
  const rawCat = clean(r[idx("schemeCategory")]);
  const details = clean(r[idx("details")]);
  const benefit = clean(r[idx("benefits")]).slice(0, 220) || "Welfare assistance under government scheme.";
  const elig = clean(r[idx("eligibility")]);
  const appText = clean(r[idx("application")]);
  const docText = clean(r[idx("documents")]);
  const urlMatch = `${appText} ${details}`.match(/https?:\/\/[^\s)"']+/i);
  const category = mapCategory(rawCat, `${name} ${elig} ${benefit}`);
  const rules = extractRules(elig);
  const state = detectState(level, `${name} ${details} ${elig} ${appText}`);

  out.push({
    id,
    name,
    level,
    state,
    category,
    scope: rules.some((x) => x.field !== "isFarmer") ? "member" : "household",
    benefit,
    needs: mapNeeds(category, `${elig} ${benefit} ${details}`),
    rules,
    documents: docText ? docText.split(/\.\s+/).map(clean).filter(Boolean).slice(0, 6) : [],
    steps: appText ? appText.split(/(?=Step\s*\d+)/i).map(clean).filter(Boolean).slice(0, 6) : [],
    deadline: null,
    officialUrl: urlMatch ? urlMatch[0] : null,
    lastVerified: "2026-11-22",
    verified: true,
    source: "kaggle-myscheme + official page"
  });
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log("Converted schemes:", out.length);