// Mock data for the demo flow. Shapes follow API.md.
// Nothing here is fetched from a server.

export const sampleHousehold = {
  householdId: "h_001",
  district: "sample-district",
  incomeBand: "lt_1l",
  needs: ["pension", "education", "health", "farming"],
  members: [
    {
      id: "m1",
      label: "Selvi",
      age: 62,
      ageBand: "60_plus",
      gender: "female",
      isWidow: true,
      isStudent: false,
      isFarmer: true,
      isDailyWage: false,
      isDisabled: false,
      landBand: "lt_1ac",
    },
    {
      id: "m2",
      label: "Murugan",
      age: 38,
      ageBand: "26_59",
      gender: "male",
      isWidow: false,
      isStudent: false,
      isFarmer: false,
      isDailyWage: true,
      isDisabled: false,
      landBand: "none",
    },
    {
      id: "m3",
      label: "Kavya",
      age: 15,
      ageBand: "6_17",
      gender: "female",
      isWidow: false,
      isStudent: true,
      isFarmer: false,
      isDailyWage: false,
      isDisabled: false,
      landBand: "none",
      studentLevel: "school_9_12",
    },
  ],
};

export const schemes = [
  {
    id: "pm-kisan",
    name: "PM-KISAN",
    level: "central",
    state: "ALL",
    category: "farm",
    scope: "member",
    benefit: "A yearly payment paid in instalments to small farmer families.",
    needs: ["income_support", "farming"],
    rules: [
      { field: "isFarmer", op: "eq", value: true, label: "Family farms land" },
      {
        field: "landBand",
        op: "in",
        value: ["lt_1ac", "1_2.5ac"],
        label: "Small landholding",
      },
    ],
    documents: [
      "Land record",
      "Bank passbook (to bring, not to upload here)",
      "Aadhaar card",
    ],
    steps: [
      "Go to the PM-KISAN website or your village office.",
      "Ask for the farmer registration form.",
      "Fill in your name, land details and bank account.",
      "Submit the form with your documents and keep the receipt.",
    ],
    deadline: null,
    officialUrl: "https://pmkisan.gov.in/",
    lastVerified: "2026-11-21",
    verified: true,
    source: "mock sample data",
  },
  {
    id: "indira-gandhi-widow-pension",
    name: "Indira Gandhi National Widow Pension Scheme",
    level: "central",
    state: "ALL",
    category: "pension",
    scope: "member",
    benefit: "A monthly pension for widows who are poor and have no other income.",
    needs: ["pension", "income_support"],
    rules: [
      { field: "isWidow", op: "eq", value: true, label: "Widow" },
      {
        field: "ageBand",
        op: "in",
        value: ["26_59", "60_plus"],
        label: "Adult (26 or older)",
      },
    ],
    documents: [
      "Age proof",
      "Widowhood certificate or spouse's death certificate",
      "Bank passbook",
      "Aadhaar card",
    ],
    steps: [
      "Visit your block or panchayat office.",
      "Ask for the widow pension application form.",
      "Fill in your details and attach your documents.",
      "Submit the form and note the application number.",
    ],
    deadline: null,
    officialUrl: "https://nsap.nic.in/",
    lastVerified: "2026-11-21",
    verified: true,
    source: "mock sample data",
  },
  {
    id: "post-matric-scholarship-9-12",
    name: "Class 9–12 Post-Matric Scholarship",
    level: "central",
    state: "ALL",
    category: "education",
    scope: "member",
    benefit: "A yearly scholarship that helps students in Class 9 to 12 stay in school.",
    needs: ["education"],
    rules: [
      { field: "isStudent", op: "eq", value: true, label: "Currently a student" },
      {
        field: "studentLevel",
        op: "eq",
        value: "school_9_12",
        label: "Class 9–12 student",
      },
    ],
    documents: [
      "School marksheet (Class 9 or 10)",
      "Income certificate",
      "Student's bank account",
      "Caste certificate (if applicable)",
    ],
    steps: [
      "Ask your school head teacher about the scholarship.",
      "Register on the scholarship portal with your student details.",
      "Upload or submit your marksheet and income certificate.",
      "Check the status on the portal or ask your school.",
    ],
    deadline: null,
    officialUrl: "https://scholarships.gov.in/",
    lastVerified: "2026-11-21",
    verified: true,
    source: "mock sample data",
  },
];

export const sampleMatches = [
  {
    schemeId: "pm-kisan",
    memberId: "m1",
    status: "likely",
    passed: ["Family farms land", "Small landholding"],
    unknown: [],
    needScore: 2,
  },
  {
    schemeId: "indira-gandhi-widow-pension",
    memberId: "m1",
    status: "likely",
    passed: ["Widow", "Adult (26 or older)"],
    unknown: [],
    needScore: 2,
  },
  {
    schemeId: "post-matric-scholarship-9-12",
    memberId: "m3",
    status: "likely",
    passed: ["Currently a student", "Class 9–12 student"],
    unknown: [],
    needScore: 2,
  },
  {
    schemeId: "pm-kisan",
    memberId: "m2",
    status: "check_office",
    passed: [],
    unknown: ["Land ownership record"],
    needScore: 0,
  },
];

export const sampleChatText =
  "Selvi, 62, widow, small farm under 1 acre. Murugan, 38, daily wage work. Kavya, 15, studying Class 10. Family income under 1 lakh a year.";

// Seed alerts for the simulated SMS drawer. Shape: { id, type, text, read }.
export const seedAlerts = [
  {
    id: "a1",
    type: "new_match",
    text: "New match: PM-KISAN may apply to Selvi.",
    read: false,
  },
  {
    id: "a2",
    type: "new_match",
    text: "New match: Class 9–12 Post-Matric Scholarship may apply to Kavya.",
    read: false,
  },
  {
    id: "a3",
    type: "deadline",
    text: "Deadline: Class 9–12 Post-Matric Scholarship closes on 2026-12-31.",
    read: false,
  },
];

