<div align="center">

<!-- Animated Typing Hero Title -->
<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=Plus+Jakarta+Sans&weight=700&size=36&duration=3200&pause=1000&color=0D9488&center=true&vCenter=true&width=780&height=65&lines=URIMAI+%E2%80%94+Claim+What's+Yours;AI+Welfare+Eligibility+%26+Tracker;Built+for+Tamil+Nadu+%26+India" alt="Urimai Animated Title" />
</a>

<!-- Subtitle Typing Line -->
<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=Inter&weight=500&size=16&duration=3500&pause=1200&color=D97706&center=true&vCenter=true&width=720&height=35&lines=Speak+your+family+story+%E2%86%92+Get+ranked+schemes+%E2%86%92+Track+applications;Zero+guesswork.+Verified+rules.+Actionable+checklists." alt="Urimai Subtitle" />
</a>

<br/>

<!-- Aesthetic Pill Badges -->
<p>
  <img src="https://img.shields.io/badge/Region-Tamil%20Nadu%20%26%20Central%20India-0F766E?style=for-the-badge&logo=compass&logoColor=white" alt="Region" />
  <img src="https://img.shields.io/badge/Frontend-React%20%E2%80%A2%20Vite%20%E2%80%A2%20Tailwind-0284C7?style=for-the-badge&logo=react&logoColor=white" alt="Frontend" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20%E2%80%A2%20Express-15803D?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Backend" />
  <img src="https://img.shields.io/badge/AI-Gemini%20Multi--Model-D97706?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Gemini" />
</p>

<br/>

> *"Urimai" (உரிமை) means **Right** in Tamil — turning complex government scheme criteria into clear, personalized entitlements every household can claim.*

<br/>

[✨ Overview](#-overview) &nbsp;•&nbsp;
[🧭 Architecture](#-system-architecture) &nbsp;•&nbsp;
[⚡ Key Features](#-key-features) &nbsp;•&nbsp;
[🚀 Quick Start](#-quick-start) &nbsp;•&nbsp;
[🔌 API Reference](#-api-reference)

</div>

---

## ✨ Overview

Millions of eligible families miss out on state and central welfare programs due to scattered portals, dense eligibility rules, and paperwork confusion. **Urimai** bridges that gap in three effortless steps:

<table>
  <tr>
    <td align="center" width="33%">
      <h3>1️⃣ Speak or Select</h3>
      <p>Describe your household in plain language via voice/text or toggle roles (<code>Student</code>, <code>Farmer</code>, <code>Widow</code>, <code>Senior 60+</code>, <code>Daily Wage</code>, <code>Disabled</code>) and needs.</p>
    </td>
    <td align="center" width="33%">
      <h3>2️⃣ Smart Match & Rank</h3>
      <p>Deterministic rule evaluation paired with role/need relevance scoring surfaces high-impact targeted schemes ahead of generic <code>18+</code> programs.</p>
    </td>
    <td align="center" width="33%">
      <h3>3️⃣ Track to Approval</h3>
      <p>Save schemes with resolved titles, required document checklists, deadlines, and status tracking until benefits are received.</p>
    </td>
  </tr>
</table>

---

## 🧭 System Architecture

```mermaid
flowchart LR
    subgraph UI ["🖥️ Client — React + Vite + Tailwind"]
        direction TB
        FC["FamilyCards & Needs"]
        VM["VoiceModal (NLP Input)"]
        RP["ResultsPanel (Ranked Cards)"]
        TR["Tracker & Checklists"]
        AR["AdminRules Studio"]
    end

    subgraph API ["⚙️ Server — Node.js + Express"]
        direction TB
        EX["POST /api/extract"]
        MA["POST /api/match"]
        TK["/api/tracker CRUD"]
        SC["/api/schemes API"]
        RE["rules.js Engine<br/>studentLevel + relevanceScore"]
    end

    subgraph DATA ["🧠 AI & Verified Data"]
        direction TB
        GM["Google Gemini API<br/>(Multi-Model Retry Rotation)"]
        FB["Keyword Fallback Engine"]
        SV[("schemes_verified.json<br/>schemes_all.json")]
        ST[("store.json")]
    end

    VM --> EX
    EX --> GM
    GM -.->|Rate Limit / Offline| FB
    FC --> MA
    MA --> RE
    RE <--> SV
    RE --> RP
    RP --> TK
    TR <--> TK
    TK <--> ST
    AR <--> SC
    SC <--> SV

    style UI fill:#f0fdfa,stroke:#0d9488,stroke-width:2px,color:#134e4a
    style API fill:#eff6ff,stroke:#0284c7,stroke-width:2px,color:#1e3a8a
    style DATA fill:#fffbeb,stroke:#d97706,stroke-width:2px,color:#78350f