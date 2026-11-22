function normalizeBandValue(field, val) {
  if (val === undefined || val === null) return val;
  if (typeof val !== "string") return val;

  if (field === "landBand") {
    if (val === "1_to_2ac" || val === "1_2.5ac") return "1_2.5ac";
    if (val === "2_to_5ac" || val === "gt_2.5ac") return "gt_2.5ac";
  }

  if (field === "ageBand") {
    if (val === "36_to_59" || val === "26_59") return "26_59";
  }

  return val;
}

function deriveAgeBandFromAge(age) {
  const n = Number(age);
  if (!Number.isFinite(n) || n < 0) return undefined;
  if (n <= 5) return "0_5";
  if (n <= 17) return "6_17";
  if (n <= 25) return "18_25";
  if (n <= 59) return "26_59";
  return "60_plus";
}

function getFieldValue(target, field) {
  if (!target || typeof target !== "object") return undefined;

  let raw;
  if (field in target) {
    raw = target[field];
  } else if (target.profile && field in target.profile) {
    raw = target.profile[field];
  } else if (field === "ageBand" && target.age !== undefined && target.age !== null) {
    raw = deriveAgeBandFromAge(target.age);
  }

  return normalizeBandValue(field, raw);
}

function evaluateSingleRule(rule, household, member) {
  const scope = rule.scope || (member ? "member" : "household");
  const actual =
    scope === "household"
      ? getFieldValue(household, rule.field)
      : getFieldValue(member, rule.field);

  const expected = Array.isArray(rule.value)
    ? rule.value.map((v) => normalizeBandValue(rule.field, v))
    : normalizeBandValue(rule.field, rule.value);
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

const DEFAULT_SAMPLE_HOUSEHOLD = {
  householdId: "hh_sample_tn",
  district: "Chennai",
  state: "Tamil Nadu",
  incomeBand: "lt_1l",
  needs: ["income_support", "pension", "education", "farming", "livelihood"],
  members: [
    { id: "m_widow", label: "Selvi", age: 62, ageBand: "60_plus", gender: "female", isWidow: true, isFarmer: false, isDailyWage: false, isStudent: false, isDisabled: false },
    { id: "m_earner", label: "Murugan", age: 38, ageBand: "26_59", gender: "male", isWidow: false, isFarmer: true, landBand: "lt_1ac", isDailyWage: true, isStudent: false, isDisabled: false },
    { id: "m_student", label: "Kavya", age: 15, ageBand: "6_17", gender: "female", isWidow: false, isFarmer: false, isDailyWage: false, isStudent: true, studentLevel: "school_9_12", isDisabled: false }
  ]
};

export function buildRuleChangeMessages(previousScheme, updatedScheme, sampleHousehold = null) {
  const prevRules = Array.isArray(previousScheme.rules) ? previousScheme.rules : [];
  const nextRules = Array.isArray(updatedScheme.rules) ? updatedScheme.rules : [];

  const rulesChanged = JSON.stringify(prevRules) !== JSON.stringify(nextRules);
  const benefitChanged = previousScheme.benefitSummary !== updatedScheme.benefitSummary;

  if (!rulesChanged && !benefitChanged) {
    return [];
  }

  const messages = [];
  const targetHousehold = sampleHousehold && typeof sampleHousehold === "object"
    ? sampleHousehold
    : DEFAULT_SAMPLE_HOUSEHOLD;

  const beforeMatch = matchHousehold([previousScheme], { household: targetHousehold });
  const afterMatch = matchHousehold([updatedScheme], { household: targetHousehold });

  const beforeMap = new Map(
    beforeMatch.matches.map((m) => [`${m.memberId}:${m.schemeId}`, m.status])
  );
  const afterMap = new Map(
    afterMatch.matches.map((m) => [`${m.memberId}:${m.schemeId}`, m.status])
  );

  if (rulesChanged) {
    messages.push({
      id: `msg_${updatedScheme.id}_${Date.now()}_rules`,
      schemeId: updatedScheme.id,
      schemeName: updatedScheme.name,
      type: "rule_updated",
      text: `${updatedScheme.name} eligibility rules updated (${prevRules.length} -> ${nextRules.length} rules). Matches re-evaluated.`
    });

    for (const m of afterMatch.matches) {
      const key = `${m.memberId}:${m.schemeId}`;
      const prevStatus = beforeMap.get(key) || "none";
      if (prevStatus !== m.status) {
        messages.push({
          id: `msg_${updatedScheme.id}_${m.memberId}_${Date.now()}`,
          schemeId: updatedScheme.id,
          schemeName: updatedScheme.name,
          memberId: m.memberId,
          memberName: m.memberName,
          type: "status_changed",
          fromStatus: prevStatus,
          toStatus: m.status,
          text: `${m.memberName} moved from ${prevStatus} to ${m.status} for ${updatedScheme.name}.`
        });
      }
    }

    for (const [key, prevStatus] of beforeMap.entries()) {
      if (!afterMap.has(key)) {
        const [memberId] = key.split(":");
        messages.push({
          id: `msg_${updatedScheme.id}_${memberId}_removed_${Date.now()}`,
          schemeId: updatedScheme.id,
          schemeName: updatedScheme.name,
          memberId,
          type: "match_removed",
          fromStatus: prevStatus,
          toStatus: "none",
          text: `Match for ${memberId} on ${updatedScheme.name} changed after rule update.`
        });
      }
    }
  } else if (benefitChanged) {
    messages.push({
      id: `msg_${updatedScheme.id}_${Date.now()}_benefit`,
      schemeId: updatedScheme.id,
      schemeName: updatedScheme.name,
      type: "benefit_updated",
      text: `${updatedScheme.name} benefit details were updated.`
    });
  }

  return messages;
}