import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const allPath = path.join(ROOT, "data", "schemes_all.json");

const raw = fs.readFileSync(allPath, "utf8").replace(/^\uFEFF/, "");
const schemes = JSON.parse(raw);
const queryTerm = (process.argv[2] || "").toLowerCase();

const candidates = queryTerm
  ? schemes.filter((s) => String(s.name || "").toLowerCase().includes(queryTerm)).slice(0, 5)
  : schemes.slice(0, 5);

const drafts = candidates.map((s) => ({
  id: s.id,
  name: s.name,
  state: s.state || "ALL",
  category: s.category || "general",
  suggestedRules: [],
  note: "Draft for human verification against official scheme portal before adding to schemes_verified.json"
}));

console.log(JSON.stringify(drafts, null, 2));