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

function normalizeStudentLevel(member) {
  if (!member || typeof member !== "object") return undefined;
  const existing =
    typeof member.studentLevel === "string"
      ? member.studentLevel.trim()
      : member.profile && typeof member.profile.studentLevel === "string"
        ? member.profile.studentLevel.trim()
        : "";
  if (existing) return existing;

  const isStudent = Boolean(member.isStudent || member.profile?.isStudent);
  if (!isStudent) return undefined;

  const age = Number(member.age ?? member.profile?.age);
  if (Number.isFinite(age)) {
    return age >= 18 ? "college" : "school";
  }
  return undefined;
}

function normalizeMemberForMatch(member) {
  if (!member || typeof member !== "object") return member;
  const studentLevel = normalizeStudentLevel(member);
  if (!studentLevel) return member;
  return {
    ...member,
    studentLevel
  };
}

const AGE_BANDS = ["0_5", "6_17", "18_25", "26_59", "60_plus"];
const AGE_18_TO_35 = ["18_25", "26_59"];

function hasValue(v) {
  return v !== undefined && v !== null;
}

function getFieldValue(target, field) {
  if (!target || typeof target !== "object") return undefined;

  let raw;
  if (hasValue(target[field])) {
    raw = target[field];
  } else if (target.profile && typeof target.profile === "object" && hasValue(target.profile[field])) {
    raw = target.profile[field];
  }

  if (field === "ageBand") {
    const normalized = normalizeBandValue(field, raw);
    const hasAge = hasValue(target.age) && target.age !== "";
    const derived = hasAge ? deriveAgeBandFromAge(target.age) : undefined;
    if (derived !== undefined && !AGE_BANDS.includes(normalized)) {
      raw = derived;
    }
  }

  return normalizeBandValue(field, raw);
}

function compareValues(op, actual, expected, isAgeAlias) {
  switch (op) {
    case "eq":
      return isAgeAlias ? expected.includes(actual) : actual === expected;
    case "neq":
      return isAgeAlias ? !expected.includes(actual) : actual !== expected;
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

function evaluateSingleRule(rule, household, member) {
  if (!rule || typeof rule !== "object") return "unknown";
  const scope = rule.scope || (member ? "member" : "household");
  const actual =
    scope === "household"
      ? getFieldValue(household, rule.field)
      : getFieldValue(member, rule.field);

  const isAgeAlias = rule.field === "ageBand" && rule.value === "18_to_35";
  const expected = isAgeAlias
    ? AGE_18_TO_35
    : Array.isArray(rule.value)
      ? rule.value.flatMap((v) =>
          rule.field === "ageBand" && v === "18_to_35"
            ? AGE_18_TO_35
            : [normalizeBandValue(rule.field, v)]
        )
      : normalizeBandValue(rule.field, rule.value);
  const op = rule.op || "eq";

  if (actual === undefined || actual === null) {
    return "unknown";
  }

  return compareValues(op, actual, expected, isAgeAlias) ? "pass" : "fail";
}

function computeRelevanceScore(scheme, member, household) {
  const age = Number(member?.age ?? member?.profile?.age ?? 0);
  const isStudent = Boolean(member?.isStudent || member?.profile?.isStudent);
  const isFarmer = Boolean(member?.isFarmer || member?.profile?.isFarmer);
  const isWidow = Boolean(member?.isWidow || member?.profile?.isWidow);
  const isDailyWage = Boolean(member?.isDailyWage || member?.profile?.isDailyWage);
  const isDisabled = Boolean(member?.isDisabled || member?.profile?.isDisabled);

  const haystack = [
    scheme?.id,
    scheme?.name,
    scheme?.title,
    scheme?.category,
    scheme?.benefitSummary,
    ...(Array.isArray(scheme?.tags) ? scheme.tags : []),
    JSON.stringify(scheme?.rules || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;

  if (
    isStudent &&
    (haystack.includes("student") || haystack.includes("scholarship") || haystack.includes("education"))
  ) {
    score += 30;
  }
  if (
    isFarmer &&
    (haystack.includes("farmer") ||
      haystack.includes("agricultur") ||
      haystack.includes("kisan") ||
      haystack.includes("crop") ||
      haystack.includes("farm"))
  ) {
    score += 30;
  }
  if (isWidow && (haystack.includes("widow") || haystack.includes("destitute"))) {
    score += 35;
  }
  if (
    Number.isFinite(age) &&
    age >= 60 &&
    (haystack.includes("senior") ||
      haystack.includes("old age") ||
      haystack.includes("elderly") ||
      haystack.includes("pension"))
  ) {
    score += 30;
  }
  if (
    isDailyWage &&
    (haystack.includes("daily wage") ||
      haystack.includes("labour") ||
      haystack.includes("labor") ||
      haystack.includes("unorganized") ||
      haystack.includes("worker"))
  ) {
    score += 30;
  }
  if (
    isDisabled &&
    (haystack.includes("disab") ||
      haystack.includes("differently abled") ||
      haystack.includes("pwd") ||
      haystack.includes("handicap"))
  ) {
    score += 35;
  }

  const needs = Array.isArray(household?.needs)
    ? household.needs.map((n) => String(n).trim().toLowerCase())
    : [];

  const needKeywords = {
    pension: ["pension"],
    scholarship: ["scholarship", "student", "education"],
    farming: ["farm", "agricultur", "kisan", "crop"],
    housing: ["housing", "house", "awas", "shelter"],
    widow: ["widow", "destitute"]
  };

  for (const need of needs) {
    const terms = needKeywords[need] || [need];
    if (terms.some((term) => haystack.includes(term))) {
      score += 25;
    }
  }

  const hasSpecificRoleOrNeed = Boolean(
    isStudent ||
      isFarmer ||
      isWidow ||
      (Number.isFinite(age) && age >= 60) ||
      isDailyWage ||
      isDisabled ||
      needs.length > 0
  );

  const isGenericBroadScheme =
    haystack.includes("atal pension") ||
    haystack.includes("apy") ||
    haystack.includes("pradhan mantri suraksha bima") ||
    haystack.includes("pmsby");

  if (hasSpecificRoleOrNeed && isGenericBroadScheme) {
    score -= 15;
  }

  return score;
}

function compareMatchEntries(a, b) {
  const scoreDiff = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
  if (scoreDiff !== 0) return scoreDiff;

  if (a.status !== b.status) {
    return a.status === "eligible" ? -1 : 1;
  }

  return (b.needScore || 0) - (a.needScore || 0);
}

export function evaluateSchemeForMember(scheme, household, member) {
  const rules = Array.isArray(scheme.rules) ? scheme.rules : [];
  const normalizedMember = normalizeMemberForMatch(member);

  // Strict guard: schemes with zero rules can NEVER be marked "eligible"
  if (rules.length === 0) {
    return {
      status: "check",
      hasAnyMatch: false,
      passed: [],
      failed: ["No verified eligibility rules configured yet; verify directly with official office"],
      unknown: [],
      needScore: 0,
      relevanceScore: computeRelevanceScore(scheme, normalizedMember, household)
    };
  }

  const passed = [];
  const failed = [];
  const unknown = [];

  for (const rule of rules) {
    const result = evaluateSingleRule(rule, household, normalizedMember);
    const label = rule?.reason || `${rule?.field} ${rule?.op || "eq"} ${JSON.stringify(rule?.value)}`;
    if (result === "pass") {
      passed.push(label);
    } else if (result === "unknown") {
      unknown.push(label);
    } else {
      failed.push(label);
    }
  }

  const allPassed = failed.length === 0 && unknown.length === 0 && passed.length > 0;
  const anyPassed = passed.length > 0;

  const needs = Array.isArray(household?.needs) ? household.needs : [];
  const needBonus = scheme.category && needs.includes(scheme.category) ? 25 : 0;
  const ratioScore = rules.length > 0 ? Math.round((passed.length / rules.length) * 75) : 0;
  const relevanceScore = computeRelevanceScore(scheme, normalizedMember, household);

  return {
    status: allPassed ? "eligible" : "check",
    hasAnyMatch: anyPassed,
    passed,
    failed,
    unknown,
    needScore: allPassed ? Math.min(100, ratioScore + needBonus) : Math.min(74, ratioScore + needBonus),
    relevanceScore
  };
}

export function matchHousehold(schemes, payload = {}) {
  const safePayload = payload && typeof payload === "object" ? payload : {};
  const householdCandidate =
    safePayload.household && typeof safePayload.household === "object"
      ? safePayload.household
      : safePayload;
  const household =
    householdCandidate && typeof householdCandidate === "object" ? householdCandidate : {};

  const schemeList = Array.isArray(schemes) ? schemes : [];

  const householdState =
    typeof household.state === "string" ? household.state.trim().toLowerCase() : "";

  const applicableSchemes = schemeList.filter((scheme) => {
    if (!scheme || typeof scheme !== "object") return false;
    if (!householdState) return true;
    const schemeState = typeof scheme.state === "string" ? scheme.state.trim().toLowerCase() : "";
    if (!schemeState || schemeState === "all") return true;
    return schemeState === householdState;
  });

  const validMembers = Array.isArray(household.members)
    ? household.members.filter((m) => m && typeof m === "object")
    : [];
  const members =
    validMembers.length > 0
      ? validMembers.map(normalizeMemberForMatch)
      : [{ id: "household_general", label: "Household", name: "Household" }];

  const memberMatches = [];
  const schemeResults = [];

  for (const member of members) {
    const memberId = member.id || member.memberId || member.label || "member";
    const memberName = member.label || member.name || memberId;

    for (const scheme of applicableSchemes) {
      const rules = Array.isArray(scheme.rules) ? scheme.rules : [];
      const evalRes = evaluateSchemeForMember(scheme, household, member);

      if (
        evalRes.status === "eligible" ||
        evalRes.hasAnyMatch ||
        (evalRes.failed.length === 0 && evalRes.unknown.length > 0)
      ) {
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
          studentLevel: member.studentLevel,
          status: rules.length === 0 ? "check" : evalRes.status,
          passed: evalRes.passed,
          failed: evalRes.failed,
          unknown: evalRes.unknown,
          needScore: evalRes.needScore,
          relevanceScore: evalRes.relevanceScore
        };
        memberMatches.push(entry);
        schemeResults.push(entry);
      }
    }
  }

  memberMatches.sort(compareMatchEntries);
  schemeResults.sort(compareMatchEntries);

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
        matches: memberMatches
          .filter((item) => item.memberId === mId)
          .sort(compareMatchEntries)
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