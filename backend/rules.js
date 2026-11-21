const ORDER = {
  ageBand: ["0_5", "6_17", "18_25", "26_59", "60_plus"],
  incomeBand: ["lt_1l", "1l_2.5l", "2.5l_5l", "gt_5l"],
  landBand: ["none", "lt_1ac", "1_2.5ac", "gt_2.5ac"],
  studentLevel: ["school_1_8", "school_9_12", "college"]
};
function evalRule(r, m, h) {
  const v = m?.[r.field] !== undefined ? m[r.field] : h?.[r.field];
  if (v === undefined || v === null || v === "") return "unknown";
  if (r.op === "eq") return v === r.value ? "passed" : "failed";
  if (r.op === "in") return Array.isArray(r.value) && r.value.includes(v) ? "passed" : "failed";
  const s = ORDER[r.field];
  if (!s) return "unknown";
  const i = s.indexOf(v);
  if (i === -1) return "unknown";
  if (r.op === "between" && Array.isArray(r.value)) return i >= s.indexOf(r.value[0]) && i <= s.indexOf(r.value[1]) ? "passed" : "failed";
  const t = s.indexOf(r.value);
  if (t === -1) return "unknown";
  if (r.op === "lte") return i <= t ? "passed" : "failed";
  if (r.op === "gte") return i >= t ? "passed" : "failed";
  return "unknown";
}
export function matchHousehold(schemes, hh = {}) {
  const members = Array.isArray(hh.members) && hh.members.length ? hh.members : [{ id: null }];
  const needs = Array.isArray(hh.needs) ? hh.needs : [];
  const out = [];
  for (const sc of schemes) {
    const needScore = (sc.needs || []).filter((n) => needs.includes(n)).length;
    for (const m of sc.scope === "household" ? [{ id: null }] : members) {
      const passed = [], unknown = [];
      let failed = false;
      for (const r of sc.rules || []) {
        const res = evalRule(r, m, hh);
        if (res === "passed") passed.push(r.label || r.field);
        else if (res === "unknown") unknown.push(r.label || r.field);
        else failed = true;
      }
      if (!failed || unknown.length) {
        out.push({ schemeId: sc.id, memberId: m.id ?? null, status: failed ? "unlikely" : unknown.length ? "possible" : "likely", passed, unknown, needScore });
      }
    }
  }
  return out;
}