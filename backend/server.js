import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { matchHousehold } from "./rules.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

const ROOT_DIR = path.resolve(__dirname, "..");
const VERIFIED_PATH = path.join(ROOT_DIR, "data", "schemes_verified.json");
const ALL_PATH = path.join(ROOT_DIR, "data", "schemes_all.json");

app.use(cors());
app.use(express.json({ limit: "2mb" }));

function loadJsonSafe(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, err.message);
    return fallback;
  }
}

function saveVerifiedSchemes(schemes) {
  fs.writeFileSync(VERIFIED_PATH, JSON.stringify(schemes, null, 2), "utf8");
}

app.get("/api/health", (req, res) => {
  const verified = loadJsonSafe(VERIFIED_PATH, []);
  const all = loadJsonSafe(ALL_PATH, []);
  res.json({
    ok: true,
    port: PORT,
    verifiedCount: verified.length,
    allCount: all.length
  });
});

app.get("/api/schemes", (req, res) => {
  const { category, level, state, q, source, includeUnverified } = req.query;

  const verifiedSchemes = loadJsonSafe(VERIFIED_PATH, []).map((s) => ({
    ...s,
    verified: true
  }));

  let pool = verifiedSchemes;

  if (source === "all" || includeUnverified === "true") {
    const allSchemes = loadJsonSafe(ALL_PATH, []).map((s) => ({
      ...s,
      verified: false
    }));
    pool = source === "all" ? allSchemes : [...verifiedSchemes, ...allSchemes];
  }

  let filtered = pool;

  if (category && category !== "all") {
    filtered = filtered.filter(
      (s) => String(s.category || "").toLowerCase() === String(category).toLowerCase()
    );
  }

  if (level && level !== "all") {
    filtered = filtered.filter(
      (s) => String(s.level || "").toLowerCase() === String(level).toLowerCase()
    );
  }

  if (state && state !== "ALL" && state !== "all") {
    filtered = filtered.filter((s) => {
      const st = String(s.state || "ALL").toLowerCase();
      return st === "all" || st === String(state).toLowerCase();
    });
  }

  if (q && String(q).trim()) {
    const term = String(q).trim().toLowerCase();
    filtered = filtered.filter(
      (s) =>
        String(s.name || "").toLowerCase().includes(term) ||
        String(s.benefitSummary || "").toLowerCase().includes(term) ||
        String(s.category || "").toLowerCase().includes(term)
    );
  }

  res.json({
    count: filtered.length,
    schemes: filtered
  });
});

app.post("/api/match", (req, res) => {
  const verifiedSchemes = loadJsonSafe(VERIFIED_PATH, []);
  const result = matchHousehold(verifiedSchemes, req.body || {});
  res.json(result);
});

app.put("/api/schemes/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const verifiedSchemes = loadJsonSafe(VERIFIED_PATH, []);

  const idx = verifiedSchemes.findIndex((s) => String(s.id) === String(id));
  if (idx === -1) {
    return res.status(404).json({ error: `Scheme with id '${id}' not found in verified schemes` });
  }

  const current = verifiedSchemes[idx];
  const updated = {
    ...current,
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.category !== undefined ? { category: updates.category } : {}),
    ...(updates.level !== undefined ? { level: updates.level } : {}),
    ...(updates.state !== undefined ? { state: updates.state } : {}),
    ...(updates.benefitSummary !== undefined ? { benefitSummary: updates.benefitSummary } : {}),
    ...(Array.isArray(updates.rules) ? { rules: updates.rules } : {}),
    ...(Array.isArray(updates.documents) ? { documents: updates.documents } : {}),
    ...(Array.isArray(updates.applySteps) ? { applySteps: updates.applySteps } : {}),
    lastVerified: updates.lastVerified || new Date().toISOString().slice(0, 10)
  };

  verifiedSchemes[idx] = updated;
  saveVerifiedSchemes(verifiedSchemes);

  res.json({
    ok: true,
    scheme: {
      ...updated,
      verified: true
    }
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
