# claim-whats-yours
<div align="center">

<!-- Header Banner via Capsule Render -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0F766E,50:0D9488,100:D97706&height=210&section=header&text=URIMAI%20%E2%80%94%20Claim%20What's%20Yours&fontSize=38&fontColor=ffffff&fontAlignY=38&desc=AI-Assisted%20Welfare%20Eligibility%20%26%20Application%20Tracker%20for%20Indian%20Households&descSize=16&descAlignY=58&animation=fadeIn" alt="Urimai Banner" width="100%" />

<!-- Tech & Domain Badges -->
<p>
  <img src="https://img.shields.io/badge/Focus-Tamil%20Nadu%20%26%20Central%20Schemes-0F766E?style=for-the-badge&logo=gov.uk&logoColor=white" alt="Focus" />
  <img src="https://img.shields.io/badge/React-Vite%20%2B%20Tailwind-0284C7?style=for-the-badge&logo=react&logoColor=white" alt="Frontend" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-15803D?style=for-the-badge&logo=node.js&logoColor=white" alt="Backend" />
  <img src="https://img.shields.io/badge/AI-Google%20Gemini%20Multi--Model-D97706?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Gemini AI" />
</p>

<p>
  <strong>Bridging the last-mile welfare gap</strong> — turning complex government eligibility rules and spoken family details into ranked, actionable scheme matches and trackable applications.
</p>

<a href="#-architecture--data-flow">Architecture</a> •
<a href="#-core-capabilities">Capabilities</a> •
<a href="#-quick-start">Quick Start</a> •
<a href="#-api-reference">API Reference</a>

</div>

---

## 🎯 Why Urimai?

Millions of eligible citizens miss out on state and central welfare benefits due to fragmented scheme portals, dense legal eligibility criteria, and paperwork bottlenecks. **Urimai** (*"Right"* in Tamil) simplifies discovery into three steps:

1. **Speak or Select:** Describe a household naturally via voice/text or toggle member roles (`Student`, `Farmer`, `Widow`, `Senior 60+`, `Daily Wage`, `Disabled`) and household needs.
2. **Deterministic + Relevance-Ranked Matching:** Evaluates verified eligibility rules per family member and surfaces high-relevance targeted schemes ahead of generic `18+` programs.
3. **Track to Completion:** Save matched schemes with document checklists, deadlines, and office follow-up statuses.

---

## 🧭 Architecture & Data Flow

GitHub renders this interactive system diagram natively:

```mermaid
flowchart LR
    subgraph Client ["🖥️ Frontend (React + Vite + Tailwind)"]
        UI["FamilyCards & Needs"]
        VM["VoiceModal (NLP Input)"]
        RP["ResultsPanel (Ranked Matches)"]
        TR["Tracker & Checklists"]
        AR["AdminRules Editor"]
    end

    subgraph Server ["⚙️ Backend (Node.js + Express)"]
        EX["POST /api/extract"]
        MA["POST /api/match"]
        TK["/api/tracker CRUD"]
        SC["/api/schemes API"]
        RE["rules.js Engine<br/>(studentLevel + relevanceScore)"]
    end

    subgraph AI_Data ["🧠 AI & Verified Data Layer"]
        GM["Google Gemini API<br/>(Multi-Model Retry Rotation)"]
        FB["Deterministic Keyword Fallback"]
        SV[("schemes_verified.json<br/>& schemes_all.json")]
        ST[("store.json<br/>(Tracker State)")]
    end

    VM --> EX
    EX --> GM
    GM -.->|On Rate Limit / Offline| FB
    UI --> MA
    MA --> RE
    RE <--> SV
    RE --> RP
    RP --> TK
    TR <--> TK
    TK <--> ST
    AR <--> SC
    SC <--> SV