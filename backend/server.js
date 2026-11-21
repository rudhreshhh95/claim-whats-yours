import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { evaluateSchemeEligibility } from "./rules.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemesPath = path.resolve(__dirname, "../data/schemes_verified.json");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function loadSchemes() {
  const raw = fs.readFileSync(schemesPath, "utf-8");
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
  return Array.isArray(parsed) ? parsed : [];
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "claim-whats-yours-backend" });
});

app.get("/api/schemes", (req, res) => {
  try {
    const schemes = loadSchemes();
    const { category, q } = req.query;

    let filtered = schemes;

    if (category && String(category).trim() !== "") {
      const catLower = String(category).toLowerCase().trim();
      filtered = filtered.filter(
        (s) => String(s.category || "").toLowerCase() === catLower
      );
    }

    if (q && String(q).trim() !== "") {
      const queryLower = String(q).toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          String(s.name || "").toLowerCase().includes(queryLower) ||
          String(s.benefit || "").toLowerCase().includes(queryLower) ||
          String(s.category || "").toLowerCase().includes(queryLower)
      );
    }

    res.json({ count: filtered.length, schemes: filtered });
  } catch (err) {
    res.status(500).json({ error: "Failed to load schemes", details: err.message });
  }
});

app.get("/api/schemes/:id", (req, res) => {
  try {
    const schemes = loadSchemes();
    const scheme = schemes.find((s) => s.id === req.params.id);
    if (!scheme) {
      return res.status(404).json({ error: "Scheme not found" });
    }
    res.json(scheme);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch scheme", details: err.message });
  }
});

app.post("/api/match", (req, res) => {
  try {
    const schemes = loadSchemes();
    const profile = req.body || {};
    const evaluations = schemes.map((scheme) =>
      evaluateSchemeEligibility(scheme, profile)
    );

    const eligible = evaluations.filter((item) => item.eligible);
    const ineligible = evaluations.filter((item) => !item.eligible);

    res.json({
      matchedCount: eligible.length,
      eligible,
      ineligible
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to match schemes", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
