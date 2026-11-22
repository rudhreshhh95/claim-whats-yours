import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.resolve(__dirname, "..", "data", "store.json");

const DEFAULT_STORE = {
  accounts: {},       // token -> { mobile, householdId, createdAt }
  households: {},     // householdId -> { householdId, district, state, incomeBand, needs, members }
  trackerItems: [],   // { id, householdId, memberId, schemeId, status, deadline, followUpDate, checklistDone }
  messages: []        // { id, householdId, text, createdAt, trigger, read }
};

export function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      writeStore(DEFAULT_STORE);
      return structuredClone(DEFAULT_STORE);
    }
    const raw = fs.readFileSync(STORE_PATH, "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw);
    return {
      accounts: parsed.accounts && typeof parsed.accounts === "object" ? parsed.accounts : {},
      households: parsed.households && typeof parsed.households === "object" ? parsed.households : {},
      trackerItems: Array.isArray(parsed.trackerItems) ? parsed.trackerItems : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : []
    };
  } catch (err) {
    console.error("Failed to read store.json, using default:", err.message);
    return structuredClone(DEFAULT_STORE);
  }
}

export function writeStore(storeData) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(storeData, null, 2), "utf8");
}

export function appendMessages(householdId, items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const store = readStore();
  const targetHhId = householdId || "default_household";
  const created = [];

  for (const item of items) {
    const msg = {
      id: item.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      householdId: item.householdId || targetHhId,
      text: item.text,
      createdAt: item.createdAt || new Date().toISOString(),
      trigger: item.trigger || "new_match",
      read: Boolean(item.read)
    };
    const exists = store.messages.some(
      (existing) => existing.householdId === msg.householdId && existing.text === msg.text
    );
    if (!exists) {
      store.messages.unshift(msg);
      created.push(msg);
    }
  }

  if (created.length > 0) {
    writeStore(store);
  }
  return created;
}