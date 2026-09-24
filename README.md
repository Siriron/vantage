<div align="center">

<img src="./docs/assets/favicon.svg" width="88" alt="Vantage logo" />

# Vantage

### Lock a capacity limit. Bond it. Let evidence settle disputes.

<br />

![Status](https://img.shields.io/badge/status-building-yellow?style=flat-square)
![Networks](https://img.shields.io/badge/networks-StudioNet-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20GenVM-C24C2B?style=flat-square)

<br />

**[Documentation](./docs/architecture.md)** &nbsp;·&nbsp; **[Smart Contract](./contracts/vantage.py)**

</div>

<br />

---

## What this is

Vantage lets an event organizer lock a maximum occupancy limit and post a compliance bond before tickets sell. If overcrowding is alleged after the event, anyone can open a compliance check citing a specific, fixed-family evidence source — never a free-text claim. Evidence is submitted through commit-reveal, examined independently by one GenLayer consensus round, then adjudicated as an incident by a second, fully independent round against the locked capacity limit.

<br />

<div align="center">

| | |
|---|---|
| **Concept** | Venue capacity-compliance bonds for ticketed events |
| **Consensus need** | Organizer benefits from a false no-breach verdict (keeps bond); complainant benefits from a false overage verdict (triggers payout) |
| **Evidence source** | Official safety-authority reports, venue occupancy certificates, ticketing-platform sales records, independent press — never free text |
| **Networks** | StudioNet |

</div>

<br />

---

## How it works

1. Organizer registers an event: venue, date, capacity limit, and a bond (0.001–5 GEN) — locked before the event happens.
2. After the event, anyone opens one incident citing what's being alleged, with an evidence window.
3. Evidence sources are committed as a hash, then revealed after the commit deadline.
4. **First consensus round** (`examine_source`): independently checks each revealed source's event-identity, source-family match, and reported occupancy figure.
5. **Second consensus round** (`resolve_incident`): adjudicates the incident from verified sources against the locked capacity, using a graded overage-severity ladder.

<br />

<details>
<summary><b>The graded overage ladder</b></summary>
<br />

Occupancy ratio vs. the locked capacity limit maps to one of five outcomes: `no_breach` (0% slash), `mild_overage` (≤10% over, 15% slash), `moderate_overage` (10–30% over, 40% slash), `severe_overage` (>30% over, 80% slash), or `unverifiable` (no resolvable figure, 0% slash). Validator agreement uses ordinal distance on the ladder — one adjacent rung tolerated, a wide swing rejected — rather than flat equality or a raw numeric tolerance band.

</details>

<br />

---

## Deployed contracts

<div align="center">

| Network | Address | Explorer |
|---|---|---|
| StudioNet | `0x5F631527DAeeAB4742C4924a8220cBF3Ed3c44e8` | [View](https://explorer-studio.genlayer.com/address/0x5F631527DAeeAB4742C4924a8220cBF3Ed3c44e8) |

</div>

<br />

---

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Run the contract tests (they execute the real contract under the GenVM SDK in direct mode):

```bash
pip install "genlayer-test==0.29.2"
pytest tests -q -p no:cacheprovider
```

Full deployment instructions: [`docs/deployment.md`](./docs/deployment.md)

<br />

---

## Project structure

```
contracts/vantage.py    The GenVM contract
frontend/                 React + Vite app
docs/                      architecture.md, deployment.md, contracts.md, frontend.md
tests/                      direct-mode tests executing the real contract
LICENSE                     MIT
```

<br />

---

## Status

<div align="center">

![Tested](https://img.shields.io/badge/contract%20logic-tested-brightgreen?style=flat-square)
![Untested](https://img.shields.io/badge/live%20deployment-untested-yellow?style=flat-square)

</div>

36 direct-mode tests execute the real contract under the pinned GenVM SDK runner and all pass — every write method, every graded-ladder outcome, HTTP-error handling, prompt-injection wrapping, validator agreement/rejection, bounded exits, and storage-pickling safety. `genvm-lint check` passes with zero errors. The frontend has a clean, real TypeScript compile (`npx tsc --noEmit`) and a clean production build (`npx vite build`) against the actual dependency tree. **Not yet proven:** real LLM behavior on genuine evidence documents, real network fetch behavior, real multi-node consensus timing, and the frontend's live transaction flow against an actual deployed contract — none of this has been exercised yet. See [`docs/deployment.md`](./docs/deployment.md) for the complete, itemized testing-status breakdown.

<br />

---

<div align="center">

Built on [GenLayer](https://genlayer.com) · [Portal submission](https://portal.genlayer.foundation/)

</div>
