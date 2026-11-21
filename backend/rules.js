export function evaluateSchemeEligibility(scheme, userProfile) {
  const eligibility = scheme.eligibility || {};
  const reasons = [];
  let eligible = true;

  const userAge = Number(userProfile.age);
  if (typeof eligibility.minAge === "number" && !Number.isNaN(userAge)) {
    if (userAge < eligibility.minAge) {
      eligible = false;
      reasons.push(`Minimum age required is ${eligibility.minAge}`);
    } else {
      reasons.push(`Meets minimum age (${eligibility.minAge}+)`);
    }
  }

  const allowedOccupations = (eligibility.occupations || []).map((o) =>
    String(o).toLowerCase().trim()
  );
  const userOccupation = String(userProfile.occupation || "")
    .toLowerCase()
    .trim();

  if (
    allowedOccupations.length > 0 &&
    !allowedOccupations.includes("all")
  ) {
    if (!userOccupation || !allowedOccupations.includes(userOccupation)) {
      eligible = false;
      reasons.push(
        `Occupation "${userProfile.occupation || "unspecified"}" does not match scheme criteria`
      );
    } else {
      reasons.push(`Matches occupation (${userProfile.occupation})`);
    }
  } else {
    reasons.push("Open to all occupations");
  }

  const allowedStates = (eligibility.states || []).map((s) =>
    String(s).toLowerCase().trim()
  );
  const userState = String(userProfile.state || "")
    .toLowerCase()
    .trim();

  if (allowedStates.length > 0 && !allowedStates.includes("all")) {
    if (!userState || !allowedStates.includes(userState)) {
      eligible = false;
      reasons.push(`State "${userProfile.state || "unspecified"}" is not covered`);
    } else {
      reasons.push(`Available in ${userProfile.state}`);
    }
  } else {
    reasons.push("Available across states");
  }

  const income =
    userProfile.annualIncome === undefined ||
    userProfile.annualIncome === null ||
    userProfile.annualIncome === ""
      ? null
      : Number(userProfile.annualIncome);

  if (
    typeof eligibility.maxAnnualIncome === "number" &&
    income !== null &&
    !Number.isNaN(income)
  ) {
    if (income > eligibility.maxAnnualIncome) {
      eligible = false;
      reasons.push(
        `Annual income exceeds limit of Rs ${eligibility.maxAnnualIncome}`
      );
    } else {
      reasons.push(
        `Within annual income limit (Rs ${eligibility.maxAnnualIncome})`
      );
    }
  }

  if (eligibility.requiresLand === true && !userProfile.hasLand) {
    eligible = false;
    reasons.push("Requires land ownership records");
  }

  return {
    eligible,
    reasons,
    scheme
  };
}
