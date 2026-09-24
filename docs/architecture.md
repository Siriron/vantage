# Vantage — Architecture

## Concept

Vantage locks an event's maximum occupancy on-chain and settles overcrowding disputes through evidence-triaged GenLayer consensus, backed by a small compliance bond and a permanent public reputation ledger.

An organizer registers an event with a venue name, a date label, a start time, a capacity limit, and a bond (0.001–5 GEN). The capacity limit and event identity are frozen at registration, before any dispute can exist — the same design principle Recourse uses for its locked spec.

After the event has occurred, anyone can open one incident against it, citing a plain-language summary of what's being alleged. Evidence for that incident is submitted through **commit-reveal**: a submitter first commits a hash of `(incident_id, submitter, source_family, source_url, salt)`, then reveals the actual family and URL after their own commit deadline passes. This prevents a submitter from copying or reacting to another submitter's source before locking in their own.

## Two-stage consensus

Vantage runs two structurally independent `run_nondet_unsafe` rounds, not one:

1. **`examine_source`** — for each revealed piece of evidence, an independent leader/validator pair fetches the source URL and judges, from the source alone: does it genuinely pertain to this exact venue/event/date (Rule 0.8's identifier-echo check — a real, correctly-fetched source about the wrong event must be rejected, not trusted), does its declared source family actually match what the content is, and does it report a usable occupancy figure. A source that fails either the identity or family check is marked `MISMATCHED` and its bond returns to the organizer as a light deterrent against noise; a source that passes is `VERIFIED` and its bond returns to the submitter.

2. **`resolve_incident`** — once the evidence window (plus a reveal buffer) has closed, a second, fully independent leader/validator pair looks only at the set of already-verified occupancy figures and the locked capacity limit, and judges whether the evidence together establishes one credible occupancy figure. If so, a deterministic function (`_ratio_to_outcome`, plain Python, not LLM-decided) converts the ratio into one of four graded severities. If the verified sources conflict with no resolvable majority, the incident resolves as `unverifiable` with zero consequence.

This mirrors SentinelSLA's confirmed pattern of a second, genuinely independent nondet round with its own leader/validator pair — not a second write that merely reads the first round's stored output.

## Graded outcome ladder

| Outcome | Trigger | Bond slashed | Reputation delta |
|---|---|---|---|
| `no_breach` | occupancy ≤ capacity | 0% | +1 |
| `mild_overage` | up to 10% over | 15% | −2 |
| `moderate_overage` | 10–30% over | 40% | −5 |
| `severe_overage` | more than 30% over | 80% | −10 |
| `unverifiable` | no resolvable figure | 0% | 0 |

The ladder uses ordinal-distance validator agreement (tolerate one adjacent rung, reject a wide swing) rather than flat equality or a raw numeric tolerance band — the same pattern this project's canon documents for graded-outcome contracts. `unverifiable` is a distinct terminal state, not a rung on the ladder, and requires exact agreement between leader and validator.

Every value in the ladder has a traced, reachable `leader_fn` branch (see the contract's own docstring for the explicit trace) — there is no unreachable verdict value.

## Settlement

Settlement is pull-based. `resolve_incident` credits a per-address balance (never transfers directly); a separate `claim()` method reads the balance, zeros it, persists the zero, then transfers — in that order. 70% of a slash goes to the complainant, 30% is retained as a protocol share.

Reputation is a permanent signed ledger (`TreeMap<address, i64>`) keyed by lowercase hex address, updated identically at every write and read site.

## Bounded exits

Every escrowed amount has a path out:
- **Unrevealed evidence bond** — `expire_unrevealed_evidence()` returns it to the organizer once the reveal deadline passes without a reveal.
- **An incident with zero verified evidence** — `expire_incident()` closes it with `unverifiable` and no consequence, once the full evidence + reveal window has elapsed.
- **A resolved event with no open incident** — `close_event()` returns the remaining bond to the organizer.

No fund path can lock permanently.

## What is deliberately out of scope

- Only one incident may be open per event at a time — a second complaint must wait for the first to resolve, keeping evidence review honest at the cost of not supporting simultaneous unrelated complaints.
- `reasoning`/`basis` fields from the LLM are length-checked, not fully content-validated against the evidence — the numeric and categorical fields the verdict actually depends on are fully re-derived and independently compared, which is the load-bearing rigor; the free-text summary is not.
- No automatic expiry sweep — every bounded exit above is an explicit, user-triggered call, matching this project's own accepted precedent (Recourse) for deadline handling.
