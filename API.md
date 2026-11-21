\# API \& Data Contract — Claim What's Yours



All requests and responses are JSON\[cite: 1].



\## 1. Scheme Object (`schemes\_verified.json`)

```json

{

&#x20; "id": "pm-kisan",

&#x20; "name": "PM-KISAN",

&#x20; "level": "central",

&#x20; "state": "ALL",

&#x20; "category": "farm",

&#x20; "scope": "member",

&#x20; "benefit": "Short plain-language benefit (own words).",

&#x20; "needs": \["income\_support", "farming"],

&#x20; "rules": \[

&#x20;   { "field": "isFarmer", "op": "eq", "value": true, "label": "Family farms land" },

&#x20;   { "field": "landBand", "op": "in", "value": \["lt\_1ac", "1\_2.5ac"], "label": "Small landholding" }

&#x20; ],

&#x20; "documents": \["Land record", "Bank passbook (to bring, not to upload here)"],

&#x20; "steps": \["Step 1 ...", "Step 2 ..."],

&#x20; "deadline": null,

&#x20; "officialUrl": "https://...",

&#x20; "lastVerified": "2026-11-21",

&#x20; "verified": true,

&#x20; "source": "kaggle-myscheme + official page"

}

```

Rule operators: `eq`, `in`, `lte`, `gte`, `between`\[cite: 1].



\## 2. Household Profile \& Allowed Bands

```json

{

&#x20; "householdId": "h\_001",

&#x20; "district": "sample-district",

&#x20; "incomeBand": "lt\_1l",

&#x20; "needs": \["pension", "education", "health"],

&#x20; "members": \[

&#x20;   {

&#x20;     "id": "m1", "label": "Selvi", "ageBand": "60\_plus", "gender": "female",

&#x20;     "isWidow": true, "isStudent": false, "isFarmer": true, "landBand": "lt\_1ac"

&#x20;   },

&#x20;   {

&#x20;     "id": "m3", "label": "Kavya", "ageBand": "6\_17", "gender": "female",

&#x20;     "isStudent": true, "studentLevel": "school\_9\_12"

&#x20;   }

&#x20; ]

}

```



| Field | Allowed values |

|---|---|

| `ageBand` | `0\_5`, `6\_17`, `18\_25`, `26\_59`, `60\_plus` |

| `incomeBand` | `lt\_1l`, `1l\_2.5l`, `2.5l\_5l`, `gt\_5l` |

| `landBand` | `none`, `lt\_1ac`, `1\_2.5ac`, `gt\_2.5ac` |

| `studentLevel` | `school\_1\_8`, `school\_9\_12`, `college` |

| `gender` | `female`, `male`, `other` |

| booleans | `isWidow`, `isStudent`, `isFarmer`, `isDisabled`, `isDailyWage` |

| `needs` tags | `income\_support`, `pension`, `health`, `housing`, `education`, `farming`, `livelihood` |



\## 3. Endpoints



| Method | Path | Request | Response |

|---|---|---|---|

| POST | `/api/otp/request` | `{ mobile }` | `{ ok: true }` |

| POST | `/api/otp/verify` | `{ mobile, otp }` | `{ token, householdId }` |

| POST | `/api/extract` | `{ text, lang }` | `{ household, missing: \[], followUp: "string or null" }` |

| POST | `/api/match` | `{ household }` | `{ results: \[Match] }` |

| GET | `/api/schemes` | query: `category`, `q`, `verified` | `{ schemes: \[Scheme] }` |

| GET | `/api/schemes/:id` | | `Scheme` |

| PUT | `/api/schemes/:id` | `{ rules, lastVerified, ... }` | `{ scheme, newMessages: \[Message] }` |

| GET | `/api/tracker` | | `{ items: \[TrackerItem] }` |

| POST | `/api/tracker` | `TrackerItem` | `TrackerItem` |

| PATCH | `/api/tracker/:id` | `{ status?, checklistDone? }` | `TrackerItem` |

| GET | `/api/messages` | | `{ messages: \[Message] }` |

| POST | `/api/messages/read` | `{ ids }` | `{ ok: true }` |

| DELETE | `/api/me` | | `{ ok: true }` |



\*\*Match object:\*\*

```json

{

&#x20; "schemeId": "pm-kisan",

&#x20; "memberId": "m1",

&#x20; "status": "likely",

&#x20; "passed": \["Family farms land", "Small landholding"],

&#x20; "unknown": \[],

&#x20; "needScore": 2

}

```

