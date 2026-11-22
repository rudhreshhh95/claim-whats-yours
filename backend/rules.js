function getFieldValue(target, field) {
  if (!target || typeof target !== "object") return undefined;
  if (field in target) return target[field];
  if (target.profile && field in target.profile) return target.profile[field];
  return undefined;
}

function evaluateSingleRule(rule, household, member) {
  const scope = rule.scope || (member ? "member" : "household");
  const actual =
    scope === "household"
      ? getFieldValue(household, rule.field)
      : getFieldValue(member, rule.field);

  const expected = rule.value;
  const op = rule.op || "eq";

  if (actual === undefined || actual === null) {
    return false;
  }

  switch (op) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "in":
      return Array.isArray(expected) && expected.includes(actual);
    case "nin":
      return Array.isArray(expected) && !expected.includes(actual);
    case "gte":
      return Number(actual) >= Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    case "gt":
      return Number(actual) > Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "includes":
      return Array.isArray(actual) && actual.includes(expected);
    default:
      return actual === expected;
  }
}

export function evaluateSchemeForMember(scheme, household, member) {
  const rules = Array.isArray(scheme.rules) ? scheme.rules : [];

  // Strict guard: schemes with zero rules can NEVER be marked "eligible"
  if (rules.length === 0) {
    return {
      status: "check",
      hasAnyMatch: false,
      passed: [],
      failed: ["No verified eligibility rules configured yet; verify directly with official office"],
      needScore: 0
    };
  }

  const passed = [];
  const failed = [];

  for (const rule of rules) {
    const ok = evaluateSingleRule(rule, household, member);
    const label = rule.reason || `${rule.field} ${rule.op || "eq"} ${JSON.stringify(rule.value)}`;
    if (ok) {
      passed.push(label);
    } else {
      failed.push(label);
    }
  }

  const allPassed = failed.length === 0 && passed.length > 0;
  const anyPassed = passed.length > 0;

  const needs = Array.isArray(household?.needs) ? household.needs : [];
  const needBonus = scheme.category && needs.includes(scheme.category) ? 25 : 0;
  const ratioScore = rules.length > 0 ? Math.round((passed.length / rules.length) * 75) : 0;

  return {
    status: allPassed ? "eligible" : "check",
    hasAnyMatch: anyPassed,
    passed,
    failed,
    needScore: allPassed ? Math.min(100, ratioScore + needBonus) : Math.min(74, ratioScore + needBonus)
  };
}

export function matchHousehold(schemes, payload = {}) {
  const household =
    payload.household && typeof payload.household === "object"
      ? payload.household
      : payload;

  const members =
    Array.isArray(household.members) && household.members.length > 0
      ? household.members
      : [{ id: "household_general", label: "Household", name: "Household" }];

  const memberMatches = [];
  const schemeResults = [];

  for (const member of members) {
    const memberId = member.id || member.memberId || member.label || "member";
    const memberName = member.label || member.name || memberId;

    for (const scheme of schemes) {
      const rules = Array.isArray(scheme.rules) ? scheme.rules : [];
      const evalRes = evaluateSchemeForMember(scheme, household, member);

      if (evalRes.status === "eligible" || evalRes.hasAnyMatch) {
        const entry = {
          schemeId: scheme.id,
          id: scheme.id,
          name: scheme.name,
          category: scheme.category,
          level: scheme.level,
          state: scheme.state || "ALL",
          benefitSummary: scheme.benefitSummary,
          officialUrl: scheme.officialUrl,
          lastVerified: scheme.lastVerified,
          documents: scheme.documents || [],
          applySteps: scheme.applySteps || [],
          rules,
          verified: true,
          memberId,
          memberName,
          status: rules.length === 0 ? "check" : evalRes.status,
          passed: evalRes.passed,
          failed: evalRes.failed,
          needScore: evalRes.needScore
        };
        memberMatches.push(entry);
        schemeResults.push(entry);
      }
    }
  }

  const sortFn = (a, b) => {
    if (a.status === b.status) return (b.needScore || 0) - (a.needScore || 0);
    return a.status === "eligible" ? -1 : 1;
  };

  memberMatches.sort(sortFn);
  schemeResults.sort(sortFn);

  return {
    householdId: household.householdId || "default_household",
    totalMatches: schemeResults.length,
    eligibleCount: schemeResults.filter((s) => s.status === "eligible").length,
    checkCount: schemeResults.filter((s) => s.status === "check").length,
    matches: schemeResults,
    byMember: members.map((m) => {
      const mId = m.id || m.memberId || m.label || "member";
      return {
        memberId: mId,
        memberName: m.label || m.name || mId,
        matches: memberMatches.filter((item) => item.memberId === mId)
      };
    })
  };
}
