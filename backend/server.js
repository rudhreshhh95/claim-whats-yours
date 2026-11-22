import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { matchHousehold } from "./rules.js";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemesPath = path.resolve(__dirname, "../data/schemes_verified.json");
const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors());
app.use(express.json());

const store = {
  householdId: "h_001",
  tracker: [],
  messages: [{ id: "msg_1", title: "Welcome", body: "Ready to check eligibility.", read: false }]
};
const loadSchemes = () => JSON.parse(fs.readFileSync(schemesPath, "utf-8").replace(/^\uFEFF/, ""));
const saveSchemes = (list) => fs.writeFileSync(schemesPath, JSON.stringify(list, null, 2), "utf-8");

app.get("/api/health", (req, res) => res.json({ ok: true, service: "claim-whats-yours-backend" }));
app.post("/api/otp/request", (req, res) => res.json({ ok: true }));
app.post("/api/otp/verify", (req, res) => res.json({ token: "demo-token", householdId: store.householdId }));

app.post("/api/extract", (req, res) => {
  const { text = "", lang = "en" } = req.body || {};
  const t = String(text).toLowerCase();
  const needs = [];
  if (t.includes("pension") || t.includes("widow")) needs.push("pension");
  if (t.includes("school") || t.includes("student") || t.includes("college")) needs.push("education");
  if (t.includes("farm") || t.includes("land")) needs.push("farming");
  if (t.includes("house") || t.includes("home")) needs.push("housing");
  res.json({ household: { householdId: store.householdId, district: "sample-district", incomeBand: "lt_1l", needs, members: [], lang }, missing: [], followUp: null });
});

app.post("/api/match", (req, res) => {
  const hh = req.body?.household || req.body || {};
  res.json({ results: matchHousehold(loadSchemes(), hh) });
});

app.get("/api/schemes", (req, res) => {
  let list = loadSchemes();
  const { category, q, verified } = req.query;
  if (category) list = list.filter((s) => String(s.category).toLowerCase() === String(category).toLowerCase());
  if (verified !== undefined) list = list.filter((s) => Boolean(s.verified) === (String(verified) === "true"));
  if (q) {
    const query = String(q).toLowerCase();
    list = list.filter((s) => `${s.name} ${s.benefit} ${s.category}`.toLowerCase().includes(query));
  }
  res.json({ schemes: list });
});

app.get("/api/schemes/:id", (req, res) => {
  const s = loadSchemes().find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: "Not found" });
  res.json(s);
});
app.put("/api/schemes/:id", (req, res) => {
  const list = loadSchemes();
  const i = list.findIndex((x) => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: "Not found" });
  list[i] = { ...list[i], ...req.body, id: list[i].id };
  saveSchemes(list);
  const msg = { id: `msg_${Date.now()}`, title: `Updated: ${list[i].name}`, body: "Scheme updated.", read: false };
  store.messages.unshift(msg);
  res.json({ scheme: list[i], newMessages: [msg] });
});

app.get("/api/tracker", (req, res) => res.json({ items: store.tracker }));
app.post("/api/tracker", (req, res) => {
  const item = { id: req.body?.id || `trk_${Date.now()}`, status: "pending", checklistDone: [], ...req.body };
  store.tracker.push(item);
  res.status(201).json(item);
});
app.patch("/api/tracker/:id", (req, res) => {
  const item = store.tracker.find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Not found" });
  if (req.body?.status !== undefined) item.status = req.body.status;
  if (req.body?.checklistDone !== undefined) item.checklistDone = req.body.checklistDone;
  res.json(item);
});

app.get("/api/messages", (req, res) => res.json({ messages: store.messages }));
app.post("/api/messages/read", (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  store.messages = store.messages.map((m) => (!ids.length || ids.includes(m.id) ? { ...m, read: true } : m));
  res.json({ ok: true });
});

app.delete("/api/me", (req, res) => {
  store.tracker = [];
  store.messages = [];
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));