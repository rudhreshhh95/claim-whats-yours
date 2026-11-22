import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { matchHousehold, buildRuleChangeMessages } from "./rules.js";

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
    const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
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

function deriveAgeBand(ageNum) {
  if (!Number.isFinite(ageNum) || ageNum < 0) return undefined;
  if (ageNum <= 5) return "0_5";
  if (ageNum <= 17) return "6_17";
  if (ageNum <= 25) return "18_25";
  if (ageNum <= 59) return "26_59";
  return "60_plus";
}

function extractWithKeywords(rawText = "") {
  const cleaned = String(rawText || "").replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[REDACTED]");
  const lower = cleaned.toLowerCase();

  let incomeBand = "lt_1l";
  if (/(below|under|less\s*than)\s*1\s*lakh/i.test(lower)) {
    incomeBand = "lt_1l";
  } else if (/5\s*lakh|5l|above\s*5|gt_5l/i.test(lower)) {
    incomeBand = "gt_5l";
  } else if (/2\.5\s*lakh|2\.5l|2_5l|2\.5\s*to\s*5/i.test(lower)) {
    incomeBand = "2.5l_5l";
  } else if (/1\s*lakh|1l|1\s*to\s*2\.5/i.test(lower)) {
    incomeBand = "1l_2.5l";
  }

  let landBand;
  if (/no\s*land|landless|0\s*acre/i.test(lower)) {
    landBand = "none";
  } else if (/gt_2\.5ac|more\s*than\s*2\.5|above\s*2\.5|3\s*acre|4\s*acre|5\s*acre/i.test(lower)) {
    landBand = "gt_2.5ac";
  } else if (/1_2\.5ac|1\s*to\s*2|1\.5\s*acre|2\s*acre/i.test(lower)) {
    landBand = "1_2.5ac";
  } else if (/lt_1ac|small\s*plot|small\s*land|half\s*acre|0\.5\s*acre|1\s*acre/i.test(lower)) {
    landBand = "lt_1ac";
  }

  const needs = new Set();
  if (/farmer|farm|crop|kisan|land|acre|agricultur/i.test(lower)) {
    needs.add("farming");
    needs.add("income_support");
  }
  if (/widow|pension|senior|old|elderly|60\+|62|65/i.test(lower)) {
    needs.add("pension");
  }
  if (/student|school|college|class\s*\d+|10th|12th|scholar/i.test(lower)) {
    needs.add("education");
  }
  if (/health|hospital|medical|insurance|sick/i.test(lower)) {
    needs.add("health");
  }
  if (/house|housing|home|roof|shelter/i.test(lower)) {
    needs.add("housing");
  }
  if (/daily\s*wage|wage|labor|labour|work|job|livelihood/i.test(lower)) {
    needs.add("livelihood");
    needs.add("income_support");
  }
  if (needs.size === 0) {
    needs.add("income_support");
  }

  const members = [];
  const ageMatches = [...lower.matchAll(/\b([a-z]{2,15})?,?\s*(?:aged?\s*)?(\d{1,2})\s*(?:years?|yrs?|yo)?\b/g)];
  const isWidow = /widow|husband\s*passed\s*away|late\s*husband/i.test(lower);
  const isFarmer = /farmer|farm|kisan|acre|land/i.test(lower);
  const isDailyWage = /daily\s*wage|wage\s*worker|coolie|labour|labor/i.test(lower);
  const isStudent = /student|school|college|class\s*\d+|10th|12th/i.test(lower);

  let studentLevel;
  if (/\b(college|degree|ug|b\.sc|b\.a\.?|b\.com|b\.tech)\b/i.test(lower)) {
    studentLevel = "college";
  } else if (/\b(class\s*(9|10|11|12)|9th|10th|11th|12th|high\s*school|higher\s*secondary)\b/i.test(lower)) {
    studentLevel = "school_9_12";
  } else if (isStudent) {
    studentLevel = "school_1_8";
  }

  if (isWidow || /\b(selvi|mother|grandmother)\b/i.test(lower)) {
    const widowAgeMatch = lower.match(/\b(5[0-9]|6[0-9]|7[0-9]|8[0-9])\b/);
    const ageNum = widowAgeMatch ? Number(widowAgeMatch[1]) : 62;
    members.push({
      id: "m_widow",
      label: /\bselvi\b/i.test(lower) ? "Selvi" : "Widow Member",
      age: ageNum,
      ageBand: deriveAgeBand(ageNum) || "60_plus",
      gender: "female",
      isWidow: true,
      isStudent: false,
      isFarmer: isFarmer,
      ...(landBand ? { landBand } : {}),
      isDailyWage: false,
      isDisabled: false
    });
  }

  if (isFarmer || isDailyWage || /\b(murugan|son|husband|father)\b/i.test(lower)) {
    const adultAgeMatch = lower.match(/\b(2[0-9]|3[0-9]|4[0-9])\b/);
    const ageNum = adultAgeMatch ? Number(adultAgeMatch[1]) : 38;
    members.push({
      id: "m_earner",
      label: /\bmurugan\b/i.test(lower) ? "Murugan" : "Working Member",
      age: ageNum,
      ageBand: deriveAgeBand(ageNum) || "26_59",
      gender: /\b(female|woman|wife|mother|sister)\b/i.test(lower) && !isWidow ? "female" : "male",
      isWidow: false,
      isStudent: false,
      isFarmer,
      ...(landBand ? { landBand } : {}),
      isDailyWage,
      isDisabled: false
    });
  }

  if (isStudent || /\b(kavya|daughter|son|child|kid)\b/i.test(lower)) {
    const studentAgeMatch = lower.match(/\b([6-9]|1[0-9]|2[0-4])\b/);
    const ageNum = studentAgeMatch ? Number(studentAgeMatch[1]) : 15;
    members.push({
      id: "m_student",
      label: /\bkavya\b/i.test(lower) ? "Kavya" : "Student Member",
      age: ageNum,
      ageBand: deriveAgeBand(ageNum) || "6_17",
      gender: /\b(boy|son|male)\b/i.test(lower) && !/\b(kavya|daughter|girl)\b/i.test(lower) ? "male" : "female",
      isWidow: false,
      isStudent: true,
      studentLevel: studentLevel || "school_9_12",
      isFarmer: false,
      isDailyWage: false,
      isDisabled: false
    });
  }

  if (members.length === 0) {
    const fallbackAge = ageMatches.length > 0 ? Number(ageMatches[0][2]) : 35;
    members.push({
      id: "m_1",
      label: "Primary Member",
      age: fallbackAge,
      ageBand: deriveAgeBand(fallbackAge) || "26_59",
      gender: /\b(female|woman|she|her)\b/i.test(lower) ? "female" : "male",
      isWidow,
      isStudent,
      ...(studentLevel ? { studentLevel } : {}),
      isFarmer,
      ...(landBand ? { landBand } : {}),
      isDailyWage,
      isDisabled: false
    });
  }

  const missing = [];
  if (!incomeBand) missing.push("incomeBand");
  if (isFarmer && !landBand) missing.push("landBand");

  let followUp = null;
  if (isFarmer && !landBand) {
    followUp = "Roughly how much land does the family farm (under 1 acre, 1 to 2.5 acres, or over 2.5 acres)?";
  } else if (!lower.trim()) {
    followUp = "Tell us about your family members, their ages or roles (student, farmer, widow), and what support you need.";
  }

  return {
    household: {
      householdId: "hh_extracted",
      district: "",
      state: "Tamil Nadu",
      incomeBand,
      needs: Array.from(needs),
      members
    },
    missing,
    followUp
  };
}

export async function extractProfile(text = "", lang = "en") {
  // Mock mode or deterministic keyword fallback (no paid/unconfirmed LLM calls)
  if (process.env.USE_MOCK_LLM === "true" || !process.env.LLM_API_KEY) {
    return extractWithKeywords(text, lang);
  }
  return extractWithKeywords(text, lang);
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

app.post("/api/extract", async (req, res) => {
  const { text = "", lang = "en" } = req.body || {};
  const extracted = await extractProfile(text, lang);
  res.json(extracted);
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

  const newMessages = buildRuleChangeMessages(current, updated, updates.sampleHousehold || null);

  verifiedSchemes[idx] = updated;
  saveVerifiedSchemes(verifiedSchemes);

  res.json({
    ok: true,
    scheme: {
      ...updated,
      verified: true,
      newMessages
    }
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});