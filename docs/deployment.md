# Vantage — Deployment & Testing Status

## Deploying the contract

1. Open [studio.genlayer.com](https://studio.genlayer.com/contracts).
2. Upload `contracts/vantage.py` directly (never paste the source).
3. Run `genvm-lint check contracts/vantage.py` locally first — it must pass with zero errors before deploying.
4. Deploy to StudioNet. Copy the resulting contract address.
5. Update the single constant `CONTRACT_ADDRESS` in `frontend/src/config/chains.ts` — this is the one place the address lives in the whole frontend.

**Current deployment:**
- StudioNet: `0x5F631527DAeeAB4742C4924a8220cBF3Ed3c44e8`
- Explorer: https://explorer-studio.genlayer.com/address/0x5F631527DAeeAB4742C4924a8220cBF3Ed3c44e8

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

**Proven, by 36 passing direct-mode tests that execute the real contract under the pinned GenVM SDK runner:**
- Deployed live to StudioNet at `0x5F631527DAeeAB4742C4924a8220cBF3Ed3c44e8` — deploy transaction `0x9228ff807e80d9c3a7a332a2e78e6a851099c12f27cffb2e26d5815b49d1d045` shows `FINALIZED` / `SUCCESS` / `Accepted` on the constructor call (confirmed via the explorer directly, not asserted).
- Every write method is reachable and behaves correctly under both its accept and reject paths.
- All four graded-ladder outcomes plus the `unverifiable` terminal state are reachable and map to their correct deterministic slash percentage.
- HTTP 403/404/500 responses become the `[fetch failed: HTTP n]` marker string, never real evidence content reaching the model (the confirmed `.status`-vs-`.status_code` regression this project's canon warns about).
- Evidence bodies are wrapped in the untrusted-content delimiter before reaching the prompt; a prompt-injection payload embedded in a fetched source does not change the examined outcome.
- Validator agreement: the source-examination validator tolerates small cross-model occupancy-reading variance and rejects a wide disagreement; the incident-level validator tolerates one adjacent rung on the outcome ladder and rejects a wide swing; both validators reject disagreement on discrete fields (`same_event`), a leader that errored, and thin/generic reasoning.
- No storage-backed object crosses into either nondet closure (`check_pickling` assertion).
- Every escrow path (event bond, evidence bond, incident slash, claimable credits) is arithmetically balanced at every checkpoint (`get_stats().accounting_balanced`).

**Not proven by these tests, and not claimed:**
- Real LLM behavior. All LLM responses in the test suite are mocked; how an actual model reads a real fire-marshal report or ticketing-platform export has not been exercised.
- Real network fetch behavior against a live URL.
- Real multi-node consensus timing or genuine cross-validator model variance (see this project's own confirmed finding that variance scales with genuine interpretive ambiguity in the evidence, not with the mechanism itself).
- The frontend's live transaction flow against a deployed contract — the frontend has a clean TypeScript compile and a clean production build (`npx tsc --noEmit`, `npx vite build`, both run and passing), but has not yet been exercised against a real deployed instance with a real wallet.

## Known, deliberate gaps

- Only one incident may be open per event at a time.
- `reasoning`/`basis` fields are length-checked, not fully content-validated against the fetched evidence.
- No automatic expiry sweep; every bounded exit is an explicit, user-triggered call.
- The per-incident evidence list in the frontend is a manual lookup-by-ID box rather than an automatic list, since the contract has no `list_evidence` view and evidence IDs are sequential across the whole contract rather than derivable from an incident's index alone.
