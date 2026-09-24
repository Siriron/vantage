# Vantage — Frontend

React + Vite, TypeScript. No Next.js.

## Structure

```
frontend/src/
  app/
    App.tsx           routing between event list, event detail, and docs
    globals.css        design tokens and base styles
  components/
    Nav.tsx
    ErrorBoundary.tsx
    EventList.tsx       home view: stats, claim panel, event lookup, register form
    EventDetail.tsx      one event's bond, status, and incident log
    RegisterEventForm.tsx
    OpenIncidentForm.tsx
    IncidentCard.tsx      evidence submission, resolve/expire actions, evidence lookup
    EvidenceForm.tsx       commit-reveal evidence submission with client-side hashing
    ClaimPanel.tsx
    Docs.tsx               in-app documentation route
  config/
    chains.ts               single plain constant for the contract address, RPC, chain ID
  lib/
    useGenLayer.ts           wallet connect, ensureChain, read/write helpers, timeout handling
    types.ts                  TypeScript types matching the contract's view JSON shapes
    format.ts                  GEN formatting, address shortening, countdown, date formatting
```

## Design

Visual language is inspection-report/permit paperwork, not a generic SaaS dashboard — motivated by the subject (venue capacity, fire-marshal reports, occupancy certificates). Warm paper background (`#F2EDE4`), near-black ink (`#1C1B1A`), hazard-orange (`#C24C2B`) reserved for breach states only, a muted stage-green (`#3F5D4A`) for compliant states. Archivo Narrow for numbers and data (capacity figures, occupancy ratios, countdowns) paired with Inter for body text. Layout is left-aligned and document-like — a running ledger margin rule, not a card grid.

## Commit-reveal implementation

`EvidenceForm.tsx` computes `sha256(incident_id|submitter_lowercase|family|url|salt)` client-side via `crypto.subtle.digest`, matching the contract's own hash construction exactly. The reveal secret (family, URL, salt) is stored in `localStorage` under a per-evidence-ID key until revealed, then removed. Losing that secret before revealing forfeits the evidence bond — the same tradeoff any commit-reveal scheme has.

## Wallet & chain handling (confirmed patterns from this project's canon)

- `account` is passed to `createClient` as the plain connected address string, never wrapped in `createAccount()` — `createAccount()` expects a private key, and passing a wallet address into it produces a silently broken signing setup rather than a compile error.
- `ensureChain()` runs before every write, handling both "unrecognized chain" (`4902`, adds StudioNet) and "already processing" (`-32002`, backs off) wallet RPC errors.
- Wallet connection is re-checked silently via `eth_accounts` on mount (never `eth_requestAccounts`, which would prompt), and stays in sync via an `accountsChanged` subscription.
- `waitForTransactionReceipt` uses `{ retries: 120, interval: 4000 }` — GenLayer consensus on a write that triggers an LLM judgment genuinely takes minutes. A timeout surfaces a `TimeoutError` carrying the real transaction hash rather than a bare failure message, since the transaction may have actually succeeded.

## Verified, not just claimed

`npx tsc --noEmit` and `npx vite build` were both run against the real dependency tree (a genuine `npm install`, not a no-network sandbox check) and both pass cleanly. `genlayer-js/chains` and `genlayer-js/types` exports were verified directly (`studionet`, `TransactionStatus` both confirmed present) rather than assumed from memory.
