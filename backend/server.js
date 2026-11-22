import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { matchHousehold, buildRuleChangeMessages } from "./rules.js";
import { readStore, writeStore, appendMessages } from "./store.js";

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

function sanitizeHousehold(rawHh = {}) {
  const members = Array.isArray(rawHh.members)
    ? rawHh.members.map((m, idx) => {
        const clean = { ...m };
        delete clean.aadhaar;
        delete clean.pan;
        delete clean.voterId;
        delete clean.rationCard;
        delete clean.aadhaarNo;
        delete clean.rationCardNo;
        delete clean.panNo;
        delete clean.voterIdNo;
        delete clean.bankAccount;
        return {
          id: clean.id || `m_${idx + 1}`,
          label: clean.label || clean.name || `Member ${idx + 1}`,
          ...clean
        };
      })
    : [];

  const cleanHh = { ...rawHh };
  delete cleanHh.aadhaar;
  delete cleanHh.pan;
  delete cleanHh.mobile;
  delete cleanHh.aadhaarNo;
  delete cleanHh.rationCardNo;
  delete cleanHh.panNo;
  delete cleanHh.voterIdNo;
  delete cleanHh.bankAccount;

  return {
    householdId: cleanHh.householdId || "hh_sample_tn",
    district: cleanHh.district || "",
    state: cleanHh.state || "Tamil Nadu",
    incomeBand: cleanHh.incomeBand || "lt_1l",
    needs: Array.isArray(cleanHh.needs) ? cleanHh.needs : ["income_support"],
    members
  };
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

  // Leading person name, e.g. "rudhresh, 12, student" or "sita 62 widow farmer".
  const leadingNameMatch = cleaned.match(/^\s*([A-Za-z]{2,20})\s*(?:,|\s)\s*\d/);
  const NON_NAME_WORDS = /^(widow|farmer|student|household|family|member|income|son|daughter|husband|wife|mother|father|aged?|years?|yrs?|male|female|woman|man|child|kid|below|under|less|than|lakh|acre|land|the|and)$/i;
  const primaryName =
    leadingNameMatch && !NON_NAME_WORDS.test(leadingNameMatch[1])
      ? leadingNameMatch[1][0].toUpperCase() + leadingNameMatch[1].slice(1).toLowerCase()
      : "";
  // A single widow who farms: no second earner/person mentioned.
  const secondPersonRe = /\b(murugan|son|daughter|kavya|child|kid|wife|sister|brother|father|student)\b/i;
  const soloWidowFarmer = isWidow && isFarmer && !secondPersonRe.test(lower);

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
      label: /\bselvi\b/i.test(lower) ? "Selvi" : primaryName || "Widow Member",
      age: ageNum,
      ageBand: deriveAgeBand(ageNum) || "60_plus",
      gender: "female",
      isWidow: true,
      isStudent: false,
      isFarmer,
      ...(landBand ? { landBand } : {}),
      isDailyWage: false,
      isDisabled: false
    });
  }

  if (!soloWidowFarmer && (isFarmer || isDailyWage || /\b(murugan|son|husband|father)\b/i.test(lower))) {
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
      label: /\bkavya\b/i.test(lower) ? "Kavya" : members.length === 0 && primaryName ? primaryName : "Student Member",
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

const LLM_ENUMS = {
  incomeBand: ["lt_1l", "1l_2.5l", "2.5l_5l", "gt_5l"],
  landBand: ["none", "lt_1ac", "1_2.5ac", "gt_2.5ac"],
  ageBand: ["0_5", "6_17", "18_25", "26_59", "60_plus"],
  studentLevel: ["school_1_8", "school_9_12", "college"],
  gender: ["male", "female"],
  needs: ["farming", "income_support", "pension", "education", "health", "housing", "livelihood"]
};

function scrubSensitiveIds(text) {
  return String(text || "")
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[REDACTED]")
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/gi, "[REDACTED]")
    .replace(/\b[A-Z]{3}\d{7}\b/gi, "[REDACTED]")
    .replace(/\b\d{9,18}\b/g, "[REDACTED]")
    .replace(/\b(?:ration\s*card|rc)\s*(?:no\.?|number)?\s*[:#-]?\s*[A-Z0-9-]{6,}\b/gi, "[REDACTED]");
}

async function callLlm(text, lang) {
  const baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL || "gpt-4o-mini";
  const apiKey = process.env.LLM_API_KEY;
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS) || 15000;

  const enumLines = Object.entries(LLM_ENUMS)
    .map(([key, values]) => `${key}: ${values.join(", ")}`)
    .join("\n");
  const system = [
    "Extract household eligibility details from the user's text.",
    "Return ONLY a JSON object with the key \"household\" shaped as {\"incomeBand\": string, \"needs\": string[], \"members\": [{\"id\": string, \"label\": string, \"age\": integer, \"gender\": string, \"isWidow\": boolean, \"isStudent\": boolean, \"studentLevel\": string, \"isFarmer\": boolean, \"landBand\": string, \"isDailyWage\": boolean, \"isDisabled\": boolean}]}.",
    `Allowed values:\n${enumLines}`,
    `The answer language is ${lang}.`,
    "Leave unknown fields out rather than guessing. Never include ID numbers."
  ].join("\n");

  const body = JSON.stringify({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: text }
    ]
  });

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt - 1)));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body,
        signal: controller.signal
      });
      if (!res.ok) {
        const err = new Error(`LLM request failed with status ${res.status}`);
        err.retryable = res.status === 429 || res.status >= 500;
        throw err;
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      try {
        return JSON.parse(content);
      } catch {
        const err = new Error("LLM response was not valid JSON");
        err.retryable = false;
        throw err;
      }
    } catch (err) {
      if (err.retryable === false) throw err;
      lastErr = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

function normalizeLlmProfile(raw, text = "") {
  const hh = raw && typeof raw === "object" && raw.household && typeof raw.household === "object" ? raw.household : {};
  const incomeBand = LLM_ENUMS.incomeBand.includes(hh.incomeBand) ? hh.incomeBand : "lt_1l";
  const needs = [...new Set((Array.isArray(hh.needs) ? hh.needs : []).filter((n) => LLM_ENUMS.needs.includes(n)))];

  const members = [];
  const seenIds = new Set();
  (Array.isArray(hh.members) ? hh.members : []).forEach((m, idx) => {
    if (!m || typeof m !== "object" || Array.isArray(m)) return;
    const baseId = typeof m.id === "string" && m.id.trim() ? m.id.trim() : `m_${idx + 1}`;
    let id = baseId;
    for (let n = 2; seenIds.has(id); n++) id = `${baseId}_${n}`;
    seenIds.add(id);

    const label = typeof m.label === "string" && m.label.trim() ? m.label.trim().slice(0, 60) : `Member ${idx + 1}`;
    const age = Number.isInteger(m.age) && m.age >= 0 && m.age <= 120 ? m.age : undefined;
    const ageBand = LLM_ENUMS.ageBand.includes(m.ageBand) ? m.ageBand : deriveAgeBand(age);
    const isStudent = m.isStudent === true;
    const isFarmer = m.isFarmer === true;
    const landBand = LLM_ENUMS.landBand.includes(m.landBand) ? m.landBand : undefined;

    members.push({
      id,
      label,
      ...(age !== undefined ? { age } : {}),
      ...(ageBand ? { ageBand } : {}),
      gender: LLM_ENUMS.gender.includes(m.gender) ? m.gender : "male",
      isWidow: m.isWidow === true,
      isStudent,
      ...(isStudent ? { studentLevel: LLM_ENUMS.studentLevel.includes(m.studentLevel) ? m.studentLevel : "school_9_12" } : {}),
      isFarmer,
      ...(landBand ? { landBand } : {}),
      isDailyWage: m.isDailyWage === true,
      isDisabled: m.isDisabled === true
    });
  });

  if (members.length === 0) throw new Error("LLM response contained no valid members");

  const farmerNoLand = members.some((m) => m.isFarmer && !m.landBand);
  const missing = [];
  if (!incomeBand) missing.push("incomeBand");
  if (farmerNoLand) missing.push("landBand");

  let followUp = null;
  if (farmerNoLand) {
    followUp = "Roughly how much land does the family farm (under 1 acre, 1 to 2.5 acres, or over 2.5 acres)?";
  } else if (!String(text).trim()) {
    followUp = "Tell us about your family members, their ages or roles (student, farmer, widow), and what support you need.";
  }

  return {
    household: {
      householdId: "hh_extracted",
      district: "",
      state: "Tamil Nadu",
      incomeBand,
      needs: needs.length ? needs : ["income_support"],
      members
    },
    missing,
    followUp
  };
}

export async function extractProfile(text = "", lang = "en") {
  const safeText = scrubSensitiveIds(String(text || ""));
  if (process.env.USE_MOCK_LLM === "true" || !process.env.LLM_API_KEY) {
    return extractWithKeywords(safeText, lang);
  }
  try {
    const raw = await callLlm(safeText, lang);
    return normalizeLlmProfile(raw, safeText);
  } catch (err) {
    console.warn("LLM extraction failed, using keyword fallback:", err.message);
    return extractWithKeywords(safeText, lang);
  }
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
  const { category, level, state, q, source, includeUnverified, verified } = req.query;

  const verifiedSchemes = loadJsonSafe(VERIFIED_PATH, []).map((s) => ({
    ...s,
    verified: true
  }));

  let pool = verifiedSchemes;

  if (source === "all" || includeUnverified === "true" || verified === "false") {
    const allSchemes = loadJsonSafe(ALL_PATH, []).map((s) => ({
      ...s,
      verified: false
    }));
    if (source === "all" || verified === "false") {
      pool = allSchemes;
    } else {
      pool = [...verifiedSchemes, ...allSchemes];
    }
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

app.get("/api/schemes/:id", (req, res) => {
  const { id } = req.params;
  const verifiedSchemes = loadJsonSafe(VERIFIED_PATH, []).map((s) => ({ ...s, verified: true }));
  const foundVerified = verifiedSchemes.find((s) => String(s.id) === String(id));
  if (foundVerified) {
    return res.json(foundVerified);
  }

  const allSchemes = loadJsonSafe(ALL_PATH, []).map((s) => ({ ...s, verified: false }));
  const foundAll = allSchemes.find((s) => String(s.id) === String(id));
  if (foundAll) {
    return res.json(foundAll);
  }

  return res.status(404).json({ error: `Scheme '${id}' not found` });
});

app.post("/api/extract", async (req, res) => {
  const { text = "", lang = "en" } = req.body || {};
  const extracted = await extractProfile(text, lang);
  res.json(extracted);
});

app.post("/api/match", (req, res) => {
  const verifiedSchemes = loadJsonSafe(VERIFIED_PATH, []);
  const body = req.body || {};
  const cleanHh = sanitizeHousehold(body.household && typeof body.household === "object" ? body.household : body);
  const safeBody = { ...body };
  delete safeBody.aadhaarNo;
  delete safeBody.rationCardNo;
  delete safeBody.panNo;
  delete safeBody.voterIdNo;
  delete safeBody.bankAccount;
  const result = matchHousehold(verifiedSchemes, { ...safeBody, household: cleanHh });

  const store = readStore();
  store.households[cleanHh.householdId] = cleanHh;
  writeStore(store);

  const eligibleMatches = result.matches.filter((m) => m.status === "eligible").slice(0, 5);
  const matchMsgs = eligibleMatches.map((m) => ({
    householdId: cleanHh.householdId,
    trigger: "new_match",
    text: `Likely eligible for ${m.name} (${m.memberName}). Open checklist and steps. Reply STOP to opt out.`
  }));
  appendMessages(cleanHh.householdId, matchMsgs);

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

  const hhId = updates.sampleHousehold?.householdId || "hh_sample_tn";
  appendMessages(
    hhId,
    newMessages.map((m) => ({
      id: m.id,
      householdId: hhId,
      trigger: "rule_changed",
      text: `${m.text} Reply STOP to opt out.`
    }))
  );

  res.json({
    ok: true,
    scheme: {
      ...updated,
      verified: true,
      newMessages
    }
  });
});

// Fake OTP routes (mobile kept separately in accounts map)
app.post("/api/otp/request", (req, res) => {
  const { mobile } = req.body || {};
  if (!mobile || !String(mobile).trim()) {
    return res.status(400).json({ ok: false, error: "Sample mobile number is required" });
  }
  return res.json({ ok: true, simulated: true });
});

app.post("/api/otp/verify", (req, res) => {
  const { mobile, otp } = req.body || {};
  if (!mobile || !otp) {
    return res.status(400).json({ error: "mobile and otp are required" });
  }
  const token = `tok_${crypto.randomBytes(8).toString("hex")}`;
  const householdId = "hh_sample_tn";

  const store = readStore();
  store.accounts[token] = {
    mobile: String(mobile).trim(),
    householdId,
    createdAt: new Date().toISOString()
  };
  if (!store.households[householdId]) {
    store.households[householdId] = sanitizeHousehold({
      householdId,
      district: "Chennai",
      state: "Tamil Nadu",
      incomeBand: "lt_1l",
      needs: ["pension", "education", "farming", "livelihood"],
      members: []
    });
  }
  writeStore(store);

  return res.json({ token, householdId });
});

// Tracker endpoints
app.get("/api/tracker", (req, res) => {
  const store = readStore();
  const { householdId } = req.query;
  const items = householdId
    ? store.trackerItems.filter((i) => i.householdId === householdId)
    : store.trackerItems;
  res.json({ items });
});

app.post("/api/tracker", (req, res) => {
  const body = req.body || {};
  if (!body.schemeId) {
    return res.status(400).json({ error: "schemeId is required" });
  }

  const store = readStore();
  const item = {
    id: body.id || `trk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    householdId: body.householdId || "hh_sample_tn",
    memberId: body.memberId || "household_general",
    schemeId: body.schemeId,
    status: body.status || "Not started",
    deadline: body.deadline || null,
    followUpDate: body.followUpDate || null,
    checklistDone: Array.isArray(body.checklistDone) ? body.checklistDone : []
  };

  store.trackerItems.push(item);
  writeStore(store);

  if (item.deadline) {
    appendMessages(item.householdId, [
      {
        householdId: item.householdId,
        trigger: "deadline",
        text: `Deadline noted for ${item.schemeId} (${item.deadline}). Reply STOP to opt out.`
      }
    ]);
  }
  if (item.followUpDate) {
    appendMessages(item.householdId, [
      {
        householdId: item.householdId,
        trigger: "followup",
        text: `Follow-up scheduled for ${item.schemeId} (${item.followUpDate}). Reply STOP to opt out.`
      }
    ]);
  }

  res.status(201).json(item);
});

app.patch("/api/tracker/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const store = readStore();

  const idx = store.trackerItems.findIndex((i) => String(i.id) === String(id));
  if (idx === -1) {
    return res.status(404).json({ error: `Tracker item '${id}' not found` });
  }

  const current = store.trackerItems[idx];
  const updated = {
    ...current,
    ...(updates.status !== undefined ? { status: updates.status } : {}),
    ...(updates.deadline !== undefined ? { deadline: updates.deadline } : {}),
    ...(updates.followUpDate !== undefined ? { followUpDate: updates.followUpDate } : {}),
    ...(Array.isArray(updates.checklistDone) ? { checklistDone: updates.checklistDone } : {})
  };

  store.trackerItems[idx] = updated;
  writeStore(store);

  res.json(updated);
});

// Messages endpoints
app.get("/api/messages", (req, res) => {
  const store = readStore();
  const { householdId } = req.query;
  const messages = householdId
    ? store.messages.filter((m) => m.householdId === householdId)
    : store.messages;
  res.json({ messages });
});

app.post("/api/messages/read", (req, res) => {
  const { ids } = req.body || {};
  const store = readStore();
  const idSet = Array.isArray(ids) ? new Set(ids.map(String)) : null;

  store.messages = store.messages.map((m) => {
    if (!idSet || idSet.has(String(m.id))) {
      return { ...m, read: true };
    }
    return m;
  });

  writeStore(store);
  res.json({ ok: true });
});

// Privacy delete route
app.delete("/api/me", (req, res) => {
  const { householdId, token } = req.query || {};
  const store = readStore();

  if (token && !store.accounts[token]) {
    return res.status(404).json({ error: "Account not found" });
  }
  if (!token && !householdId) {
    return res.status(400).json({ error: "token or householdId is required" });
  }

  let targetHouseholdId = householdId;
  if (token) {
    targetHouseholdId = store.accounts[token].householdId;
    delete store.accounts[token];
  } else {
    for (const [tok, acc] of Object.entries(store.accounts)) {
      if (acc.householdId === householdId) {
        delete store.accounts[tok];
      }
    }
  }

  if (targetHouseholdId) {
    delete store.households[targetHouseholdId];
    store.trackerItems = store.trackerItems.filter((i) => i.householdId !== targetHouseholdId);
    store.messages = store.messages.filter((m) => m.householdId !== targetHouseholdId);
  }

  writeStore(store);
  res.json({ ok: true });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});