# Vantage — Architecture

## Concept

Vantage locks an event's maximum occupancy on-chain and settles overcrowding disputes through evidence-triaged GenLayer consensus, backed by a small compliance bond and a permanent public reputation ledger.

An organizer registers an event with a venue name, a date label, a start time, a capacity limit, the **ticketing host** and **venue host** that evidence may come from, and a bond (0.001–5 GEN). All of it is frozen at registration, before any dispute can exist — the same design principle Recourse uses for its locked spec.

After the event has started, and inside a 7-day challenge window, anyone **except the organizer** can open one incident against it, citing a plain-language summary and posting a filing bond (0.001–1 GEN). Evidence for that incident is submitted through **commit-reveal**: a submitter first commits a hash of `(incident_id, submitter, source_family, source_url, salt)`, then reveals the actual family and URL after their own commit deadline passes. This prevents a submitter from copying or reacting to another submitter's source before locking in their own.

## Two-stage consensus

Vantage runs two structurally independent `run_nondet_unsafe` rounds, not one:

0. **Source authentication (deterministic, runs at reveal, before any model sees the URL).** `SAFETY_AUTHORITY` must be a government domain (`.gov`/`.mil`, or `gov`/`gouv`/`gob`/`govt`/`mil` directly under a two-letter country TLD — `gov.evil.com` fails). `VENUE_CERTIFICATE` and `TICKETING_PLATFORM` must sit on the venue / ticketing host the organizer locked at registration. IP literals, localhost, ports, and credentials are rejected. Any backslash, whitespace, non-ASCII character, or percent-encoding in the host is rejected, because parsers disagree on what host such a URL names (`https://evil.com\.gov/x` is `evil.com` to a browser). A canonical-URL key (lowercased host and path; fragment, query string and trailing slash dropped) rejects the same source twice for one incident, which matters because repeated identical figures would otherwise read as a majority to the adjudicator. The organizer cannot submit evidence at all.

1. **`examine_source`** — for each revealed piece of evidence, an independent leader/validator pair fetches the source URL and judges, from the source alone: does it genuinely pertain to this exact venue/event/date (Rule 0.8's identifier-echo check — a real, correctly-fetched source about the wrong event must be rejected, not trusted), does its declared source family actually match what the content is, and does it report a usable occupancy figure. A source that fails either the identity or family check is marked `MISMATCHED` and its bond returns to the organizer as a light deterrent against noise; a source that passes is `VERIFIED` and its bond returns to the submitter.

2. **`resolve_incident`** — once the evidence window (plus a reveal buffer) has closed, and only when no revealed source is still waiting to be examined, a second, fully independent leader/validator pair looks only at the set of already-verified occupancy figures and the locked capacity limit, and judges whether the evidence together establishes one credible occupancy figure. Three deterministic rules bound what the model can do here. **Precedence:** if any government source reported a figure, only government figures are considered; figures from organizer-chosen hosts count only when no government source reported one. **No invention:** the chosen figure must lie within the range of the verified figures (leader raises, validator rejects otherwise), and with no verified figure at all the incident resolves `unverifiable` without calling the model. **Completeness:** `resolve_incident` and `expire_incident` both refuse to run while any revealed source is unexamined, so a settlement cannot be raced past exculpatory evidence. A deterministic function (`_ratio_to_outcome`, plain Python, not LLM-decided) then converts the ratio into one of four graded severities. If the verified sources conflict with no resolvable majority, the incident resolves as `unverifiable` with zero consequence.

This mirrors SentinelSLA's confirmed pattern of a second, genuinely independent nondet round with its own leader/validator pair — not a second write that merely reads the first round's stored output.

## Graded outcome ladder

| Outcome | Trigger | Bond slashed | Reputation delta |
|---|---|---|---|
| `no_breach` | occupancy ≤ capacity | 0% | 0 |
| `mild_overage` | up to 10% over | 15% | −2 |
| `moderate_overage` | 10–30% over | 40% | −5 |
| `severe_overage` | more than 30% over | 80% | −10 |
| `unverifiable` | no resolvable figure | 0% | 0 |

Validators must agree on the outcome **exactly** (`_OUTCOME_TOLERANCE_RUNGS = 0`). Each rung carries a different slash, so an adjacent-rung tolerance would let a validator approve a materially different payout. Cross-model variance is absorbed one stage earlier instead: each source's reported figure is compared with a proportional tolerance, and the outcome is derived from the ratio by plain Python (`_ratio_to_outcome`), identically by leader and validator. `unverifiable` is a distinct terminal state, not a rung, and also requires exact agreement.

Every value in the ladder has a traced, reachable `leader_fn` branch (see the contract's own docstring for the explicit trace) — there is no unreachable verdict value.

## Settlement

Settlement is pull-based. `resolve_incident` credits a per-address balance (never transfers directly); a separate `claim()` method reads the balance, zeros it, persists the zero, then transfers — in that order. A slash pays 70% to the complainant and 30% to a **protocol pool** that is never credited back to the organizer and can only be withdrawn by the treasury (the deploying address) through `claim_protocol_pool()`.

**Filing bond.** Refunded when the breach is upheld (any overage) or when the incident is unverifiable or expires; forfeited to the organizer only when evidence-backed adjudication finds `no_breach`. Frivolous filings therefore cost money.

Reputation is a permanent signed ledger (`TreeMap<address, i64>`) keyed by lowercase hex address, updated identically at every write and read site. It only ever moves down: `no_breach` is +0, so no wallet — the organizer's or a sock puppet's — can farm positive standing.

## Bounded exits

Every escrowed amount has a path out:
- **Unrevealed evidence bond** — `expire_unrevealed_evidence()` returns it to the organizer once the reveal deadline passes without a reveal.
- **An incident with zero verified evidence** — `expire_incident()` closes it with `unverifiable` and no consequence, once the full evidence + reveal window has elapsed.
- **The organizer's bond** — `close_event()` returns the remaining bond, but only after event start + 7 days (the challenge window) and only with no open incident. Incidents can only be filed inside that same window, so the bond is locked exactly as long as a challenge is possible.
- **The complainant's filing bond** — released exactly once, at `resolve_incident` or `expire_incident`.

No fund path can lock permanently.

## Anti-farming and self-dealing rules

| Attack | Control |
|---|---|
| Organizer files against own event to farm reputation | `open_incident` rejects the organizer; `no_breach` carries +0 reputation |
| Organizer submits flattering evidence | `commit_evidence` rejects the organizer |
| Organizer pulls the bond before anyone can challenge | `close_event` blocked until start + 7 days |
| Same source counted repeatedly (including `?x=1` / `?x=2` variants) | canonical host+path key per incident, checked at reveal |
| Settling an incident around evidence not yet examined | `resolve_incident` / `expire_incident` refuse while any revealed source is unexamined |
| Model inventing a figure no source reported | figure must lie in the verified range; no figures means `unverifiable` without the model |
| Organizer puppet overriding an independent authority | government figures outrank organizer-host figures |
| Host-parsing tricks (backslash, lookalikes, `%2f`) | illegal characters rejected before any host check |
| Arbitrary or spoofed source host | deterministic host authentication at reveal |
| Slash recycled back to the organizer | protocol share goes to a treasury-only pool |
| Spam / reputation-farming filings by others | filing bond forfeited on `no_breach` |

**Residual risk, stated plainly.** A host the organizer locked is, by construction, a source the organizer chose before any dispute. An organizer sock puppet can publish there and submit it from another wallet. Because government figures outrank organizer-host figures, that cannot override or block an independent authority's figure. Where no government source exists the adjudication rests on organizer-published data alone, which is the best this design can do without an independent channel. It cannot raise reputation either way. A duplicate submitter whose commitment points at an already-accepted source cannot reveal it, so that commitment's evidence bond goes to the organizer when it expires.

## What is deliberately out of scope

- Only one incident may be open per event at a time — a second complaint must wait for the first to resolve, keeping evidence review honest at the cost of not supporting simultaneous unrelated complaints.
- `reasoning`/`basis` fields from the LLM are length-checked, not fully content-validated against the evidence — the numeric and categorical fields the verdict actually depends on are fully re-derived and independently compared, which is the load-bearing rigor; the free-text summary is not.
- No automatic expiry sweep — every bounded exit above is an explicit, user-triggered call, matching this project's own accepted precedent (Recourse) for deadline handling.
