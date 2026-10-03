# Vantage — Deployment & Testing Status

## Deploying the contract

1. Open [studio.genlayer.com](https://studio.genlayer.com/contracts).
2. Upload `contracts/vantage.py` directly (never paste the source).
3. Run `genvm-lint check contracts/vantage.py` locally first — it must pass with zero errors before deploying.
4. Deploy to StudioNet. Copy the resulting contract address.
5. Update the single constant `CONTRACT_ADDRESS` in `frontend/src/config/chains.ts` — this is the one place the address lives in the whole frontend.

**v1 (superseded, kept for the record):** StudioNet `0x5F631527DAeeAB4742C4924a8220cBF3Ed3c44e8`. v1 has a different `register_event` / `open_incident` signature and none of the v2 safeguards, so the v2 frontend does not work against it.

**v2 (deployed):** StudioNet contract address is `0xf8b9EA8d53481f18A6514784E86e001bCA38cbeC` ([explorer](https://explorer-studio.genlayer.com/address/0xf8b9EA8d53481f18A6514784E86e001bCA38cbeC)). `frontend/src/config/chains.ts` now points to this address. The deploying wallet is the contract treasury (the only address that can call `claim_protocol_pool`).

## Running the frontend

```bash
cd frontend
npm install
npm run dev
```

## Running the tests

```bash
pip install "genlayer-test==0.29.2"
pytest tests -q -p no:cacheprovider
```

## Testing status — what is proven and what is not

**Proven, by 88 passing direct-mode tests that execute the real contract under the pinned GenVM SDK runner, plus `genvm-lint check` (0 errors, 19 methods):**
- v2 is now deployed to StudioNet at `0xf8b9EA8d53481f18A6514784E86e001bCA38cbeC`. The deployment address and explorer link above are confirmed; this repository update does not claim that a live v2 transaction flow has been exercised yet.
- Every write method is reachable and behaves correctly under both its accept and reject paths.
- All four graded-ladder outcomes plus the `unverifiable` terminal state are reachable and map to their correct deterministic slash percentage.
- HTTP 403/404/500 responses become the `[fetch failed: HTTP n]` marker string, never real evidence content reaching the model (the confirmed `.status`-vs-`.status_code` regression this project's canon warns about).
- Evidence bodies are wrapped in the untrusted-content delimiter before reaching the prompt; a prompt-injection payload embedded in a fetched source does not change the examined outcome.
- Validator agreement: the source-examination validator tolerates small cross-model occupancy-reading variance and rejects a wide disagreement; the incident-level validator requires the ladder outcome to match exactly (mild vs moderate is rejected, because each rung carries a different slash) while accepting two different raw figures that land in the same rung; both validators reject disagreement on discrete fields (`same_event`), a leader that errored, and thin/generic reasoning.
- No storage-backed object crosses into either nondet closure (`check_pickling` assertion).
- Every escrow path (event bond, evidence bond, filing bond, slash, protocol pool, claimable credits) is arithmetically balanced at every checkpoint (`get_stats().accounting_balanced`).
- **Steward-requested safeguards, each with named tests** — see `docs/REVIEW_RESPONSE.md` for the point-by-point mapping: bond locked through the challenge window; organizer cannot file or submit evidence; filing bond refund/forfeit per outcome; deterministic source authentication; canonical-URL deduplication; protocol pool unreachable by the organizer and claimable only by the treasury; exact outcome agreement between validators; per-wallet id discovery.

**Not proven by these tests, and not claimed:**
- Real LLM behavior. All LLM responses in the test suite are mocked; how an actual model reads a real fire-marshal report or ticketing-platform export has not been exercised.
- Real network fetch behavior against a live URL.
- Real multi-node consensus timing or genuine cross-validator model variance (see this project's own confirmed finding that variance scales with genuine interpretive ambiguity in the evidence, not with the mechanism itself).
- The v2 frontend's live transaction flow — it has a clean TypeScript compile and production build (`npx tsc --noEmit`, `npx vite build`), but has not been run against a deployed v2 contract with a real wallet.
- Whether a real model, reading a real government or ticketing page, lands in the same ladder rung as another validator. Exact outcome agreement is stricter than v1; if live runs show frequent rotation on borderline figures, that is a tuning question this repository cannot answer.

## Live walkthrough (about 35 minutes, two wallets)

Use wallet A as organizer and wallet B as complainant; the organizer cannot file or submit evidence on their own event. The frontend serves a test evidence page at `/test-evidence/vantage-test-arena.html` (a static fixture standing in for a ticketing platform's attendance record: venue "Vantage Test Arena", event "Test Run 2", attendance 15).

1. **Wallet A, register:** venue `Vantage Test Arena`, date label `Test Run 2`, start 3-5 minutes ahead, capacity `10`, ticketing host `vantage-tau-rouge.vercel.app`, venue host `venue.example.org`, bond `0.01`.
2. **Wallet B, after the start time passes, report:** any summary, evidence window `15`, filing bond `0.001`.
3. **Wallet B, evidence:** family `TICKETING PLATFORM`, URL `https://vantage-tau-rouge.vercel.app/test-evidence/vantage-test-arena.html`. Commit, reveal, and examine; the source should come back `VERIFIED` with figure 15.
4. **Wait** until the evidence window plus 15 minutes has passed (the card shows a "Settlement opens in" countdown), then **resolve**.
5. **Expected:** 15 people against a limit of 10 is 150%, so `severe_overage`, 80% slash of 0.01 GEN = 0.008. Wallet B is credited 0.0056 (70% of the slash) + 0.001 (filing bond back) = 0.0066 GEN; the protocol pool holds 0.0024; wallet A's remaining bond is 0.002. `get_stats` reports `accounting_balanced: true`.
6. **Claim** from wallet B. The organizer's bond reclaim (`close_event`) opens 7 days after the event start and can only be exercised then; the tests cover it with simulated time.

## Known, deliberate gaps

- Only one incident may be open per event at a time.
- Host authentication binds a source to a host the organizer locked or to a government domain; it does not prove the page's content is true. Government figures outrank organizer-host figures; where no government source exists, adjudication rests on organizer-published data alone.
- `reasoning`/`basis` fields are length-checked, not fully content-validated against the fetched evidence.
- No automatic expiry sweep; every bounded exit is an explicit, user-triggered call.
- The per-incident evidence list in the frontend is a manual lookup-by-ID box; new ids are discovered through `get_last_event` / `get_last_evidence`, which are keyed by wallet rather than inferred from a global counter.
